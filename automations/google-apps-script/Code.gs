/**
 * Dedicated Gmail/Google Apps Script bridge for the Storefront QA Sprint.
 *
 * This script intentionally NEVER sends mail. It creates reviewable drafts,
 * labels those threads, syncs replies from only those labelled threads, and
 * invokes the protected discovery and operations-watch endpoints on schedule.
 */

var WATCH_LABEL = 'rt10-watch';
var PENDING_DRAFTS_PROPERTY = 'PENDING_DRAFT_THREADS';
var REQUIRED_BUSINESS_EMAIL = 'front.storecheckqa@gmail.com';

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
  var text = String(value || '');
  var bracketed = text.match(/<\s*([^<>\s@]+@[^<>\s@]+)\s*>/);
  var bare = text.match(
    /[A-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+/i,
  );
  return String((bracketed && bracketed[1]) || (bare && bare[0]) || '')
    .trim()
    .toLowerCase();
}

function gmailApi_(path, method, body) {
  var verb = String(method || 'get').toLowerCase();
  var pathname = String(path || '').split('?', 1)[0];
  var allowed =
    (verb === 'get' && pathname === '/profile') ||
    (verb === 'get' && pathname === '/labels') ||
    (verb === 'post' && pathname === '/labels') ||
    (verb === 'post' && pathname === '/drafts') ||
    (verb === 'get' && pathname === '/threads') ||
    (verb === 'get' && /^\/threads\/[^/]+$/.test(pathname)) ||
    (verb === 'post' && /^\/threads\/[^/]+\/modify$/.test(pathname)) ||
    (verb === 'get' &&
      /^\/messages\/[^/]+\/attachments\/[^/]+$/.test(pathname));
  if (!allowed)
    throw new Error('Blocked Gmail API operation: ' + verb + ' ' + pathname);
  var options = {
    method: verb,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  };
  if (body !== undefined) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(body);
  }
  var response = UrlFetchApp.fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me' + path,
    options,
  );
  var status = response.getResponseCode();
  var text = response.getContentText();
  if (status < 200 || status >= 300)
    throw new Error(
      'Gmail API ' + path + ' returned ' + status + ': ' + text.slice(0, 500),
    );
  return text ? JSON.parse(text) : {};
}

function requireBusinessGmailProfile_() {
  var cfg = config_();
  if (cfg.businessEmail !== REQUIRED_BUSINESS_EMAIL) {
    throw new Error(
      'BUSINESS_EMAIL must be exactly ' + REQUIRED_BUSINESS_EMAIL + '.',
    );
  }
  var lastError = null;
  for (var attempt = 0; attempt < 2; attempt += 1) {
    try {
      var profile = gmailApi_('/profile', 'get');
      var observed = String(profile.emailAddress || '')
        .trim()
        .toLowerCase();
      if (observed !== REQUIRED_BUSINESS_EMAIL) {
        throw new Error(
          'Gmail profile mismatch: expected ' +
            REQUIRED_BUSINESS_EMAIL +
            ', observed ' +
            (observed || '[missing]'),
        );
      }
      return profile;
    } catch (error) {
      lastError = error;
      if (attempt === 0) Utilities.sleep(1000);
    }
  }
  throw new Error('Gmail profile check failed closed: ' + lastError);
}

function base64UrlEncode_(value) {
  return Utilities.base64EncodeWebSafe(value, Utilities.Charset.UTF_8).replace(
    /=+$/,
    '',
  );
}

function base64UrlDecode_(value) {
  if (!value) return [];
  var normalized = String(value);
  while (normalized.length % 4) normalized += '=';
  return Utilities.base64DecodeWebSafe(normalized);
}

function safeHeader_(value) {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

function getHeader_(message, name) {
  var headers = (message.payload && message.payload.headers) || [];
  var wanted = name.toLowerCase();
  for (var index = 0; index < headers.length; index += 1) {
    if (String(headers[index].name || '').toLowerCase() === wanted)
      return String(headers[index].value || '');
  }
  return '';
}

function partCharset_(part) {
  var headers = (part && part.headers) || [];
  for (var index = 0; index < headers.length; index += 1) {
    if (String(headers[index].name || '').toLowerCase() !== 'content-type')
      continue;
    var match = String(headers[index].value || '').match(
      /charset\s*=\s*["']?([^;"'\s]+)/i,
    );
    if (match) return match[1];
  }
  return 'UTF-8';
}

function partText_(messageId, part) {
  var data = part && part.body && part.body.data;
  if (!data && part && part.body && part.body.attachmentId) {
    data = gmailApi_(
      '/messages/' +
        encodeURIComponent(messageId) +
        '/attachments/' +
        encodeURIComponent(part.body.attachmentId),
      'get',
    ).data;
  }
  if (!data) return '';
  return Utilities.newBlob(base64UrlDecode_(data)).getDataAsString(
    partCharset_(part),
  );
}

function findPartBody_(messageId, part, mimeType) {
  if (!part) return '';
  if (part.mimeType === mimeType && !part.filename)
    return partText_(messageId, part);
  var parts = part.parts || [];
  for (var index = 0; index < parts.length; index += 1) {
    var value = findPartBody_(messageId, parts[index], mimeType);
    if (value) return value;
  }
  return '';
}

function htmlToText_(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function plainBody_(message) {
  var plain = findPartBody_(message.id, message.payload, 'text/plain');
  if (plain) return plain;
  var html = findPartBody_(message.id, message.payload, 'text/html');
  if (html) return htmlToText_(html);
  var root = partText_(message.id, message.payload);
  if (root)
    return message.payload.mimeType === 'text/html' ? htmlToText_(root) : root;
  return String(message.snippet || '');
}

function ensureWatchLabelId_() {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var labels = gmailApi_('/labels', 'get').labels || [];
    for (var index = 0; index < labels.length; index += 1) {
      if (labels[index].name === WATCH_LABEL) return labels[index].id;
    }
    return gmailApi_('/labels', 'post', {
      name: WATCH_LABEL,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
    }).id;
  } finally {
    lock.releaseLock();
  }
}

function encodeSubject_(value) {
  var safe = safeHeader_(value);
  if (!/[^\x20-\x7E]/.test(safe)) return safe;
  return (
    '=?UTF-8?B?' + Utilities.base64Encode(safe, Utilities.Charset.UTF_8) + '?='
  );
}

function createGmailDraft_(item) {
  var recipient = parseAddress_(item.to);
  if (!recipient)
    throw new Error('Draft recipient is not a valid email address.');
  var raw = [
    'To: ' + recipient,
    'Subject: ' + encodeSubject_(item.subject),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    String(item.body || ''),
  ].join('\r\n');
  var draft = gmailApi_('/drafts', 'post', {
    message: { raw: base64UrlEncode_(raw) },
  });
  var threadId = draft.message && draft.message.threadId;
  if (!threadId) throw new Error('Gmail did not return a draft thread ID.');
  return {
    draftId: draft.id,
    threadId: threadId,
    createdAt: Date.now(),
  };
}

function loadPendingDrafts_() {
  var raw = PropertiesService.getScriptProperties().getProperty(
    PENDING_DRAFTS_PROPERTY,
  );
  if (!raw) return [];
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    throw new Error('Pending draft state is not valid JSON.');
  }
}

function savePendingDrafts_(pending) {
  var properties = PropertiesService.getScriptProperties();
  if (pending.length)
    properties.setProperty(PENDING_DRAFTS_PROPERTY, JSON.stringify(pending));
  else properties.deleteProperty(PENDING_DRAFTS_PROPERTY);
}

function reconcileSentDrafts_() {
  var pending = loadPendingDrafts_();
  if (!pending.length) return;
  var labelId = ensureWatchLabelId_();
  var remaining = [];
  pending.forEach(function (item) {
    try {
      var thread = gmailApi_(
        '/threads/' + encodeURIComponent(item.threadId) + '?format=full',
        'get',
      );
      var sentMessage = null;
      (thread.messages || []).forEach(function (message) {
        if (
          (message.labelIds || []).indexOf('SENT') !== -1 &&
          (!sentMessage ||
            Number(message.internalDate || 0) >
              Number(sentMessage.internalDate || 0))
        )
          sentMessage = message;
      });
      if (!sentMessage) {
        remaining.push(item);
        return;
      }
      var sentTimestamp = Number(sentMessage.internalDate || 0);
      if (!sentTimestamp)
        throw new Error('Sent Gmail message did not include a timestamp.');
      api_('/api/automation/outbound-contact', 'post', {
        leadId: item.leadId,
        threadId: item.threadId,
        sentMessageId: sentMessage.id,
        sentAt: new Date(sentTimestamp).toISOString(),
        subject: getHeader_(sentMessage, 'Subject').slice(0, 300),
      });
      gmailApi_(
        '/threads/' + encodeURIComponent(item.threadId) + '/modify',
        'post',
        { addLabelIds: [labelId] },
      );
    } catch (error) {
      console.warn(
        'Could not reconcile draft thread ' + item.threadId + ': ' + error,
      );
      remaining.push(item);
    }
  });
  savePendingDrafts_(remaining);
}

function createProposalDrafts() {
  requireBusinessGmailProfile_();
  reconcileSentDrafts_();
  var result = api_('/api/automation/gmail-drafts', 'get');
  var drafts = result.drafts || [];
  var created = [];
  var pending = loadPendingDrafts_();
  var pendingByLead = {};
  pending.forEach(function (item) {
    pendingByLead[item.leadId] = true;
  });
  drafts.forEach(function (item) {
    if (!pendingByLead[item.leadId]) {
      var state = createGmailDraft_(item);
      state.leadId = item.leadId;
      pending.push(state);
      pendingByLead[item.leadId] = true;
      savePendingDrafts_(pending);
    }
    created.push(item.leadId);
  });
  if (created.length)
    api_('/api/automation/gmail-drafts', 'post', { leadIds: created });
}

function syncInboundReplies() {
  requireBusinessGmailProfile_();
  reconcileSentDrafts_();
  var cfg = config_();
  var lastSync = Number(cfg.properties.getProperty('LAST_SYNC_MS') || 0);
  var overlap = Math.max(0, lastSync - 60000);
  var candidates = [];
  var labelId = ensureWatchLabelId_();
  var query = 'newer_than:30d';
  var pageToken = '';
  do {
    var listPath =
      '/threads?maxResults=50&labelIds=INBOX&labelIds=' +
      encodeURIComponent(labelId) +
      '&q=' +
      encodeURIComponent(query) +
      (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    var page = gmailApi_(listPath, 'get');
    (page.threads || []).forEach(function (threadSummary) {
      var thread = gmailApi_(
        '/threads/' + encodeURIComponent(threadSummary.id) + '?format=full',
        'get',
      );
      (thread.messages || []).forEach(function (message) {
        var timestamp = Number(message.internalDate || 0);
        var sender = parseAddress_(getHeader_(message, 'From'));
        var labels = message.labelIds || [];
        if (
          timestamp <= overlap ||
          !sender ||
          sender === cfg.businessEmail ||
          labels.indexOf('INBOX') === -1 ||
          labels.indexOf('DRAFT') !== -1 ||
          labels.indexOf('SENT') !== -1
        )
          return;
        candidates.push({
          timestamp: timestamp,
          payload: {
            externalId: message.id,
            from: sender,
            subject: getHeader_(message, 'Subject').slice(0, 300),
            body: plainBody_(message).slice(0, 20000),
          },
        });
      });
    });
    pageToken = page.nextPageToken || '';
  } while (pageToken);
  candidates.sort(function (left, right) {
    return left.timestamp - right.timestamp;
  });
  var processed = candidates;
  for (var offset = 0; offset < processed.length; offset += 50) {
    var batch = processed.slice(offset, offset + 50);
    api_('/api/webhooks/gmail', 'post', {
      messages: batch.map(function (item) {
        return item.payload;
      }),
    });
  }
  var checkpoint = processed.length
    ? processed[processed.length - 1].timestamp
    : Math.max(lastSync, Date.now() - 60000);
  cfg.properties.setProperty('LAST_SYNC_MS', String(checkpoint));
}

function discoverBuyerIntent() {
  api_('/api/automation/discover', 'post', {});
}

function runRegressionWatch() {
  api_('/api/automation/regression-watch', 'post', {});
}

function runSlaWatch() {
  api_('/api/automation/sla-watch', 'post', {});
}

function runSourceWatch() {
  api_('/api/automation/source-watch', 'post', {});
}

function runPrivacyCleanup() {
  api_('/api/automation/privacy-cleanup', 'post', {});
}

function installTriggers() {
  var installed = {};
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    installed[trigger.getHandlerFunction()] = true;
  });
  if (!installed.syncInboundReplies)
    ScriptApp.newTrigger('syncInboundReplies')
      .timeBased()
      .everyMinutes(5)
      .create();
  if (!installed.createProposalDrafts)
    ScriptApp.newTrigger('createProposalDrafts')
      .timeBased()
      .everyMinutes(15)
      .create();
  if (!installed.discoverBuyerIntent)
    ScriptApp.newTrigger('discoverBuyerIntent')
      .timeBased()
      .atHour(7)
      .everyDays(1)
      .create();
  if (!installed.runRegressionWatch)
    ScriptApp.newTrigger('runRegressionWatch')
      .timeBased()
      .atHour(8)
      .everyDays(1)
      .create();
  if (!installed.runSlaWatch)
    ScriptApp.newTrigger('runSlaWatch').timeBased().everyHours(1).create();
  if (!installed.runSourceWatch)
    ScriptApp.newTrigger('runSourceWatch').timeBased().everyHours(1).create();
  if (!installed.runPrivacyCleanup)
    ScriptApp.newTrigger('runPrivacyCleanup')
      .timeBased()
      .atHour(3)
      .everyDays(1)
      .create();
}
