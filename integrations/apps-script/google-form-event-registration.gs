/**
 * BAUBC · Google Form → live event registration (form-bound Apps Script)
 *
 * Use this for an EVENT registration form (the application form uses google-form-connector.gs).
 * Every response becomes a real registration on the website within seconds: the seat counter,
 * the "Live registrations" list on the event page and the organiser dashboard update by themselves.
 *
 * Setup (5 minutes):
 *  1. Open the event's Google Form → ⋮ → Script editor. Paste this file.
 *  2. Project Settings → Script properties → add:
 *       BAUBC_ENDPOINT   = https://YOUR-SITE/api/hooks/google-form
 *       BAUBC_SECRET     = the same value as GOOGLE_FORM_WEBHOOK_SECRET on the server
 *       BAUBC_EVENT_SLUG = the event's address on the site, e.g. startup-summit-2027 (from /events/startup-summit-2027)
 *       BAUBC_TICKET     = optional: the ticket name to use, e.g. "Summit pass" (otherwise the cheapest public ticket)
 *  3. Triggers → Add trigger → function onFormSubmitInstallable, event "From form", "On form submit".
 *  4. Form settings → Responses → Collect email addresses: "Verified".
 *  5. Run reconcileAll() once after setup and nightly: it re-sends everything; duplicates are ignored.
 *
 * Seats are limited on the website: if the event is full or closed, the response is logged in the
 * script's Executions with the reason and the website does not over-book.
 */
var FIELD_MAP = {
  'Full name': 'full_name',
  'Phone number': 'phone',
  'Institution / Department': 'institution'
};

function onFormSubmitInstallable(e) {
  var resp = e.response, props = PropertiesService.getScriptProperties();
  var payload = {
    type: 'event_registration',
    response_id: resp.getId(),
    email: resp.getRespondentEmail(),
    submitted_at: resp.getTimestamp().toISOString(),
    event_slug: props.getProperty('BAUBC_EVENT_SLUG'),
    ticket_type: props.getProperty('BAUBC_TICKET') || '',
    answers: {}
  };
  resp.getItemResponses().forEach(function (ir) {
    var title = ir.getItem().getTitle(), v = ir.getResponse(), key = FIELD_MAP[title];
    var text = Array.isArray(v) ? v.join(', ') : String(v);
    if (key) payload[key] = text; else payload.answers[title.slice(0, 80)] = text.slice(0, 500);
  });
  send_(payload);
}

function reconcileAll() {
  FormApp.getActiveForm().getResponses().forEach(function (resp) { onFormSubmitInstallable({ response: resp }); });
}

function send_(payload) {
  var props = PropertiesService.getScriptProperties();
  var body = JSON.stringify(payload);
  var ts = Math.floor(Date.now() / 1000).toString();
  var sig = Utilities.computeHmacSha256Signature(ts + '.' + body, props.getProperty('BAUBC_SECRET'))
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
  var res = UrlFetchApp.fetch(props.getProperty('BAUBC_ENDPOINT'), {
    method: 'post', contentType: 'application/json', payload: body, muteHttpExceptions: true,
    headers: { 'x-baubc-timestamp': ts, 'x-baubc-signature': sig }
  });
  if (res.getResponseCode() >= 300) console.error('BAUBC registration failed', res.getResponseCode(), res.getContentText());
}
