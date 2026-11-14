/**
 * BAUBC · Google Form → platform connector (form-bound Apps Script)
 *
 * Setup (5 minutes, done by the form owner using the club account):
 *  1. Open the application Google Form → ⋮ → Script editor. Paste this file.
 *  2. Project Settings → Script properties → add:
 *       BAUBC_ENDPOINT = https://YOUR-SITE/api/hooks/google-form
 *       BAUBC_SECRET   = the same value as GOOGLE_FORM_WEBHOOK_SECRET on the server
 *  3. Triggers → Add trigger → function onFormSubmitInstallable, event "From form", "On form submit".
 *  4. Form settings → Responses → Collect email addresses: "Verified".
 *  5. NEVER add a password question. The platform rejects any payload containing password-like fields.
 *
 * Map your question titles to platform fields in FIELD_MAP below (left: exact question title).
 */
var FIELD_MAP = {
  'Full name (English)': 'full_name',
  'Full name (Bangla)': 'full_name_bn',
  'Student ID': 'student_id',
  'Department': 'department',
  'Session': 'session',
  'Level / Semester': 'batch',
  'Phone number': 'phone',
  'Facebook profile link': 'facebook_url',
  'LinkedIn profile link': 'linkedin_url',
  'Short bio': 'bio',
  'Areas of interest': 'interests',
  'Skills': 'skills',
  'Previous club or organisational experience': 'experience',
  'Why do you want to join BAUBC?': 'motivation',
  'Preferred wings': 'preferred_units'
};
var LIST_FIELDS = { interests: true, skills: true, preferred_units: true };

function onFormSubmitInstallable(e) {
  var resp = e.response;
  var payload = { response_id: resp.getId(), email: resp.getRespondentEmail(), submitted_at: resp.getTimestamp().toISOString() };
  resp.getItemResponses().forEach(function (ir) {
    var key = FIELD_MAP[ir.getItem().getTitle()];
    if (!key) return;
    var v = ir.getResponse();
    payload[key] = LIST_FIELDS[key] ? (Array.isArray(v) ? v : String(v).split(',').map(function (s) { return s.trim(); }).filter(String)) : (Array.isArray(v) ? v.join(', ') : String(v));
  });
  send_(payload);
}

/** Re-sends every response (safe: the platform ignores duplicates). Run manually or nightly as a reconciliation. */
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
  if (res.getResponseCode() >= 300) console.error('BAUBC intake failed', res.getResponseCode(), res.getContentText());
}
