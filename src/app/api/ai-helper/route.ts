import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSystemPrompt } from './systemPrompt';
import { createEventTool } from './tools/createEventTool';
import { executeCreateEvent, CreateEventArgs } from './tools/executeCreateEvent';
import { findEventsTool } from './tools/findEventsTool';
import { executeFindEvents, FindEventsArgs } from './tools/executeFindEvents';
import { editEventTool } from './tools/editEventTool';
import { executeEditEvent, EditEventArgs } from './tools/executeEditEvent';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const DEEPSEEK_MODEL = 'deepseek-v4-flash';
const MAX_TOOL_TURNS = 5;

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
  if (typeof guildId !== 'string' || !guildId) {
    return NextResponse.json({ error: 'guildId required' }, { status: 400 });
  }

  const client = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' });

  try {
    let currentMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: getSystemPrompt() },
      ...messages,
    ];
    let eventCreated = false;
    let eventUpdated = false;

    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const completion = await client.chat.completions.create({
        model: DEEPSEEK_MODEL,
        messages: currentMessages,
        tools: [createEventTool, findEventsTool, editEventTool],
        tool_choice: 'auto',
      });

      if (!completion.choices[0]) {
        return NextResponse.json({ error: 'Unexpected DeepSeek response shape' }, { status: 502 });
      }
      const choice = completion.choices[0];

      // Normal text response — done
      if (choice.finish_reason !== 'tool_calls' || !choice.message.tool_calls) {
        const message = choice.message?.content;
        if (typeof message !== 'string') {
          return NextResponse.json({ error: 'Unexpected DeepSeek response shape' }, { status: 502 });
        }
        return NextResponse.json({ message, eventCreated, eventUpdated });
      }

      // Tool call — execute and continue the loop
      const toolCall = choice.message.tool_calls[0];
      let toolResultContent: string;

      if (toolCall.type !== 'function') {
        console.error('[ai-helper] Unexpected non-function tool call type:', toolCall.type);
        toolResultContent = 'Unknown tool type';
      } else if (toolCall.function.name === 'createEvent') {
        let args: CreateEventArgs;
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
      } else if (toolCall.function.name === 'findEvents') {
        let args: FindEventsArgs;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          return NextResponse.json({ error: 'Invalid tool arguments from model' }, { status: 502 });
        }
        const result = await executeFindEvents(args, guildId);
        toolResultContent = JSON.stringify(result);
      } else if (toolCall.function.name === 'editEvent') {
        let args: EditEventArgs;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          return NextResponse.json({ error: 'Invalid tool arguments from model' }, { status: 502 });
        }
        const result = await executeEditEvent(args);
        eventUpdated = result.success;
        toolResultContent = result.success
          ? `Event updated successfully with id ${result.eventId}`
          : `Failed to update event: ${result.error}`;
      } else {
        console.error('[ai-helper] Unexpected tool name:', toolCall.function.name);
        toolResultContent = 'Unknown tool';
      }

      currentMessages = [
        ...currentMessages,
        choice.message,
        {
          role: 'tool' as const,
          tool_call_id: toolCall.id,
          content: toolResultContent,
        },
      ];
    }

    return NextResponse.json({ error: 'Too many tool call iterations' }, { status: 502 });
  } catch {
    return NextResponse.json({ error: 'Failed to contact DeepSeek' }, { status: 500 });
  }
}
