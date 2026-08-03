import type { Metadata } from "next";
import { Manrope, Unbounded } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";
import "@/shared/design-system/tokens.css";

const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope", display: "swap" });
const unbounded = Unbounded({ subsets: ["latin", "cyrillic"], variable: "--font-unbounded", display: "swap" });

import StoreProvider from "./providers/StoreProvider";
import { getUser } from "@/entities/user/api/getUser";
import { ParticlesBackground } from "@/shared/ui/ParticlesBackground";
import shell from './(app)/Layout.module.css';

export const metadata: Metadata = {
  title: "Guild Master",
  description: "Guild management system",
};

const requiredNamespaces = [
  'Common', 'Event', 'Guild', 'GuildDetail', 'EventComments', 'EventDetail',
  'GuildChat', 'DirectMessages', 'GuildPoll', 'Announcements', 'CallToAction',
  'GuildMembers', 'UpcomingEvents', 'Notifications', 'AiHelper', 'Auth',
  'DateTimePicker', 'PrivateNote', 'UpdateProfile', 'Landing',
];

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const user = await getUser();

  const filteredMessages = Object.keys(messages)
    .filter((key) => requiredNamespaces.includes(key))
    .reduce<typeof messages>((obj, key) => { obj[key] = messages[key]; return obj; }, {});

  return (
    <html lang={locale} className={`${manrope.variable} ${unbounded.variable}`}>
      <body className={user ? undefined : shell.noRail}>
        <div className="bg-blob" />
        <div className="bg-blob bg-blob-secondary" />
        <ParticlesBackground />
        <NextIntlClientProvider messages={filteredMessages}>
          <StoreProvider>
            <Toaster position="top-right" richColors closeButton theme="dark" />
            {children}
          </StoreProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
