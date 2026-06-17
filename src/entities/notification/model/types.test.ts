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
  guild_id: null,
  title: null,
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

  it('event_comment: getLabel uses the event title', () => {
    const label = NOTIFICATION_TYPE_CONFIG.event_comment.getLabel!(t, { ...base, event_title: 'Raid' });
    expect(label).toBe(t('eventComment', { eventTitle: 'Raid' }));
  });

  it('new_call_to_action: getLabel includes guildName and config has feed link', () => {
    const cfg = NOTIFICATION_TYPE_CONFIG.new_call_to_action;
    expect(cfg.feedHref).toBe('/call-to-action');
    expect(cfg.switchesGuild).toBe(true);
    const label = cfg.getLabel!(t, { ...base, guild_name: 'Alpha' });
    expect(label).toBe(t('newCallToAction', { guildName: 'Alpha' }));
  });

  it('new_announcement: getLabel includes guildName and config has feed link', () => {
    const cfg = NOTIFICATION_TYPE_CONFIG.new_announcement;
    expect(cfg.feedHref).toBe('/announcements');
    expect(cfg.switchesGuild).toBe(true);
    const label = cfg.getLabel!(t, { ...base, guild_name: 'Alpha' });
    expect(label).toBe(t('newAnnouncement', { guildName: 'Alpha' }));
  });
});
