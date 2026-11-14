import 'server-only';
import { cache } from 'react';
import { withClaims } from '../db';

const anon = <T,>(fn: Parameters<typeof withClaims<T>>[1]) => withClaims<T>(null, fn);

export const getSettings = cache(async () => {
  const rows = await anon((tx) => tx.query<{ key: string; value: any }>(`select key, value from app.site_settings`));
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, any>;
  return { club: s.club ?? {}, social: s.social ?? {}, payments: s.payments ?? {}, features: s.features ?? {} };
});

export type EventRow = {
  id: string; slug: string; title: string; title_bn: string | null; subtitle: string | null; summary: string | null; body: string | null;
  category: string; status: string; venue: string | null; venue_detail: string | null; starts_at: string | null; ends_at: string | null;
  date_label: string | null; reg_opens_at: string | null; reg_closes_at: string | null; featured: boolean; eligibility: string | null;
  refund_policy: string | null; cover_tone: string; contact_email: string | null; is_online: boolean;
  capacity: number; sold: number; held: number; min_price: string | null; max_price: string | null; reg_open: boolean;
};

const EVENT_SELECT = `
  select e.*, coalesce(sum(t.capacity),0)::int capacity, coalesce(sum(t.sold_count),0)::int sold, coalesce(sum(t.held_count),0)::int held,
    min(t.price)::text min_price, max(t.price)::text max_price,
    (e.status = 'published' and now() >= coalesce(e.reg_opens_at, 'infinity'::timestamptz) and now() < coalesce(e.reg_closes_at, 'infinity'::timestamptz)) reg_open
  from app.events e left join app.ticket_types t on t.event_id = e.id`;

export const getEvents = cache(async () =>
  anon((tx) => tx.query<EventRow>(`${EVENT_SELECT} group by e.id order by e.featured desc, e.starts_at nulls last, e.created_at`)));

export const getEvent = cache(async (slug: string) =>
  anon((tx) => tx.one<EventRow>(`${EVENT_SELECT} where e.slug = $1 group by e.id`, [slug])));

export type Availability = { ticket_type_id: string; name: string; description: string | null; audience: string; unit: string; price: string; capacity: number; sold: number; held: number; seats_left: number; waitlist_enabled: boolean; waitlist_count: number; sales_open: boolean };
export async function getAvailability(eventId: string) {
  return anon((tx) => tx.query<Availability>(`select ticket_type_id::text, name, description, audience, unit, price::text, capacity, sold, held, seats_left, waitlist_enabled, waitlist_count::int, sales_open from app.event_availability($1)`, [eventId]));
}
export const getEventPeople = cache(async (eventId: string) =>
  anon((tx) => tx.query(`select name, role, title, bio from app.event_people where event_id = $1 order by sort`, [eventId])));

export type PostRow = { id: string; slug: string; kind: string; series: string | null; episode_no: number | null; title: string; title_bn: string | null; dek: string | null; body: string | null; topics: string[]; cover_tone: string; cover_label: string | null; facebook_url: string | null; youtube_url: string | null; author_name: string | null; stats: any; published_at: string | null };
export const getPosts = cache(async () =>
  anon((tx) => tx.query<PostRow>(`select * from app.posts where status = 'published' order by published_at desc nulls last`)));
export const getPost = cache(async (slug: string) =>
  anon((tx) => tx.one<PostRow>(`select * from app.posts where slug = $1 and status = 'published'`, [slug])));

export const getWings = cache(async () =>
  anon((tx) => tx.query(`select id::text, slug, name, name_bn, summary, responsibilities, kind from app.org_units where is_public order by sort, name`)));

export const getPublicMembers = cache(async () => anon((tx) => tx.query(`select * from app.public_members()`)));
export const getPublicAdvisors = cache(async () => anon((tx) => tx.query(`select * from app.public_advisors()`)));
export const getStats = cache(async () => anon(async (tx) => (await tx.one(`select app.public_stats() s`))?.s ?? {}));
export const getSocialTop = cache(async () =>
  anon((tx) => tx.query(`select title, post_type, viewers, views, likes, comments, shares, published_at from app.social_posts order by viewers desc nulls last limit 10`)));
export const getRecruitment = cache(async () =>
  anon((tx) => tx.one(`select label, status, opens_at, closes_at, intake_form_url, notes from app.membership_cycles order by (status = 'open') desc, created_at desc limit 1`)));
export const getPublicAnnouncements = cache(async () =>
  anon((tx) => tx.query(`select title, title_bn, body, publish_at from app.announcements order by pinned desc, publish_at desc limit 3`)));
export const getGallery = cache(async () => anon((tx) => tx.query(`select * from app.gallery_albums order by taken_on desc nulls last, created_at desc`)));
export const getResources = cache(async () => anon((tx) => tx.query(`select * from app.resources order by created_at desc`)));
export const getRecognition = cache(async () =>
  anon((tx) => tx.query(`select ra.period, ra.citation from app.recognition_awards ra order by period desc limit 1`)));
