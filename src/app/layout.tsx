import type { Metadata } from "next";
import { Manrope, Unbounded } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-unbounded",
  display: "swap",
});
import StoreProvider from "./providers/StoreProvider";
import { Header, UserMenu } from "@/widgets/header";
import { Sidebar } from "@/widgets/sidebar";
import { CopyrightFooter } from "./CopyrightFooter";
import { getUser } from "@/entities/user/api/getUser";
import { ParticlesBackground } from "@/shared/ui/ParticlesBackground";
import styles from './Layout.module.css';

export const metadata: Metadata = {
  title: "Guild Master",
  description: "Guild management system",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const user = await getUser();

  const requiredNamespaces = [
    'Common',
    'Event',
    'Guild',
    'GuildDetail',
    'EventComments',
    'EventDetail',
    'GuildChat',
    'GuildPoll',
    'GuildMembers',
    'UpcomingEvents',
    'Notifications',
    'AiHelper',
    'Auth'
  ];
  const filteredMessages = Object.keys(messages)
    .filter((key) => requiredNamespaces.includes(key))
    .reduce<Record<string, any>>((obj, key) => {
      obj[key] = (messages as Record<string, any>)[key];
      return obj;
    }, {});

  return (
    <html lang={locale} className={`${manrope.variable} ${unbounded.variable}`}>
      <body>
        <div className="bg-blob" />
        <div className="bg-blob bg-blob-secondary" />
        <ParticlesBackground />
        <NextIntlClientProvider messages={filteredMessages}>
          <StoreProvider>
            <Toaster position="top-right" richColors closeButton theme="dark" />
            <Sidebar
              footer={
                <UserMenu
                  email={user?.email}
                  avatarUrl={user?.profile?.avatarUrl}
                  name={user?.profile?.fullName}
                />
              }
            />
            <div className={styles.appShell}>
              <Header />
              <div className={styles.content}>
                {children}
              </div>
              <CopyrightFooter />
            </div>
          </StoreProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
