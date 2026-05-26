import { NextRequest, NextResponse } from 'next/server';

interface DeepSeekResponse {
  choices: { message: { content: string } }[];
}

export async function POST(_request: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'DEEPSEEK_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'Say hello in one sentence' }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'DeepSeek API error' },
        { status: response.status }
      );
    }

    const data = await response.json() as DeepSeekResponse;
    const message = data.choices?.[0]?.message?.content;
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
