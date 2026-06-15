import { NextRequest, NextResponse } from 'next/server';
import { toggleReaction } from '@/entities/announcement/api/toggleReaction';
import { InvalidAnnouncementError } from '@/entities/announcement/api/createAnnouncement';
import { requireUser } from '@/shared/api/guildAuth';
import type { ReactionType } from '@/entities/announcement';
import { REACTION_TYPES } from '@/entities/announcement';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { announcementId } = await params;
    const { type } = await request.json();
    if (!REACTION_TYPES.includes(type as ReactionType)) {
      return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 });
    }
    const announcement = await toggleReaction(announcementId, type as ReactionType);
    return NextResponse.json(announcement);
  } catch (e) {
    if (e instanceof InvalidAnnouncementError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 });
  }
}
