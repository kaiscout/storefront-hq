/**
 * Dedicated Gmail/Google Apps Script bridge for the Storefront QA Sprint.
 *
 * This script creates reviewable drafts for approved public-request outreach.
 * It may auto-send only a current, consultant-grade reply to a genuine inbound
 * Gmail message that the protected API marks eligible. It never auto-sends a
 * cold or first-touch proposal.
 */

var WATCH_LABEL = 'rt10-watch';
var PENDING_DRAFTS_PROPERTY = 'PENDING_DRAFT_THREADS';
var PENDING_DRAFTS_META_PROPERTY = 'PENDING_DRAFT_THREADS_META';
var PENDING_DRAFTS_CHUNK_SIZE = 7000;
var PENDING_DRAFTS_MAX_ITEMS = 250;
var REQUIRED_BUSINESS_EMAIL = 'front.storecheckqa@gmail.com';
var WEBSITE_CONFIRMATION_SUBJECT =
  /^Storefront QA confirmation \[[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\]$/i;

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
    (verb === 'put' && /^\/drafts\/[^/]+$/.test(pathname)) ||
    (verb === 'delete' && /^\/drafts\/[^/]+$/.test(pathname)) ||
    (verb === 'post' && pathname === '/drafts/send') ||
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

function draftMessage_(item) {
  var recipient = parseAddress_(item.to);
  if (!recipient)
    throw new Error('Draft recipient is not a valid email address.');
  var headers = [
    'To: ' + recipient,
    'Subject: ' + encodeSubject_(item.subject),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
  ];
  var message = {};
  if (item.sourceThreadId || item.sourceMessageId) {
    if (!item.sourceThreadId || !item.sourceMessageId)
      throw new Error(
        'Inbound reply identity is incomplete; refusing to draft.',
      );
    var sourceThread = gmailApi_(
      '/threads/' + encodeURIComponent(item.sourceThreadId) + '?format=full',
      'get',
    );
    var sourceMessage = null;
    (sourceThread.messages || []).forEach(function (candidate) {
      if (candidate.id === item.sourceMessageId) sourceMessage = candidate;
    });
    if (!sourceMessage)
      throw new Error('The current inbound Gmail message was not found.');
    var messageId = safeHeader_(getHeader_(sourceMessage, 'Message-ID'));
    if (!messageId)
      throw new Error('The current inbound Gmail message has no Message-ID.');
    headers.push('In-Reply-To: ' + messageId);
    headers.push('References: ' + messageId);
    message.threadId = item.sourceThreadId;
  }
  headers.push('');
  headers.push(String(item.body || ''));
  message.raw = base64UrlEncode_(headers.join('\r\n'));
  return message;
}

function createGmailDraft_(item) {
  var draft = gmailApi_('/drafts', 'post', {
    message: draftMessage_(item),
  });
  var threadId = draft.message && draft.message.threadId;
  if (!threadId) throw new Error('Gmail did not return a draft thread ID.');
  return {
    draftId: draft.id,
    threadId: threadId,
    createdAt: Date.now(),
  };
}

function updateGmailDraft_(state, item) {
  if (!state.draftId) throw new Error('Pending Gmail draft has no draft ID.');
  var draft = gmailApi_('/drafts/' + encodeURIComponent(state.draftId), 'put', {
    id: state.draftId,
    message: draftMessage_(item),
  });
  var threadId = draft.message && draft.message.threadId;
  if (!threadId)
    throw new Error('Gmail did not return an updated draft thread ID.');
  return {
    draftId: draft.id,
    threadId: threadId,
    createdAt: Date.now(),
  };
}

function labelGmailDraftThread_(state) {
  if (!state || !state.threadId)
    throw new Error('Pending Gmail draft thread is missing.');
  gmailApi_(
    '/threads/' + encodeURIComponent(state.threadId) + '/modify',
    'post',
    {
      addLabelIds: [ensureWatchLabelId_()],
    },
  );
}

function linkGmailDraft_(state, item) {
  if (!state || !state.draftId || !state.threadId)
    throw new Error('Pending Gmail draft identity is incomplete.');
  api_('/api/automation/gmail-thread-link', 'post', {
    leadId: item.leadId,
    threadId: state.threadId,
    draftId: state.draftId,
  });
}

function removeInvalidPendingDrafts_(pending, invalidatedLeadIds) {
  var invalidated = {};
  (invalidatedLeadIds || []).forEach(function (leadId) {
    invalidated[leadId] = true;
  });
  var remaining = [];
  (pending || []).forEach(function (item) {
    if (!invalidated[item.leadId]) {
      remaining.push(item);
      return;
    }
    try {
      if (item.draftId)
        gmailApi_('/drafts/' + encodeURIComponent(item.draftId), 'delete');
    } catch (error) {
      if (String(error).indexOf('returned 404:') === -1) {
        console.error(
          'Could not remove invalid Gmail draft for lead ' +
            item.leadId +
            ': ' +
            error,
        );
        remaining.push(item);
      }
    }
  });
  savePendingDrafts_(remaining);
  return remaining;
}

function sendEligibleInboundDraft_(state, item) {
  if (!item.autoSend || !item.sourceMessageId || !item.sourceThreadId)
    throw new Error('Only a current, verified inbound reply may be auto-sent.');
  if (!state.draftId)
    throw new Error('Eligible inbound reply has no Gmail draft ID.');
  return gmailApi_('/drafts/send', 'post', { id: state.draftId });
}

function isCurrentInboundSource_(item) {
  var thread = gmailApi_(
    '/threads/' + encodeURIComponent(item.sourceThreadId) + '?format=full',
    'get',
  );
  var latest = null;
  var source = null;
  var latestSentAt = 0;
  (thread.messages || []).forEach(function (message) {
    var labels = message.labelIds || [];
    var sender = parseAddress_(getHeader_(message, 'From'));
    if (message.id === item.sourceMessageId) source = message;
    if (
      sender === REQUIRED_BUSINESS_EMAIL &&
      labels.indexOf('SENT') !== -1 &&
      labels.indexOf('DRAFT') === -1
    )
      latestSentAt = Math.max(latestSentAt, Number(message.internalDate || 0));
    if (
      !sender ||
      sender === REQUIRED_BUSINESS_EMAIL ||
      labels.indexOf('INBOX') === -1 ||
      labels.indexOf('DRAFT') !== -1 ||
      labels.indexOf('SENT') !== -1
    )
      return;
    if (
      !latest ||
      Number(message.internalDate || 0) > Number(latest.internalDate || 0)
    )
      latest = message;
  });
  var expectedSender = parseAddress_(item.to);
  var sourceTime = Number((source && source.internalDate) || 0);
  if (
    !source ||
    !sourceTime ||
    latestSentAt >= sourceTime ||
    !latest ||
    latest.id !== item.sourceMessageId ||
    parseAddress_(getHeader_(latest, 'From')) !== expectedSender
  )
    return false;
  return true;
}

function loadPendingDrafts_() {
  var properties = PropertiesService.getScriptProperties();
  var raw = '';
  var metadataRaw = properties.getProperty(PENDING_DRAFTS_META_PROPERTY);
  if (metadataRaw) {
    var metadata;
    try {
      metadata = JSON.parse(metadataRaw);
    } catch (error) {
      throw new Error('Pending draft metadata is not valid JSON.');
    }
    if (
      !metadata ||
      !/^[a-z0-9_-]+$/i.test(String(metadata.generation || '')) ||
      !Number.isInteger(metadata.chunks) ||
      metadata.chunks < 1 ||
      metadata.chunks > 100
    )
      throw new Error('Pending draft metadata is invalid.');
    for (var index = 0; index < metadata.chunks; index += 1) {
      var chunk = properties.getProperty(
        PENDING_DRAFTS_PROPERTY + '_CHUNK_' + metadata.generation + '_' + index,
      );
      if (chunk === null)
        throw new Error('Pending draft state is missing a chunk.');
      raw += chunk;
    }
  } else raw = properties.getProperty(PENDING_DRAFTS_PROPERTY) || '';
  if (!raw) return [];
  try {
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > PENDING_DRAFTS_MAX_ITEMS)
      throw new Error('Pending draft state exceeds its safe bound.');
    return parsed;
  } catch (error) {
    throw new Error('Pending draft state is not valid JSON.');
  }
}

function savePendingDrafts_(pending) {
  var properties = PropertiesService.getScriptProperties();
  if (pending.length > PENDING_DRAFTS_MAX_ITEMS)
    throw new Error('Pending draft state reached its safe 250-item limit.');
  var allProperties = properties.getProperties();
  var chunkPrefix = PENDING_DRAFTS_PROPERTY + '_CHUNK_';
  if (!pending.length) {
    Object.keys(allProperties).forEach(function (key) {
      if (key.indexOf(chunkPrefix) === 0) properties.deleteProperty(key);
    });
    properties.deleteProperty(PENDING_DRAFTS_META_PROPERTY);
    properties.deleteProperty(PENDING_DRAFTS_PROPERTY);
    return;
  }
  var raw = JSON.stringify(pending);
  var generation =
    String(Date.now()) + '_' + Utilities.getUuid().replace(/-/g, '');
  var chunks = {};
  var chunkCount = 0;
  for (
    var offset = 0;
    offset < raw.length;
    offset += PENDING_DRAFTS_CHUNK_SIZE
  ) {
    chunks[chunkPrefix + generation + '_' + chunkCount] = raw.slice(
      offset,
      offset + PENDING_DRAFTS_CHUNK_SIZE,
    );
    chunkCount += 1;
  }
  properties.setProperties(chunks, false);
  properties.setProperty(
    PENDING_DRAFTS_META_PROPERTY,
    JSON.stringify({ generation: generation, chunks: chunkCount }),
  );
  Object.keys(allProperties).forEach(function (key) {
    if (
      key.indexOf(chunkPrefix) === 0 &&
      key.indexOf(chunkPrefix + generation + '_') !== 0
    )
      properties.deleteProperty(key);
  });
  properties.deleteProperty(PENDING_DRAFTS_PROPERTY);
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
          Number(message.internalDate || 0) >= Number(item.createdAt || 0) &&
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
      var outboundPayload = {
        leadId: item.leadId,
        threadId: item.threadId,
        sentMessageId: sentMessage.id,
        sentAt: new Date(sentTimestamp).toISOString(),
        subject: getHeader_(sentMessage, 'Subject').slice(0, 300),
      };
      if (item.sourceMessageId && item.claimToken) {
        outboundPayload.sourceMessageId = item.sourceMessageId;
        outboundPayload.claimToken = item.claimToken;
      }
      api_('/api/automation/outbound-contact', 'post', outboundPayload);
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
  var executionLock = LockService.getUserLock();
  if (!executionLock.tryLock(1000)) {
    console.warn(
      'Another Gmail draft run is already active; skipping overlap.',
    );
    return;
  }
  try {
    createProposalDraftsLocked_();
  } finally {
    executionLock.releaseLock();
  }
}

function createProposalDraftsLocked_() {
  requireBusinessGmailProfile_();
  syncInboundRepliesLocked_();
  reconcileSentDrafts_();
  var result = api_('/api/automation/gmail-drafts', 'get');
  var drafts = result.drafts || [];
  var created = [];
  var eligibleToSend = [];
  var pending = loadPendingDrafts_();
  if (pending.length) {
    var eligibility = api_('/api/automation/gmail-drafts', 'post', {
      leadIds: [],
      pendingLeadIds: pending.map(function (item) {
        return item.leadId;
      }),
    });
    pending = removeInvalidPendingDrafts_(
      pending,
      eligibility.invalidatedLeadIds || [],
    );
  }
  var pendingIndexByLead = {};
  pending.forEach(function (item, index) {
    pendingIndexByLead[item.leadId] = index;
  });
  drafts.forEach(function (item) {
    try {
      var pendingIndex = pendingIndexByLead[item.leadId];
      var state = pendingIndex === undefined ? null : pending[pendingIndex];
      if (!state) {
        if (pending.length >= PENDING_DRAFTS_MAX_ITEMS)
          throw new Error(
            'Pending Gmail draft capacity reached; no Gmail draft was created.',
          );
        state = createGmailDraft_(item);
        state.leadId = item.leadId;
        state.sourceMessageId = item.sourceMessageId || null;
        state.sourceThreadId = item.sourceThreadId || null;
        pending.push(state);
        pendingIndexByLead[item.leadId] = pending.length - 1;
        savePendingDrafts_(pending);
      } else if (
        item.sourceMessageId &&
        (state.sourceMessageId !== item.sourceMessageId ||
          state.sourceThreadId !== item.sourceThreadId)
      ) {
        var refreshed = updateGmailDraft_(state, item);
        refreshed.leadId = item.leadId;
        refreshed.sourceMessageId = item.sourceMessageId;
        refreshed.sourceThreadId = item.sourceThreadId;
        pending[pendingIndex] = refreshed;
        state = refreshed;
        savePendingDrafts_(pending);
      }
      labelGmailDraftThread_(state);
      linkGmailDraft_(state, item);
      if (item.autoSend) eligibleToSend.push({ state: state, item: item });
      created.push(item.leadId);
    } catch (error) {
      console.error(
        'Could not prepare Gmail draft for lead ' + item.leadId + ': ' + error,
      );
    }
  });
  if (created.length)
    api_('/api/automation/gmail-drafts', 'post', { leadIds: created });
  if (!eligibleToSend.length) return;

  var claimResponse = api_('/api/automation/gmail-reply-claims', 'post', {
    action: 'claim',
    items: eligibleToSend.map(function (entry) {
      return {
        leadId: entry.item.leadId,
        sourceMessageId: entry.item.sourceMessageId,
      };
    }),
  });
  var claimsBySource = {};
  (claimResponse.results || []).forEach(function (claim) {
    claimsBySource[claim.leadId + ':' + claim.sourceMessageId] = claim;
  });
  var sent = 0;
  eligibleToSend.forEach(function (entry) {
    var key = entry.item.leadId + ':' + entry.item.sourceMessageId;
    var claim = claimsBySource[key];
    if (!claim || !claim.claimed || !claim.claimToken) return;
    var releaseBody = {
      action: 'release',
      items: [
        {
          leadId: entry.item.leadId,
          sourceMessageId: entry.item.sourceMessageId,
          claimToken: claim.claimToken,
        },
      ],
    };
    if (claim.sourceThreadId !== entry.item.sourceThreadId) {
      api_('/api/automation/gmail-reply-claims', 'post', releaseBody);
      return;
    }
    entry.state.claimToken = claim.claimToken;
    entry.state.sourceMessageId = entry.item.sourceMessageId;
    entry.state.sourceThreadId = entry.item.sourceThreadId;
    savePendingDrafts_(pending);
    if (!isCurrentInboundSource_(entry.item)) {
      api_('/api/automation/gmail-reply-claims', 'post', releaseBody);
      entry.state.claimToken = null;
      savePendingDrafts_(pending);
      return;
    }
    try {
      var currentDraft = updateGmailDraft_(entry.state, entry.item);
      currentDraft.leadId = entry.item.leadId;
      currentDraft.sourceMessageId = entry.item.sourceMessageId;
      currentDraft.sourceThreadId = entry.item.sourceThreadId;
      currentDraft.claimToken = claim.claimToken;
      var pendingIndex = pendingIndexByLead[entry.item.leadId];
      pending[pendingIndex] = currentDraft;
      entry.state = currentDraft;
      savePendingDrafts_(pending);
      labelGmailDraftThread_(currentDraft);
      linkGmailDraft_(currentDraft, entry.item);
      if (!isCurrentInboundSource_(entry.item))
        throw new Error('A newer Gmail reply replaced the claimed source.');
      var validation = api_('/api/automation/gmail-reply-claims', 'post', {
        action: 'validate',
        items: [
          {
            leadId: entry.item.leadId,
            sourceMessageId: entry.item.sourceMessageId,
            claimToken: claim.claimToken,
          },
        ],
      });
      var validationResult = (validation.results || [])[0];
      if (
        !validationResult ||
        !validationResult.valid ||
        validationResult.sourceThreadId !== entry.item.sourceThreadId
      )
        throw new Error('The Gmail reply claim is no longer valid.');
      sendEligibleInboundDraft_(currentDraft, entry.item);
      sent += 1;
    } catch (error) {
      api_('/api/automation/gmail-reply-claims', 'post', releaseBody);
      entry.state.claimToken = null;
      savePendingDrafts_(pending);
      console.error(
        'Could not send verified inbound reply for lead ' +
          entry.item.leadId +
          ': ' +
          error,
      );
    }
  });
  if (sent) reconcileSentDrafts_();
}

function syncWebsiteConfirmations_(labelId, overlap) {
  var candidates = [];
  var pageToken = '';
  var query =
    'newer_than:30d to:' +
    REQUIRED_BUSINESS_EMAIL +
    ' subject:"Storefront QA confirmation"';
  do {
    var listPath =
      '/threads?maxResults=50&labelIds=INBOX&q=' +
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
        var subject = getHeader_(message, 'Subject').trim();
        var labels = message.labelIds || [];
        if (
          timestamp <= overlap ||
          !sender ||
          sender === REQUIRED_BUSINESS_EMAIL ||
          labels.indexOf('INBOX') === -1 ||
          labels.indexOf('DRAFT') !== -1 ||
          labels.indexOf('SENT') !== -1 ||
          !WEBSITE_CONFIRMATION_SUBJECT.test(subject)
        )
          return;
        candidates.push({
          timestamp: timestamp,
          threadId: threadSummary.id,
          payload: {
            externalId: message.id,
            threadId: threadSummary.id,
            from: sender,
            subject: subject,
            body: plainBody_(message).slice(0, 20000),
            receivedAt: new Date(timestamp).toISOString(),
          },
        });
      });
    });
    pageToken = page.nextPageToken || '';
  } while (pageToken);
  candidates.sort(function (left, right) {
    return left.timestamp - right.timestamp;
  });
  for (var offset = 0; offset < candidates.length; offset += 50) {
    var batch = candidates.slice(offset, offset + 50);
    var response = api_('/api/automation/gmail-confirmation', 'post', {
      messages: batch.map(function (item) {
        return item.payload;
      }),
    });
    var results = response.results || [];
    batch.forEach(function (item, index) {
      if (results[index] && results[index].accepted)
        gmailApi_(
          '/threads/' + encodeURIComponent(item.threadId) + '/modify',
          'post',
          { addLabelIds: [labelId] },
        );
    });
  }
  return candidates.length
    ? candidates[candidates.length - 1].timestamp
    : overlap;
}

function syncInboundReplies() {
  var executionLock = LockService.getUserLock();
  if (!executionLock.tryLock(1000)) {
    console.warn('Another Gmail run is active; skipping reply sync overlap.');
    return;
  }
  try {
    syncInboundRepliesLocked_();
  } finally {
    executionLock.releaseLock();
  }
}

function syncInboundRepliesLocked_() {
  requireBusinessGmailProfile_();
  var cfg = config_();
  var lastSync = Number(cfg.properties.getProperty('LAST_SYNC_MS') || 0);
  var overlap = Math.max(0, lastSync - 60000);
  var candidates = [];
  var labelId = ensureWatchLabelId_();
  var confirmationCheckpoint = syncWebsiteConfirmations_(labelId, overlap);
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
        var subject = getHeader_(message, 'Subject').trim();
        var labels = message.labelIds || [];
        if (
          timestamp <= overlap ||
          !sender ||
          sender === cfg.businessEmail ||
          labels.indexOf('INBOX') === -1 ||
          labels.indexOf('DRAFT') !== -1 ||
          labels.indexOf('SENT') !== -1 ||
          WEBSITE_CONFIRMATION_SUBJECT.test(subject)
        )
          return;
        candidates.push({
          timestamp: timestamp,
          payload: {
            externalId: message.id,
            threadId: threadSummary.id,
            from: sender,
            subject: subject.slice(0, 300),
            body: plainBody_(message).slice(0, 20000),
            receivedAt: new Date(timestamp).toISOString(),
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
    ? Math.max(
        processed[processed.length - 1].timestamp,
        confirmationCheckpoint,
      )
    : Math.max(lastSync, confirmationCheckpoint, Date.now() - 60000);
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
