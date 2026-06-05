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
import { Header } from "@/widgets/header";
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

  return (
    <html lang={locale} className={`${manrope.variable} ${unbounded.variable}`}>
      <body>
        <div className="bg-blob" />
        <div className="bg-blob bg-blob-secondary" />
        <ParticlesBackground />
        <NextIntlClientProvider messages={messages}>
          <StoreProvider>
            <Toaster position="top-right" richColors closeButton theme="dark" />
            <Header />
            <div className={styles.content}>
              {children}
            </div>
          </StoreProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
