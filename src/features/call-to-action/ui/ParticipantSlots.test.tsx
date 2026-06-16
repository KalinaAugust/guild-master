import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ParticipantSlots } from './ParticipantSlots';
import type { CtaParticipant } from '@/entities/call-to-action';

vi.mock('@/shared/ui/ProfileLink', () => ({
  ProfileLink: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <a className={className}>{children}</a>
  ),
}));

vi.mock('@/shared/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const makeParticipants = (n: number): CtaParticipant[] =>
  Array.from({ length: n }, (_, i) => ({
    userId: `u${i}`,
    publicId: `p${i}`,
    fullName: `User ${i}`,
    avatarUrl: null,
    alias: null,
    displayAsAlias: false,
    icon: null,
  }));

const countByClass = (container: HTMLElement, cls: string) =>
  container.querySelectorAll(`[class*="${cls}"]`).length;

describe('ParticipantSlots', () => {
  it('renders an avatar per participant plus empty circles up to the target', () => {
    const { container } = render(<ParticipantSlots participants={makeParticipants(2)} targetCount={5} />);
    // 2 avatars (profile links) + 3 empty slots.
    expect(container.querySelectorAll('a').length).toBe(2);
    expect(countByClass(container, 'empty')).toBe(3);
  });

  it('renders only empty circles when nobody has joined, capped at the target', () => {
    const { container } = render(<ParticipantSlots participants={[]} targetCount={5} />);
    expect(container.querySelectorAll('a').length).toBe(0);
    expect(countByClass(container, 'empty')).toBe(5);
  });

  it('caps empty circles at 15 when the target exceeds 15', () => {
    const { container } = render(<ParticipantSlots participants={[]} targetCount={40} />);
    expect(countByClass(container, 'empty')).toBe(15);
  });

  it('shows 15 avatars plus an overflow chip and no empty slots when participants exceed 15', () => {
    const { container } = render(<ParticipantSlots participants={makeParticipants(20)} targetCount={40} />);
    expect(container.querySelectorAll('a').length).toBe(15);
    expect(countByClass(container, 'empty')).toBe(0);
    expect(countByClass(container, 'overflow')).toBeGreaterThan(0);
    expect(screen.getByText('+5')).toBeInTheDocument();
  });
});
