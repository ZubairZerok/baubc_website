/**
 * BAUBC · Club Gmail → platform label sync (Apps Script owned by the club mailbox)
 *
 * Only threads you label BAUBC/Sync/<category> are sent (e.g. BAUBC/Sync/sponsorship, BAUBC/Sync/partnership,
 * BAUBC/Sync/speaker, BAUBC/Sync/university, BAUBC/Sync/payment). Create Gmail filters to apply these labels.
 * Sent: message id, thread id, sender, subject, date, labels and a 300-character snippet. Bodies and
 * attachments are never sent. After a successful sync the thread gets the label BAUBC/Synced.
 *
 * Setup:
 *  1. script.google.com (signed in as the club mailbox) → New project → paste this file.
 *  2. Script properties: BAUBC_ENDPOINT = https://YOUR-SITE/api/hooks/gmail, BAUBC_SECRET = GMAIL_WEBHOOK_SECRET.
 *  3. Triggers → syncLabelled → Time-driven → every 10 minutes.
 */
function syncLabelled() {
  var synced = GmailApp.getUserLabelByName('BAUBC/Synced') || GmailApp.createLabel('BAUBC/Synced');
  var threads = GmailApp.search('label:BAUBC-Sync -label:BAUBC-Synced newer_than:30d', 0, 50);
  if (!threads.length) return;
  var messages = [];
  threads.forEach(function (t) {
    var labels = t.getLabels().map(function (l) { return l.getName(); });
    t.getMessages().forEach(function (m) {
      var from = m.getFrom();
      var match = from.match(/^(.*)<(.+)>$/);
      messages.push({
        message_id: m.getId(), thread_id: t.getId(),
        from_name: match ? match[1].trim().replace(/"/g, '') : '', from_email: match ? match[2].trim() : from,
        subject: m.getSubject(), date: m.getDate().toISOString(), labels: labels,
        snippet: m.getPlainBody().replace(/\s+/g, ' ').slice(0, 300)
      });
    });
  });
  var props = PropertiesService.getScriptProperties();
  var body = JSON.stringify({ messages: messages });
  var ts = Math.floor(Date.now() / 1000).toString();
  var sig = Utilities.computeHmacSha256Signature(ts + '.' + body, props.getProperty('BAUBC_SECRET'))
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
  var res = UrlFetchApp.fetch(props.getProperty('BAUBC_ENDPOINT'), {
    method: 'post', contentType: 'application/json', payload: body, muteHttpExceptions: true,
    headers: { 'x-baubc-timestamp': ts, 'x-baubc-signature': sig }
  });
  if (res.getResponseCode() < 300) threads.forEach(function (t) { t.addLabel(synced); });
  else console.error('BAUBC gmail sync failed', res.getResponseCode(), res.getContentText());
}
