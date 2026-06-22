import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const createEventTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'createEvent',
    description: 'Creates a new calendar event in the guild. Use when the user asks to create, add, or schedule an event.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Short descriptive title of the event',
        },
        date: {
          type: 'string',
          description: 'Event date in YYYY-MM-DD format (e.g. "2026-06-15")',
        },
        time: {
          type: 'string',
          description: 'Event start time in HH:mm 24-hour format (e.g. "19:30"). If not specified by the user, use "12:00".',
        },
        type: {
          type: 'string',
          enum: ['game', 'meeting', 'other', 'party', 'sport', 'dnd', 'boardgame'],
          description: 'Event type. Choose the closest match to what the user described.',
        },
        description: {
          type: 'string',
          description: 'Optional longer description of the event. Empty string if not specified.',
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
          description: 'Days of the week the event repeats on. 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday. Omit or leave empty if the event is not recurring.',
        },
        userIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'User ids of guild members to add as participants on creation. Obtain them via findMembers. Omit if none.',
        },
      },
      required: ['title', 'date', 'time', 'type', 'description'],
    },
  },
};
