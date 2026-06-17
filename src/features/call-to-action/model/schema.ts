import { z } from 'zod';

export type CtaFormMessages = {
  titleRequired: string;
  dateRequired: string;
  timeRequired: string;
  targetMin: string;
};

export const createCtaFormSchema = (messages: CtaFormMessages) =>
  z.object({
    title: z.string().min(1, messages.titleRequired).max(120),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, messages.dateRequired),
    time: z.string().regex(/^\d{2}:\d{2}$/, messages.timeRequired),
    type: z.enum(['game', 'meeting', 'other', 'party', 'sport', 'dnd', 'boardgame']),
    description: z.string(),
    targetCount: z.coerce.number().int().min(1, messages.targetMin),
  });

export type CtaFormData = z.infer<ReturnType<typeof createCtaFormSchema>>;
