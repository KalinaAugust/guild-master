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
import { findMembersTool } from './tools/findMembersTool';
import { executeFindMembers, FindMembersArgs } from './tools/executeFindMembers';
import { addParticipantsTool } from './tools/addParticipantsTool';
import { executeAddParticipants, AddParticipantsArgs } from './tools/executeAddParticipants';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
const MAX_TOOL_TURNS = 5;

type ToolOutcome = {
  content: string;
  eventCreated?: boolean;
  eventUpdated?: boolean;
  participantsUpdated?: boolean;
};

/** Dispatches a single tool call. Returns `null` if the model produced invalid JSON args. */
async function handleToolCall(
  name: string,
  rawArgs: string,
  guildId: string,
  canCreateEvents: boolean,
  canEditEvents: boolean,
  canManageParticipants: boolean,
): Promise<ToolOutcome | null> {
  let args: unknown;
  try {
    args = JSON.parse(rawArgs);
  } catch {
    return null;
  }

  switch (name) {
    case 'createEvent': {
      if (!canEditEvents) {
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
      if (!canEditEvents) {
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
    case 'findMembers': {
      const result = await executeFindMembers(args as FindMembersArgs, guildId);
      return { content: JSON.stringify(result) };
    }
    case 'addParticipants': {
      if (!canManageParticipants) {
        return { content: 'Permission denied: only guild owners and admins can add participants.' };
      }
      const addArgs = args as AddParticipantsArgs;
      const found = await getEventById(addArgs.eventId);
      if (!found || found.guildId !== guildId) {
        return { content: 'Failed to add participants: event not found in this guild' };
      }
      const result = await executeAddParticipants(addArgs, guildId);
      return {
        content: result.success
          ? `Added ${result.addedCount} participant(s) to the event`
          : `Failed to add participants: ${result.error}`,
        participantsUpdated: result.success,
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
  const canCreateEvents = membership?.role === 'OWNER' || membership?.role === 'ADMIN';
  const canEditEvents = membership?.role === 'OWNER' || membership?.role === 'ADMIN';
  const canManageParticipants = membership?.role === 'OWNER' || membership?.role === 'ADMIN';

  const { data: profile } = await auth.supabase
    .from('profiles')
    .select('full_name, alias, display_as_alias')
    .eq('id', auth.user.id)
    .single();

  const currentUserName = profile
    ? (profile.display_as_alias && profile.alias ? profile.alias : profile.full_name ?? profile.alias ?? 'Unknown')
    : 'Unknown';

  const client = new OpenAI({ apiKey, baseURL: DEEPSEEK_BASE_URL });

  try {
    let currentMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: getSystemPrompt({ userId: auth.user.id, userName: currentUserName }) },
      ...messages,
    ];
    let eventCreated = false;
    let eventUpdated = false;
    let participantsUpdated = false;

    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const completion = await client.chat.completions.create({
        model: DEEPSEEK_MODEL,
        messages: currentMessages,
        tools: [createEventTool, findEventsTool, editEventTool, findMembersTool, addParticipantsTool],
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
        return NextResponse.json({ message, eventCreated, eventUpdated, participantsUpdated });
      }

      // Tool calls — execute all of them in parallel and continue the loop
      const toolCalls = choice.message.tool_calls;
      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall) => {
          if (toolCall.type !== 'function') {
            console.error('[ai-helper] Unexpected non-function tool call type:', toolCall.type);
            return {
              id: toolCall.id,
              content: 'Unknown tool type',
              invalid: false,
            };
          }

          const outcome = await handleToolCall(
            toolCall.function.name,
            toolCall.function.arguments,
            guildId,
            canCreateEvents,
            canEditEvents,
            canManageParticipants
          );

          if (!outcome) {
            return {
              id: toolCall.id,
              content: 'Invalid tool arguments from model',
              invalid: true,
            };
          }

          return {
            id: toolCall.id,
            content: outcome.content,
            eventCreated: outcome.eventCreated,
            eventUpdated: outcome.eventUpdated,
            participantsUpdated: outcome.participantsUpdated,
            invalid: false,
          };
        })
      );

      const hasInvalid = toolResults.some((r) => r.invalid);
      if (hasInvalid) {
        return NextResponse.json({ error: 'Invalid tool arguments from model' }, { status: 502 });
      }

      toolResults.forEach((r) => {
        if (r.eventCreated) eventCreated = true;
        if (r.eventUpdated) eventUpdated = true;
        if (r.participantsUpdated) participantsUpdated = true;
      });

      currentMessages = [
        ...currentMessages,
        choice.message,
        ...toolResults.map((r) => ({
          role: 'tool' as const,
          tool_call_id: r.id,
          content: r.content,
        })),
      ];
    }

    return NextResponse.json({ error: 'Too many tool call iterations' }, { status: 502 });
  } catch {
    return NextResponse.json({ error: 'Failed to contact DeepSeek' }, { status: 500 });
  }
}
