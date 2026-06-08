import { createElement, useMemo } from 'react';
import { Shield } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { Guild, setCurrentGuild } from '@/entities/guild';

import { updateLastActiveGuild } from "@/entities/user";

export const useGuildSelection = (guilds: Guild[], initialGuildId?: string, userId?: string) => {
  const dispatch = useAppDispatch();
  const currentGuildId = useAppSelector((state) => state.guild.currentGuildId);

  const activeGuildId = useMemo(() => currentGuildId || initialGuildId || guilds[0]?.id, [currentGuildId, initialGuildId, guilds]);

  const guildOptions = useMemo(() => guilds.map(guild => ({
    label: guild.name,
    value: guild.id,
    avatar: guild.avatarUrl,
    avatarFallback: guild.avatarUrl ? undefined : createElement(Shield, { size: 17 }),
  })), [guilds]);

  const handleGuildChange = (guildId: string) => {
    dispatch(setCurrentGuild(guildId));
    if (userId) {
      updateLastActiveGuild(userId, guildId).catch((err) => {
        console.error("Failed to update last active guild:", err);
      });
    }
  };

  return { activeGuildId, guildOptions, handleGuildChange };
};
