import { NextRequest, NextResponse } from 'next/server';
import { getGuildMembers } from '@/entities/guild/api/getGuildMembers';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getGuildMembers(id);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch guild members' }, { status: 500 });
  }
}
