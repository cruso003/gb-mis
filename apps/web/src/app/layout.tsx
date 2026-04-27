import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { auth } from '../auth';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'GB MIS — MOGCSP',
  description: 'Gender-Based Management Information System | Ministry of Gender, Children and Social Protection, Republic of Liberia',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [session, locale, messages] = await Promise.all([auth(), getLocale(), getMessages()]);
  return (
    <html lang={locale} className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SessionProvider session={session}>{children}</SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
