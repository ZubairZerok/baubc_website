export type Lang = 'en' | 'bn';

const dict = {
  nav_home: { en: 'Home', bn: 'হোম' },
  nav_about: { en: 'About', bn: 'আমাদের কথা' },
  nav_events: { en: 'Events', bn: 'ইভেন্ট' },
  nav_insights: { en: 'Insights', bn: 'ইনসাইটস' },
  nav_wings: { en: 'Wings', bn: 'উইং' },
  nav_members: { en: 'Members', bn: 'সদস্য' },
  nav_advisors: { en: 'Advisors', bn: 'উপদেষ্টা' },
  nav_gallery: { en: 'Gallery', bn: 'গ্যালারি' },
  nav_resources: { en: 'Resources', bn: 'রিসোর্স' },
  nav_contact: { en: 'Contact', bn: 'যোগাযোগ' },
  nav_join: { en: 'Join BAUBC', bn: 'যোগ দিন' },
  nav_login: { en: 'Sign in', bn: 'সাইন ইন' },
  nav_dashboard: { en: 'Dashboard', bn: 'ড্যাশবোর্ড' },
  nav_verify: { en: 'Verify a certificate', bn: 'সনদ যাচাই' },
  hero_line1: { en: 'Grow founders', bn: 'উদ্যোক্তা গড়ি' },
  hero_line2: { en: 'from the field.', bn: 'মাঠ থেকে।' },
  hero_bn: { en: 'মাঠ থেকে বাজারে।', bn: 'From the field to the market.' },
  hero_lede: {
    en: 'Bangladesh Agricultural University Business Club is an innovation ecosystem for future founders and industry leaders, at the meeting point of agriculture, technology and business strategy.',
    bn: 'বাংলাদেশ কৃষি বিশ্ববিদ্যালয় বিজনেস ক্লাব কৃষি, প্রযুক্তি ও ব্যবসায়িক কৌশলের সংযোগস্থলে ভবিষ্যতের উদ্যোক্তা ও শিল্পনেতা গড়ে তোলার একটি উদ্ভাবনী ইকোসিস্টেম।',
  },
  cta_join: { en: 'Join BAUBC', bn: 'বিএইউবিসিতে যোগ দিন' },
  cta_events: { en: 'See upcoming events', bn: 'আসন্ন ইভেন্ট দেখুন' },
  pillars_label: { en: 'What we do', bn: 'আমরা যা করি' },
  pillars_title: { en: 'Three disciplines, one ecosystem', bn: 'তিনটি বিষয়, একটি ইকোসিস্টেম' },
  pillar_agri: { en: 'Agriculture', bn: 'কৃষি' },
  pillar_agri_d: { en: 'Food, farms and the rural economy as a field for real business problems.', bn: 'খাদ্য, খামার ও গ্রামীণ অর্থনীতি: বাস্তব ব্যবসায়িক সমস্যার ক্ষেত্র।' },
  pillar_tech: { en: 'Technology', bn: 'প্রযুক্তি' },
  pillar_tech_d: { en: 'AgriTech, data and digital tools that change how value is created.', bn: 'এগ্রিটেক, ডেটা ও ডিজিটাল টুল যা মূল্য সৃষ্টির ধরন বদলায়।' },
  pillar_strategy: { en: 'Business strategy', bn: 'ব্যবসায়িক কৌশল' },
  pillar_strategy_d: { en: 'Case analysis, pitching and the decisions behind successful ventures.', bn: 'কেস বিশ্লেষণ, পিচিং এবং সফল উদ্যোগের পেছনের সিদ্ধান্ত।' },
  next_up: { en: 'Next up', bn: 'পরবর্তী আয়োজন' },
  decoded_title: { en: 'DECODED: The Game Behind the Game', bn: 'ডিকোডেড: খেলার পেছনের খেলা' },
  decoded_lede: { en: 'Famous films and stories, broken down as business decisions: the money, the risk and the strategy.', bn: 'বিখ্যাত চলচ্চিত্র ও গল্পের ব্যবসায়িক বিশ্লেষণ: অর্থ, ঝুঁকি ও কৌশল।' },
  all_episodes: { en: 'All episodes', bn: 'সব পর্ব' },
  impact_label: { en: 'In numbers', bn: 'সংখ্যায়' },
  upcoming: { en: 'Upcoming', bn: 'আসন্ন' },
  past: { en: 'Past', bn: 'অতীত' },
  register: { en: 'Register', bn: 'নিবন্ধন' },
  seats_left: { en: 'Seats left', bn: 'আসন বাকি' },
  free: { en: 'Free', bn: 'বিনামূল্যে' },
  read_more: { en: 'Read more', bn: 'আরও পড়ুন' },
  follow: { en: 'Follow BAUBC', bn: 'বিএইউবিসি অনুসরণ করুন' },
  footer_note: { en: 'A student organisation of Bangladesh Agricultural University, Mymensingh.', bn: 'বাংলাদেশ কৃষি বিশ্ববিদ্যালয়, ময়মনসিংহের একটি শিক্ষার্থী সংগঠন।' },
  privacy: { en: 'Privacy', bn: 'গোপনীয়তা' },
  preview_banner: { en: 'Preview mode: sample data, persona sign-in. Connect Supabase to go live.', bn: 'প্রিভিউ মোড: নমুনা ডেটা। লাইভ করতে Supabase যুক্ত করুন।' },
} as const;

export type DictKey = keyof typeof dict;
export const t = (lang: Lang, key: DictKey) => dict[key][lang];

/** Pick the Bangla field when the visitor reads in Bangla and a translation exists. */
export const pick = (lang: Lang, en?: string | null, bn?: string | null) => (lang === 'bn' && bn ? bn : en ?? '');
