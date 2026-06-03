import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuildMembersSection } from './GuildMembersSection';

vi.mock('@/entities/guild', () => ({
  useGetGuildMembersQuery: vi.fn(),
  useAddGuildMemberMutation: vi.fn(),
  useRemoveGuildMemberMutation: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

import {
  useGetGuildMembersQuery,
  useAddGuildMemberMutation,
  useRemoveGuildMemberMutation,
} from '@/entities/guild';

const mockMembers = [
  { userId: 'u1', role: 'OWNER' as const, profile: { fullName: 'Alice', avatarUrl: null } },
  { userId: 'u2', role: 'MEMBER' as const, profile: { fullName: 'Bob', avatarUrl: null } },
];

describe('GuildMembersSection', () => {
  const addMemberMock = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
  const removeMemberMock = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

  beforeEach(() => {
    addMemberMock.mockClear();
    removeMemberMock.mockClear();
    vi.mocked(useGetGuildMembersQuery).mockReturnValue(
      { data: mockMembers, isLoading: false } as never
    );
    vi.mocked(useAddGuildMemberMutation).mockReturnValue(
      [addMemberMock, { isLoading: false }] as never
    );
    vi.mocked(useRemoveGuildMemberMutation).mockReturnValue(
      [removeMemberMock, { isLoading: false }] as never
    );
  });

  it('renders member names', () => {
    render(<GuildMembersSection guildId="g1" />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('Add button is disabled when email input is empty', () => {
    render(<GuildMembersSection guildId="g1" />);
    expect(screen.getByRole('button', { name: 'add' })).toBeDisabled();
  });

  it('Add button is enabled after typing email', () => {
    render(<GuildMembersSection guildId="g1" />);
    fireEvent.change(screen.getByPlaceholderText('user@example.com'), {
      target: { value: 'test@test.com' },
    });
    expect(screen.getByRole('button', { name: 'add' })).not.toBeDisabled();
  });

  it('calls addGuildMember with guildId and email on submit', () => {
    render(<GuildMembersSection guildId="g1" />);
    fireEvent.change(screen.getByPlaceholderText('user@example.com'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'add' }));
    expect(addMemberMock).toHaveBeenCalledWith({ guildId: 'g1', email: 'new@example.com' });
  });

  it('rejects invalid email and shows validation toast', async () => {
    const { toast } = await import('sonner');
    render(<GuildMembersSection guildId="g1" />);
    fireEvent.change(screen.getByPlaceholderText('user@example.com'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'add' }));
    expect(addMemberMock).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('invalidEmail');
  });

  it('does not show remove button for OWNER', () => {
    render(<GuildMembersSection guildId="g1" />);
    const removeButtons = screen.getAllByRole('button', { name: 'removeMember' });
    expect(removeButtons).toHaveLength(1);
  });

  it('asks for confirmation before removing and does not remove on open', () => {
    render(<GuildMembersSection guildId="g1" />);
    fireEvent.click(screen.getByRole('button', { name: 'removeMember' }));
    expect(removeMemberMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'remove' })).toBeInTheDocument();
  });

  it('calls removeGuildMember with correct ids after confirming', () => {
    render(<GuildMembersSection guildId="g1" />);
    fireEvent.click(screen.getByRole('button', { name: 'removeMember' }));
    fireEvent.click(screen.getByRole('button', { name: 'remove' }));
    expect(removeMemberMock).toHaveBeenCalledWith({ guildId: 'g1', userId: 'u2' });
  });

  it('shows "user not found" toast on 404 error', async () => {
    const { toast } = await import('sonner');
    const failMock = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({ status: 404 }),
    });
    vi.mocked(useAddGuildMemberMutation).mockReturnValue([failMock, { isLoading: false }] as never);

    render(<GuildMembersSection guildId="g1" />);
    fireEvent.change(screen.getByPlaceholderText('user@example.com'), { target: { value: 'x@x.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'add' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('userNotFound');
    });
  });

  it('shows "already a member" toast on 409 error', async () => {
    const { toast } = await import('sonner');
    const failMock = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({ status: 409 }),
    });
    vi.mocked(useAddGuildMemberMutation).mockReturnValue([failMock, { isLoading: false }] as never);

    render(<GuildMembersSection guildId="g1" />);
    fireEvent.change(screen.getByPlaceholderText('user@example.com'), { target: { value: 'x@x.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'add' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('alreadyMember');
    });
  });

  it('shows generic error toast on unknown add error', async () => {
    const { toast } = await import('sonner');
    const failMock = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({ status: 500 }),
    });
    vi.mocked(useAddGuildMemberMutation).mockReturnValue([failMock, { isLoading: false }] as never);

    render(<GuildMembersSection guildId="g1" />);
    fireEvent.change(screen.getByPlaceholderText('user@example.com'), { target: { value: 'x@x.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'add' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('addError');
    });
  });
});
