import { DetailLayoutSkeleton } from '@/shared/ui/DetailLayout';

/** Streaming fallback for the guild detail page. */
export default function GuildDetailLoading() {
  return <DetailLayoutSkeleton backHref="/guilds" />;
}
