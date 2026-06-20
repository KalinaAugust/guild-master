import { describe, it, expect } from 'vitest';
import { mapDmRow } from './mapDmRow';

describe('mapDmRow', () => {
  it('maps a row with sender profile', () => {
    const result = mapDmRow({
      id: 'm1', sender_id: 'u1', recipient_id: 'u2', body: 'hi',
      attachment_url: null, created_at: 't', updated_at: 't',
      sender: { public_id: 'p1', full_name: 'Me', avatar_url: null, alias: null, display_as_alias: false, icon: null },
    });
    expect(result.id).toBe('m1');
    expect(result.senderProfile.fullName).toBe('Me');
    expect(result.senderProfile.displayAsAlias).toBe(false);
  });

  it('defaults missing sender profile fields', () => {
    const result = mapDmRow({
      id: 'm2', sender_id: 'u1', recipient_id: 'u2', body: 'x',
      attachment_url: null, created_at: 't', updated_at: 't', sender: null,
    });
    expect(result.senderProfile.publicId).toBeNull();
    expect(result.senderProfile.displayAsAlias).toBe(false);
  });
});
