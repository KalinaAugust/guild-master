export type ActivityType = 'raid' | 'game' | 'meeting' | 'other';

export interface ActivityEvent {
  id: string;
  title: string;
  date: string; // ISO string format
  time: string; // HH:mm format
  type: ActivityType;
  description?: string;
}

export interface EventsState {
  items: ActivityEvent[];
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
}

export interface UIState {
  isEventModalOpen: boolean;
  selectedDate: string | null; // ISO string for the currently viewed date
  viewDate: string; // NEW: currently viewed month/year
  editingEvent?: ActivityEvent; // Event being edited
}
