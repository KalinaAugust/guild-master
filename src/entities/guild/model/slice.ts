import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Guild } from './types';

const GUILD_STORAGE_KEY = 'guild-master-current-guild-id';

interface GuildState {
  currentGuildId: string | null;
  isGuildEditModalOpen: boolean;
  editingGuild: Guild | null;
}

const initialState: GuildState = {
  currentGuildId: typeof window !== 'undefined' ? localStorage.getItem(GUILD_STORAGE_KEY) : null,
  isGuildEditModalOpen: false,
  editingGuild: null,
};

export const guildSlice = createSlice({
  name: 'guild',
  initialState,
  reducers: {
    setCurrentGuild: (state, action: PayloadAction<string>) => {
      state.currentGuildId = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem(GUILD_STORAGE_KEY, action.payload);
      }
    },
    openGuildEditModal: (state, action: PayloadAction<Guild>) => {
      state.isGuildEditModalOpen = true;
      state.editingGuild = action.payload;
    },
    closeGuildEditModal: (state) => {
      state.isGuildEditModalOpen = false;
      state.editingGuild = null;
    },
  },
});

export const { setCurrentGuild, openGuildEditModal, closeGuildEditModal } = guildSlice.actions;
export const guildReducer = guildSlice.reducer;
