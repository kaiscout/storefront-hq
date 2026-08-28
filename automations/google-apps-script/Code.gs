/**
 * Dedicated Gmail/Google Apps Script bridge for the Storefront QA Sprint.
 *
 * This script intentionally NEVER sends mail. It creates reviewable drafts,
 * labels those threads, syncs replies from only those labelled threads, and
 * invokes the Firecrawl discovery endpoint once per day.
 */

var WATCH_LABEL = 'rt10-watch';

function config_() {
  var properties = PropertiesService.getScriptProperties();
  var base = properties.getProperty('API_BASE');
  var secret = properties.getProperty('AUTOMATION_SECRET');
  var businessEmail = properties.getProperty('BUSINESS_EMAIL');
  if (!base || !secret || !businessEmail) {
    throw new Error(
      'Set API_BASE, AUTOMATION_SECRET and BUSINESS_EMAIL in Script Properties.',
    );
  }
  return {
    base: base.replace(/\/$/, ''),
    secret: secret,
    businessEmail: businessEmail.toLowerCase(),
    properties: properties,
  };
}

function api_(path, method, body) {
  var cfg = config_();
  var options = {
    method: method || 'get',
    headers: { Authorization: 'Bearer ' + cfg.secret },
    muteHttpExceptions: true,
  };
  if (body !== undefined) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(body);
  }
  var response = UrlFetchApp.fetch(cfg.base + path, options);
  var status = response.getResponseCode();
  var text = response.getContentText();
  if (status < 200 || status >= 300)
    throw new Error(
      'API ' + path + ' returned ' + status + ': ' + text.slice(0, 500),
    );
  return text ? JSON.parse(text) : {};
}

function parseAddress_(value) {
  var match = String(value || '').match(/<([^>]+)>/);
  return (match ? match[1] : value).trim().toLowerCase();
}

function createProposalDrafts() {
  var result = api_('/api/automation/gmail-drafts', 'get');
  var drafts = result.drafts || [];
  var created = [];
  var label =
    GmailApp.getUserLabelByName(WATCH_LABEL) ||
    GmailApp.createLabel(WATCH_LABEL);
  drafts.forEach(function (item) {
    var draft = GmailApp.createDraft(item.to, item.subject, item.body);
    draft.getMessage().getThread().addLabel(label);
    created.push(item.leadId);
  });
  if (created.length)
    api_('/api/automation/gmail-drafts', 'post', { leadIds: created });
}

function syncInboundReplies() {
  var cfg = config_();
  var lastSync = Number(cfg.properties.getProperty('LAST_SYNC_MS') || 0);
  var overlap = Math.max(0, lastSync - 60000);
  var newest = lastSync;
  var payload = [];
  var threads = GmailApp.search(
    'label:' + WATCH_LABEL + ' in:inbox newer_than:30d',
    0,
    50,
  );
  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (message) {
      var timestamp = message.getDate().getTime();
      var sender = parseAddress_(message.getFrom());
      if (
        timestamp <= overlap ||
        sender === cfg.businessEmail ||
        message.isDraft()
      )
        return;
      payload.push({
        externalId: message.getId(),
        from: sender,
        subject: message.getSubject().slice(0, 300),
        body: message.getPlainBody().slice(0, 20000),
      });
      newest = Math.max(newest, timestamp);
    });
  });
  if (payload.length)
    api_('/api/webhooks/gmail', 'post', { messages: payload.slice(0, 50) });
  cfg.properties.setProperty(
    'LAST_SYNC_MS',
    String(Math.max(newest, Date.now() - 60000)),
  );
}

function discoverBuyerIntent() {
  api_('/api/automation/discover', 'post', {});
}

function installTriggers() {
  var managed = [
    'createProposalDrafts',
    'syncInboundReplies',
    'discoverBuyerIntent',
  ];
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (managed.indexOf(trigger.getHandlerFunction()) !== -1)
      ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('syncInboundReplies')
    .timeBased()
    .everyMinutes(5)
    .create();
  ScriptApp.newTrigger('createProposalDrafts')
    .timeBased()
    .everyMinutes(15)
    .create();
  ScriptApp.newTrigger('discoverBuyerIntent')
    .timeBased()
    .atHour(7)
    .everyDays(1)
    .create();
}
