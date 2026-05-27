import { z } from 'zod';

export type EventFormMessages = {
  titleRequired: string;
  dateRequired: string;
  timeRequired: string;
};

export const createEventFormSchema = (messages: EventFormMessages) =>
  z.object({
    title: z.string().min(1, messages.titleRequired).max(100),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, messages.dateRequired),
    time: z.string().regex(/^\d{2}:\d{2}$/, messages.timeRequired),
    type: z.enum(['raid', 'game', 'meeting', 'other']),
    description: z.string(),
  });

export type EventFormData = z.infer<ReturnType<typeof createEventFormSchema>>;
