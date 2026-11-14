const MESSAGES: Record<string, string> = {
  SOLD_OUT: 'Sorry, this ticket just sold out. You can join the waitlist.',
  REGISTRATION_CLOSED: 'Registration is not open for this event right now.',
  ALREADY_REGISTERED: 'You already have a registration for this event. Check your email for the manage link.',
  ALREADY_ON_WAITLIST: 'You are already on the waitlist.',
  MEMBERS_ONLY: 'This is available to active BAUBC members only.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  NAME_REQUIRED: 'Please enter your name.',
  TEAM_NAME_REQUIRED: 'Please enter a team name.',
  TRXID_ALREADY_USED: 'This transaction ID has already been submitted. Each bKash TrxID can be used once.',
  CLAIM_ALREADY_PENDING: 'A payment for this invoice is already waiting for verification.',
  MFA_REQUIRED: 'This action needs two-step verification. Verify with your authenticator app and try again.',
  SOD_VIOLATION: 'For accountability, a different person must do this.',
  NO_MANDATE: 'You do not have an approval mandate that covers this request.',
  NOT_SIGNED_IN: 'Please sign in first.',
  PERMISSION_DENIED: 'You do not have permission to do this.',
  REASON_REQUIRED: 'Please give a reason.',
  NOTE_REQUIRED: 'Please add a note.',
  COMMENT_REQUIRED: 'Please add a comment for the member.',
  LAST_SUPER_ADMIN: 'The last active Super Admin cannot be removed.',
  ACTIVATION_LINK_INVALID: 'This activation link has expired or was already used. Ask for a new one.',
  RATE_LIMITED: 'Too many attempts. Please wait a little and try again.',
  VERIFIED_FIELD_LOCKED: 'This field is verified. Submit a correction request instead.',
  POSSIBLE_DUPLICATE: 'A similar request to this payee exists in the last 30 days. Tick "This is not a duplicate" to continue.',
};

/** Turns a database exception into a short, user-facing message. */
export function friendlyError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const code = raw.match(/^([A-Z_]{4,})(?::\s*(.*))?/);
  if (code) {
    const [, key, detail] = code;
    const base = MESSAGES[key];
    if (base) return detail && key === 'SOD_VIOLATION' ? `${base} (${detail})` : base;
    if (detail) return detail.charAt(0).toUpperCase() + detail.slice(1);
    return key.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()) + '.';
  }
  if (/duplicate key/.test(raw)) return 'That already exists.';
  if (/permission denied/.test(raw)) return MESSAGES.PERMISSION_DENIED;
  console.error('[db]', raw);
  return 'Something went wrong. Please try again.';
}
