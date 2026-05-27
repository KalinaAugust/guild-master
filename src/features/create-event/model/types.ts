import { ActivityEvent } from '@/shared/types';
import type { EventFormData } from './schema';
export type { EventFormData } from './schema';

export interface EventFormProps {
  initialData?: Partial<ActivityEvent>;
  onSubmit: (data: EventFormData) => void;
  onCancel: () => void;
  submitLabel: string;
  isDayView?: boolean;
  isEdit?: boolean;
  hideActions?: boolean;
  formId?: string;
}
