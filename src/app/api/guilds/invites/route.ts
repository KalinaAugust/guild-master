import { NextResponse } from 'next/server';
import { getPendingInvites } from '@/entities/guild/api/invites';

export async function GET() {
  const invites = await getPendingInvites();
  return NextResponse.json(invites);
}
