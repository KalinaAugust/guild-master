export { EventDetailView } from './ui/EventDetailView';
export {
  default as eventDetailReducer,
  clearParticipants,
  fetchParticipantsThunk,
  updateParticipantStatusThunk,
} from './model/slice';
export { useUpdateParticipantStatusMutation } from './api/detailApi';
