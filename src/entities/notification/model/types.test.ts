import { describe, it, expect } from 'vitest';
import { NOTIFICATION_TYPE_CONFIG, type Notification } from './types';

const base: Notification = {
  id: 'n1',
  type: 'new_event',
  entity_type: null,
  entity_id: null,
  is_read: false,
  created_at: '2026-06-01T10:00:00Z',
  event_title: null,
  event_date: null,
  guild_name: null,
};

const t = (key: string, values?: Record<string, string>) => {
  if (values) return `${key}:${JSON.stringify(values)}`;
  return key;
};

describe('NOTIFICATION_TYPE_CONFIG', () => {
  it('new_event: getLabel includes guildName', () => {
    const label = NOTIFICATION_TYPE_CONFIG.new_event.getLabel!(t, { ...base, guild_name: 'Alpha' });
    expect(label).toContain('Alpha');
  });

  it('invitation: getLabel returns invitation key', () => {
    const label = NOTIFICATION_TYPE_CONFIG.invitation.getLabel!(t, base);
    expect(label).toBe('invitation');
  });

  it('join_request: links to guild via rich message', () => {
    expect(NOTIFICATION_TYPE_CONFIG.join_request.linksToGuild).toBe(true);
    expect(NOTIFICATION_TYPE_CONFIG.join_request.messageKey).toBe('joinRequest');
  });

  it('join_request_approved: links to guild via rich message', () => {
    expect(NOTIFICATION_TYPE_CONFIG.join_request_approved.linksToGuild).toBe(true);
    expect(NOTIFICATION_TYPE_CONFIG.join_request_approved.messageKey).toBe('joinRequestApproved');
  });

  it('join_request_declined: links to guild via rich message', () => {
    expect(NOTIFICATION_TYPE_CONFIG.join_request_declined.linksToGuild).toBe(true);
    expect(NOTIFICATION_TYPE_CONFIG.join_request_declined.messageKey).toBe('joinRequestDeclined');
  });

  it('new_event: getLabel uses empty string when guild_name is null', () => {
    const label = NOTIFICATION_TYPE_CONFIG.new_event.getLabel!(t, { ...base, guild_name: null });
    expect(label).toBe(t('newEvent', { guildName: '' }));
  });
});
