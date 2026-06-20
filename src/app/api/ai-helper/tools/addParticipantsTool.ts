import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const addParticipantsTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'addParticipants',
    description:
      'Adds guild members to an existing event as participants. Obtain eventId via findEvents and userIds via findMembers. This only adds people — it never removes existing participants.',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The id of the event to add participants to. Obtain it via findEvents.',
        },
        userIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'User ids of guild members to add. Obtain them via findMembers.',
        },
      },
      required: ['eventId', 'userIds'],
    },
  },
};
