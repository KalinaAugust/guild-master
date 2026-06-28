import type { Metadata } from 'next';
import { LandingPage } from '@/widgets/landing';

export const metadata: Metadata = {
  title: 'Guild Master — organize your gaming guild',
  description: 'Calendar, chat, and announcements for your gaming community — all in one place.',
};

export default function Page() {
  return <LandingPage />;
}
