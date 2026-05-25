import { useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { Guild, setCurrentGuild } from '@/entities/guild';

export const useGuildSelection = (guilds: Guild[]) => {
  const dispatch = useAppDispatch();
  const currentGuildId = useAppSelector((state) => state.guild.currentGuildId);

  const activeGuildId = useMemo(() => currentGuildId || guilds[0]?.id, [currentGuildId, guilds]);

  const guildOptions = useMemo(() => guilds.map(guild => ({
    label: guild.name,
    value: guild.id,
    avatar: '/assets/guild-placeholder.svg'
  })), [guilds]);

  const handleGuildChange = (guildId: string) => {
    dispatch(setCurrentGuild(guildId));
  };

  return { activeGuildId, guildOptions, handleGuildChange };
};