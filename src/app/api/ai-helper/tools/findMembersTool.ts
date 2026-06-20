import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const findMembersTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'findMembers',
    description:
      'Search guild members by name or alias. Use to resolve people mentioned by the user to their userId before adding them to an event. Returns userId, display name, and alias.',
    parameters: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'Case-insensitive substring to match against member name or alias. Omit to list all members.',
        },
      },
      required: [],
    },
  },
};
