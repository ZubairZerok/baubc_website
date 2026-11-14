'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function setLang(lang: 'en' | 'bn') {
  (await cookies()).set('lang', lang === 'bn' ? 'bn' : 'en', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  revalidatePath('/', 'layout');
}
