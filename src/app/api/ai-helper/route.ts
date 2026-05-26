import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'DEEPSEEK_API_KEY not configured' },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null) as { messages?: ChatMessage[] } | null;
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 });
  }

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com',
  });

  try {
    const completion = await client.chat.completions.create({
      model: 'deepseek-v4-flash',
      messages,
    });

    const message = completion.choices[0]?.message?.content;
    if (typeof message !== 'string') {
      return NextResponse.json({ error: 'Unexpected DeepSeek response shape' }, { status: 502 });
    }
    return NextResponse.json({ message });
  } catch {
    return NextResponse.json(
      { error: 'Failed to contact DeepSeek' },
      { status: 500 }
    );
  }
}
