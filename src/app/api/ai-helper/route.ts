import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getEventById } from '@/entities/event/api/getEventById';
import { requireUser, requireGuildRole } from '@/shared/api/guildAuth';
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

const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
const MAX_TOOL_TURNS = 5;

type ToolOutcome = { content: string; eventCreated?: boolean; eventUpdated?: boolean };

/** Dispatches a single tool call. Returns `null` if the model produced invalid JSON args. */
async function handleToolCall(
  name: string,
  rawArgs: string,
  guildId: string,
  canManageEvents: boolean,
): Promise<ToolOutcome | null> {
  let args: unknown;
  try {
    args = JSON.parse(rawArgs);
  } catch {
    return null;
  }

  switch (name) {
    case 'createEvent': {
      if (!canManageEvents) {
        return { content: 'Permission denied: only guild owners and admins can create events.' };
      }
      const result = await executeCreateEvent(args as CreateEventArgs, guildId);
      return {
        content: result.success
          ? `Event created successfully with id ${result.eventId}`
          : `Failed to create event: ${result.error}`,
        eventCreated: result.success,
      };
    }
    case 'findEvents': {
      const result = await executeFindEvents(args as FindEventsArgs, guildId);
      return { content: JSON.stringify(result) };
    }
    case 'editEvent': {
      if (!canManageEvents) {
        return { content: 'Permission denied: only guild owners and admins can edit events.' };
      }
      const editArgs = args as EditEventArgs;
      // Ensure the targeted event belongs to the caller's guild before mutating.
      const found = await getEventById(editArgs.id);
      if (!found || found.guildId !== guildId) {
        return { content: 'Failed to update event: event not found in this guild' };
      }
      const result = await executeEditEvent(editArgs);
      return {
        content: result.success
          ? `Event updated successfully with id ${result.eventId}`
          : `Failed to update event: ${result.error}`,
        eventUpdated: result.success,
      };
    }
    default:
      console.error('[ai-helper] Unexpected tool name:', name);
      return { content: 'Unknown tool' };
  }
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
  if (typeof guildId !== 'string' || !guildId) {
    return NextResponse.json({ error: 'guildId required' }, { status: 400 });
  }

  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const forbidden = await requireGuildRole(auth.supabase, guildId, auth.user.id, [
    'OWNER',
    'ADMIN',
    'MEMBER',
  ]);
  if (forbidden) return forbidden;

  const { data: membership } = await auth.supabase
    .from('guild_members')
    .select('role')
    .eq('guild_id', guildId)
    .eq('user_id', auth.user.id)
    .single();
  const canManageEvents = membership?.role === 'OWNER' || membership?.role === 'ADMIN';

  const client = new OpenAI({ apiKey, baseURL: DEEPSEEK_BASE_URL });

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
      } else {
        const outcome = await handleToolCall(toolCall.function.name, toolCall.function.arguments, guildId, canManageEvents);
        if (!outcome) {
          return NextResponse.json({ error: 'Invalid tool arguments from model' }, { status: 502 });
        }
        toolResultContent = outcome.content;
        if (outcome.eventCreated) eventCreated = true;
        if (outcome.eventUpdated) eventUpdated = true;
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
