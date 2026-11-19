import 'server-only';

export const env = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  databaseUrl: process.env.DATABASE_URL || '',
  // Optional: a YouTube Data API key (restricted to the YouTube Data API v3). Without it the public RSS feeds are used.
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  // The club's Supabase project. Both values are public by design (the publishable key only works through row-level security).
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oinrhzcawnxkqvjyfbja.supabase.co',
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_nUWO8j7-7msDVYZVeCEBew_a3-023rY',
  supabaseSecret: process.env.SUPABASE_SECRET_KEY || '',
  resendKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'BAUBC <onboarding@resend.dev>',
  formSecret: process.env.GOOGLE_FORM_WEBHOOK_SECRET || '',
  gmailSecret: process.env.GMAIL_WEBHOOK_SECRET || '',
  cronSecret: process.env.CRON_SECRET || '',
  setupToken: process.env.SETUP_TOKEN || '',
  googleSignIn: process.env.AUTH_GOOGLE_ENABLED === 'true',
  previewSecret: process.env.PREVIEW_SECRET || 'baubc-preview-mode-not-for-production-use-0001',
};

/** Preview mode: no production database configured → in-process PGlite with sample data and persona sign-in. */
export const isPreview = !env.databaseUrl;
/** Supabase Auth is used only when a real database and Supabase keys are configured. */
export const hasSupabaseAuth = !isPreview && !!env.supabaseUrl && !!env.supabaseKey;
