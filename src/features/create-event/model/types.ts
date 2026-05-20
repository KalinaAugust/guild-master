import { ActivityType, ActivityEvent } from '@/shared/types';

export interface EventFormData {
  title: string;
  date: string;
  time: string;
  type: ActivityType;
  description: string;
}

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
