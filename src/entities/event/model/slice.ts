import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EventsState, ActivityEvent } from '@/shared/types';

const initialState: EventsState = {
  items: [
    {
      id: '1',
      title: 'Рейд в Огненные Недра',
      date: new Date().toISOString().split('T')[0],
      time: '20:00',
      type: 'raid',
      description: 'Сбор у входа, быть всем с химией.',
    },
    {
      id: '2',
      title: 'Собрание офицеров',
      date: new Date().toISOString().split('T')[0],
      time: '18:00',
      type: 'meeting',
      description: 'Обсуждение набора новых игроков.',
    },
    {
      id: '3',
      title: 'Дейлики вместе',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      time: '14:00',
      type: 'game',
    }
  ],
  loading: false,
  error: null,
};

export const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    addEvent: (state, action: PayloadAction<ActivityEvent>) => {
      state.items.push(action.payload);
    },
  },
});

export const { addEvent } = eventsSlice.actions;
export default eventsSlice.reducer;
