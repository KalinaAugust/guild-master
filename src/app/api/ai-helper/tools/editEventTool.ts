import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const editEventTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'editEvent',
    description:
      'Edits an existing calendar event. Use when the user asks to update, rename, reschedule, or modify an event. Always call findEvents first to obtain the event id.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The id of the event to edit. Obtain it via findEvents.',
        },
        title: {
          type: 'string',
          description: 'New title for the event.',
        },
        date: {
          type: 'string',
          description: 'New date in YYYY-MM-DD format. Omit to keep the existing date. If provided, you MUST also provide time.',
        },
        time: {
          type: 'string',
          description: 'New start time in HH:mm 24-hour format. Omit to keep the existing time. If provided, you MUST also provide date.',
        },
        type: {
          type: 'string',
          enum: ['game', 'meeting', 'other', 'party', 'sport', 'dnd', 'boardgame'],
          description: 'New event type.',
        },
        description: {
          type: 'string',
          description: 'New description. Pass empty string to clear.',
        },
        endTime: {
          type: 'string',
          description: 'Optional event end time in HH:mm 24-hour format (e.g. "21:30"). If the end is on/after midnight relative to the start it is treated as the next day. Omit if the event has no defined end.',
        },
        weekDays: {
          type: 'array',
          items: {
            type: 'integer',
            minimum: 0,
            maximum: 6,
          },
          description: 'New days of the week the event repeats on. 0 = Sunday, 1 = Monday, etc. Pass an empty array to clear recurrence.',
        },
      },
      required: ['id'],
    },
  },
};
