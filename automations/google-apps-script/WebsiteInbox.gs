/** Isolated website inbox module. No customer replies, new scopes or public web app. */
var WEBSITE_INBOX_EMAIL = 'front.storecheckqa@gmail.com';

function websiteInboxGoogle_(action, body) {
  var routes = {profile:'/profile', draft:'/drafts', send:'/drafts/send'};
  if (!Object.prototype.hasOwnProperty.call(routes, action)) throw new Error('Blocked inbox Google action.');
  var options = {method:action === 'profile' ? 'get' : 'post', headers:{Authorization:'Bearer ' + ScriptApp.getOAuthToken()}, muteHttpExceptions:true};
  if (body !== undefined) {options.contentType='application/json'; options.payload=JSON.stringify(body);}
  var response=UrlFetchApp.fetch('https://gmail.googleapis.com/gmail/v1/users/me' + routes[action],options);
  if(response.getResponseCode()<200 || response.getResponseCode()>=300) throw new Error('Gmail inbox action ' + action + ' returned ' + response.getResponseCode());
  return JSON.parse(response.getContentText());
}

function websiteInboxRequireProfile_() {
  var configured=PropertiesService.getScriptProperties().getProperty('BUSINESS_EMAIL');
  if(configured !== WEBSITE_INBOX_EMAIL) throw new Error('Website inbox BUSINESS_EMAIL mismatch.');
  var lastError;
  for(var attempt=0;attempt<2;attempt++) {
    try {
      var profile=websiteInboxGoogle_('profile');
      if(profile.emailAddress !== WEBSITE_INBOX_EMAIL) throw new Error('Website inbox profile mismatch: ' + String(profile.emailAddress || '[missing]'));
      return;
    } catch(error) {lastError=error; if(attempt===0) Utilities.sleep(1000);}
  }
  throw new Error('Website inbox profile failed closed: ' + lastError);
}

function websiteInboxApi_(body) {
  var secret=PropertiesService.getScriptProperties().getProperty('AUTOMATION_SECRET');
  if(!secret) throw new Error('Website inbox automation secret is missing.');
  var response=UrlFetchApp.fetch('https://storefronthq.co.uk/api/automation/website-notifications', {method:'post',headers:{Authorization:'Bearer '+secret},contentType:'application/json',payload:JSON.stringify(body),muteHttpExceptions:true});
  if(response.getResponseCode()<200 || response.getResponseCode()>=300) throw new Error('Website inbox API returned ' + response.getResponseCode());
  return JSON.parse(response.getContentText());
}

function websiteInboxDeliver_() {
  websiteInboxRequireProfile_();
  var result=websiteInboxApi_({action:'claim'});
  if(result.recipient !== WEBSITE_INBOX_EMAIL) throw new Error('Website notification destination failed closed.');
  (result.notifications || []).forEach(function(notification) {
    if(!/^[a-f0-9-]{36}$/i.test(String(notification.id || '')) || !/^[a-f0-9-]{36}$/i.test(String(notification.claimToken || '')) || typeof notification.subject !== 'string' || notification.subject.length>200 || typeof notification.body !== 'string' || notification.body.length>10000) throw new Error('Invalid website notification.');
    var sentMessageId=null;
    try {
      // The public form cannot choose From, To, CC, BCC or Reply-To.
      var subject=notification.subject.replace(/[\r\n]+/g,' ').trim();
      var raw=['From: '+WEBSITE_INBOX_EMAIL,'To: '+WEBSITE_INBOX_EMAIL,'Subject: =?UTF-8?B?'+Utilities.base64Encode(subject,Utilities.Charset.UTF_8)+'?=','MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',Utilities.base64Encode(notification.body,Utilities.Charset.UTF_8)].join('\r\n');
      var encoded=Utilities.base64EncodeWebSafe(raw,Utilities.Charset.UTF_8).replace(/=+$/,'');
      var draft=websiteInboxGoogle_('draft',{message:{raw:encoded}});
      if(!draft.id) throw new Error('Gmail did not confirm the internal draft.');
      var sent=websiteInboxGoogle_('send',{id:draft.id});
      if(!sent.id) throw new Error('Gmail did not confirm the notification.');
      sentMessageId=sent.id;
    } catch(error) {console.error('Website notification '+notification.id+' has uncertain delivery: '+error);}
    // Never automatically retry an uncertain send. Check Sent and reconcile first.
    websiteInboxApi_({action:'acknowledge',id:notification.id,claimToken:notification.claimToken,messageId:sentMessageId});
  });
}

function sendWebsiteNotifications() {
  var lock=LockService.getUserLock();
  if(!lock.tryLock(1000)) return;
  try {websiteInboxDeliver_();} finally {lock.releaseLock();}
}

function installWebsiteInboxTrigger() {
  websiteInboxRequireProfile_();
  var exists=ScriptApp.getProjectTriggers().some(function(trigger){return trigger.getHandlerFunction()==='sendWebsiteNotifications';});
  if(!exists) ScriptApp.newTrigger('sendWebsiteNotifications').timeBased().everyMinutes(5).create();
  console.log('Website inbox trigger ready; recipient is '+WEBSITE_INBOX_EMAIL+'. Existing triggers unchanged.');
}
