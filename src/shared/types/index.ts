export type ActivityType = 'raid' | 'game' | 'meeting' | 'other' | 'dungeon' | 'party' | 'sport' | 'dnd' | 'boardgame';

export interface ActivityEvent {
  id: string;
  title: string;
  date: string; // ISO string format
  time: string; // HH:mm format
  type: ActivityType;
  description?: string;
  createdBy?: string;
}

export interface UIState {
  isEventModalOpen: boolean;
  selectedDate: string | null;
  viewDate: string;
  editingEvent?: ActivityEvent;
  excludedEventTypes: ActivityType[];
}

export type ParticipantStatus = 'pending' | 'confirmed' | 'declined';

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  status: ParticipantStatus;
  profile: {
    fullName: string | null;
    avatarUrl: string | null;
  };
}
