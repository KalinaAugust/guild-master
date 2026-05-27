import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const findEventsTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'findEvents',
    description:
      'Search guild events by date range, type, or keyword. Use when the user asks to find, list, show, or check events.',
    parameters: {
      type: 'object',
      properties: {
        dateFrom: {
          type: 'string',
          description: 'Start date (inclusive) in YYYY-MM-DD format. Omit to search from the beginning.',
        },
        dateTo: {
          type: 'string',
          description: 'End date (inclusive) in YYYY-MM-DD format. Omit to search to the end.',
        },
        type: {
          type: 'string',
          enum: ['raid', 'game', 'meeting', 'other'],
          description: 'Filter by event type. Omit to match all types.',
        },
        keyword: {
          type: 'string',
          description: 'Case-insensitive substring to match in the event title.',
        },
      },
      required: [],
    },
  },
};
