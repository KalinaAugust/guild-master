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
  it('covers all 5 notification types', () => {
    const types = ['new_event', 'invitation', 'join_request', 'join_request_approved', 'join_request_declined'];
    for (const type of types) {
      expect(NOTIFICATION_TYPE_CONFIG[type]).toBeDefined();
    }
  });

  it('new_event: getLabel includes guildName', () => {
    const label = NOTIFICATION_TYPE_CONFIG.new_event.getLabel(t, { ...base, guild_name: 'Alpha' });
    expect(label).toContain('Alpha');
  });

  it('invitation: getLabel returns invitation key', () => {
    const label = NOTIFICATION_TYPE_CONFIG.invitation.getLabel(t, base);
    expect(label).toBe('invitation');
  });

  it('join_request: getLabel includes guildName', () => {
    const label = NOTIFICATION_TYPE_CONFIG.join_request.getLabel(t, { ...base, guild_name: 'Beta' });
    expect(label).toContain('Beta');
  });

  it('join_request_approved: getLabel includes guildName', () => {
    const label = NOTIFICATION_TYPE_CONFIG.join_request_approved.getLabel(t, { ...base, guild_name: 'Gamma' });
    expect(label).toContain('Gamma');
  });

  it('join_request_declined: getLabel includes guildName', () => {
    const label = NOTIFICATION_TYPE_CONFIG.join_request_declined.getLabel(t, { ...base, guild_name: 'Delta' });
    expect(label).toContain('Delta');
  });

  it('new_event: getLabel uses empty string when guild_name is null', () => {
    const label = NOTIFICATION_TYPE_CONFIG.new_event.getLabel(t, { ...base, guild_name: null });
    expect(label).toContain('""');
  });

  it('each config has an Icon', () => {
    for (const config of Object.values(NOTIFICATION_TYPE_CONFIG)) {
      expect(config.Icon).toBeDefined();
    }
  });
});
