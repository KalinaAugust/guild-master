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
          enum: ['raid', 'game', 'meeting', 'other', 'dungeon', 'party', 'sport', 'dnd', 'boardgame'],
          description: 'Event type. Choose the closest match to what the user described.',
        },
        description: {
          type: 'string',
          description: 'Optional longer description of the event. Empty string if not specified.',
        },
      },
      required: ['title', 'date', 'time', 'type', 'description'],
    },
  },
};
