export {
  default as eventsReducer,
  addEvent,
  fetchEventsThunk,
  createEventThunk,
  updateEventThunk,
  deleteEventThunk
} from './model/slice';
export { EventCard } from './ui/EventCard';
export { getEventParticipantUserIds } from './api/getEventParticipantUserIds';
export { syncParticipants } from './api/syncParticipants';
