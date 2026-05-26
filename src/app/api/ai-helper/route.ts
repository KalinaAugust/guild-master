// src/app/api/ai-helper/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { systemPrompt } from './systemPrompt';
import { createEventTool } from './tools/createEventTool';
import { executeCreateEvent } from './tools/executeCreateEvent';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'DEEPSEEK_API_KEY not configured' }, { status: 500 });
  }

  const body = await request.json().catch(() => null) as {
    messages?: ChatMessage[];
    guildId?: string;
  } | null;

  const messages = body?.messages;
  const guildId = body?.guildId;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 });
  }
  if (!guildId) {
    return NextResponse.json({ error: 'guildId required' }, { status: 400 });
  }

  const client = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' });

  try {
    const completion = await client.chat.completions.create({
      model: 'deepseek-v4-flash',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      tools: [createEventTool],
      tool_choice: 'auto',
    });

    if (!completion.choices[0]) {
      return NextResponse.json({ error: 'Unexpected DeepSeek response shape' }, { status: 502 });
    }
    const choice = completion.choices[0];

    // DeepSeek wants to call a tool
    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
      // Only one tool registered; take the first call only
      const toolCall = choice.message.tool_calls[0];
      let eventCreated = false;
      let toolResultContent: string;

      if (toolCall.type !== 'function') {
        toolResultContent = 'Unknown tool type';
      } else if (toolCall.function.name === 'createEvent') {
        let args: { title: string; date: string; time: string; type: 'raid' | 'game' | 'meeting' | 'other'; description: string; };
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          return NextResponse.json({ error: 'Invalid tool arguments from model' }, { status: 502 });
        }
        const result = await executeCreateEvent(args, guildId);
        eventCreated = result.success;
        toolResultContent = result.success
          ? `Event created successfully with id ${result.eventId}`
          : `Failed to create event: ${result.error}`;
      } else {
        toolResultContent = 'Unknown tool';
      }

      // Send tool result back to get final response
      const followUp = await client.chat.completions.create({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
          choice.message,
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResultContent,
          },
        ],
      });

      const message = followUp.choices[0]?.message?.content;
      if (typeof message !== 'string') {
        return NextResponse.json({ error: 'Unexpected DeepSeek response shape' }, { status: 502 });
      }
      return NextResponse.json({ message, eventCreated });
    }

    // Normal text response
    const message = choice.message?.content;
    if (typeof message !== 'string') {
      return NextResponse.json({ error: 'Unexpected DeepSeek response shape' }, { status: 502 });
    }
    return NextResponse.json({ message, eventCreated: false });
  } catch {
    return NextResponse.json({ error: 'Failed to contact DeepSeek' }, { status: 500 });
  }
}
