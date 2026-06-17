import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuildMembersSection } from './GuildMembersSection';

vi.mock('@/entities/guild', () => ({
  useGetGuildMembersQuery: vi.fn(),
  useAddGuildMemberMutation: vi.fn(),
  useRemoveGuildMemberMutation: vi.fn(),
  useUpdateGuildMemberRoleMutation: vi.fn(),
  useTransferGuildOwnershipMutation: vi.fn(),
  useGuildPermissions: vi.fn(() => ({ canManageMembers: false, isOwner: false })),
}));

vi.mock('@/entities/user', () => ({
  resolveDisplayName: ({ fullName }: { fullName: string | null }) => fullName,
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

import {
  useGetGuildMembersQuery,
  useAddGuildMemberMutation,
  useRemoveGuildMemberMutation,
  useUpdateGuildMemberRoleMutation,
  useTransferGuildOwnershipMutation,
  useGuildPermissions,
} from '@/entities/guild';

const mockMembers = [
  { userId: 'u1', role: 'OWNER' as const, profile: { publicId: null, fullName: 'Alice', avatarUrl: null, alias: null, displayAsAlias: false, icon: null } },
  { userId: 'u2', role: 'MEMBER' as const, profile: { publicId: null, fullName: 'Bob', avatarUrl: null, alias: null, displayAsAlias: false, icon: null } },
];

const ownerMember = mockMembers[0]; // u1 OWNER
const regularMember = mockMembers[1]; // u2 MEMBER
const adminMember = {
  userId: 'u3', role: 'ADMIN' as const,
  profile: { publicId: null, fullName: 'Carol', avatarUrl: null, alias: null, displayAsAlias: false, icon: null },
};

describe('GuildMembersSection', () => {
  const addMemberMock = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
  const removeMemberMock = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
  const updateRoleMock = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
  const transferOwnershipMock = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

  beforeEach(() => {
    addMemberMock.mockClear();
    removeMemberMock.mockClear();
    updateRoleMock.mockClear();
    transferOwnershipMock.mockClear();
    vi.mocked(useGetGuildMembersQuery).mockReturnValue(
      { data: mockMembers, isLoading: false } as never
    );
    vi.mocked(useAddGuildMemberMutation).mockReturnValue(
      [addMemberMock, { isLoading: false }] as never
    );
    vi.mocked(useRemoveGuildMemberMutation).mockReturnValue(
      [removeMemberMock, { isLoading: false }] as never
    );
    vi.mocked(useUpdateGuildMemberRoleMutation).mockReturnValue(
      [updateRoleMock, { isLoading: false }] as never
    );
    vi.mocked(useTransferGuildOwnershipMutation).mockReturnValue(
      [transferOwnershipMock, { isLoading: false }] as never
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

  it('shows an actions menu only for non-owner members when manager', () => {
    vi.mocked(useGuildPermissions).mockReturnValue({ canManageMembers: true, isOwner: true } as never);
    render(<GuildMembersSection guildId="g1" userId="u1" />);
    expect(screen.getAllByRole('button', { name: 'memberActions' })).toHaveLength(1);
  });

  it('owner sees Make admin + Remove for a member', async () => {
    const user = userEvent.setup();
    vi.mocked(useGuildPermissions).mockReturnValue({ canManageMembers: true, isOwner: true } as never);
    vi.mocked(useGetGuildMembersQuery).mockReturnValue(
      { data: [ownerMember, regularMember], isLoading: false } as never
    );
    render(<GuildMembersSection guildId="g1" userId="u1" />);
    await user.click(screen.getByRole('button', { name: 'memberActions' }));
    expect(await screen.findByText('makeAdmin')).toBeInTheDocument();
    expect(screen.getByText('removeMember')).toBeInTheDocument();
  });

  it('owner sees Revoke admin for an admin', async () => {
    const user = userEvent.setup();
    vi.mocked(useGuildPermissions).mockReturnValue({ canManageMembers: true, isOwner: true } as never);
    vi.mocked(useGetGuildMembersQuery).mockReturnValue(
      { data: [ownerMember, adminMember], isLoading: false } as never
    );
    render(<GuildMembersSection guildId="g1" userId="u1" />);
    await user.click(screen.getByRole('button', { name: 'memberActions' }));
    expect(await screen.findByText('revokeAdmin')).toBeInTheDocument();
  });

  it('admin sees Remove for a member but no role action and no menu on an admin', async () => {
    const user = userEvent.setup();
    vi.mocked(useGuildPermissions).mockReturnValue({ canManageMembers: true, isOwner: false } as never);
    vi.mocked(useGetGuildMembersQuery).mockReturnValue(
      { data: [ownerMember, regularMember, adminMember], isLoading: false } as never
    );
    render(<GuildMembersSection guildId="g1" userId="u9" />);
    const triggers = screen.getAllByRole('button', { name: 'memberActions' });
    expect(triggers).toHaveLength(1);
    await user.click(triggers[0]);
    expect(await screen.findByText('removeMember')).toBeInTheDocument();
    expect(screen.queryByText('makeAdmin')).not.toBeInTheDocument();
  });

  it('promotes a member to admin after confirming', async () => {
    const user = userEvent.setup();
    vi.mocked(useGuildPermissions).mockReturnValue({ canManageMembers: true, isOwner: true } as never);
    vi.mocked(useGetGuildMembersQuery).mockReturnValue(
      { data: [ownerMember, regularMember], isLoading: false } as never
    );
    render(<GuildMembersSection guildId="g1" userId="u1" />);
    await user.click(screen.getByRole('button', { name: 'memberActions' }));
    await user.click(await screen.findByText('makeAdmin'));
    await user.click(await screen.findByRole('button', { name: 'confirm' }));
    expect(updateRoleMock).toHaveBeenCalledWith({ guildId: 'g1', userId: 'u2', role: 'ADMIN' });
  });

  it('revokes admin from a member after confirming', async () => {
    const user = userEvent.setup();
    vi.mocked(useGuildPermissions).mockReturnValue({ canManageMembers: true, isOwner: true } as never);
    vi.mocked(useGetGuildMembersQuery).mockReturnValue(
      { data: [ownerMember, adminMember], isLoading: false } as never
    );
    render(<GuildMembersSection guildId="g1" userId="u1" />);
    await user.click(screen.getByRole('button', { name: 'memberActions' }));
    await user.click(await screen.findByText('revokeAdmin'));
    await user.click(await screen.findByRole('button', { name: 'confirm' }));
    expect(updateRoleMock).toHaveBeenCalledWith({ guildId: 'g1', userId: 'u3', role: 'MEMBER' });
  });

  it('removes a member after confirming', async () => {
    const user = userEvent.setup();
    vi.mocked(useGuildPermissions).mockReturnValue({ canManageMembers: true, isOwner: true } as never);
    vi.mocked(useGetGuildMembersQuery).mockReturnValue(
      { data: [ownerMember, regularMember], isLoading: false } as never
    );
    render(<GuildMembersSection guildId="g1" userId="u1" />);
    await user.click(screen.getByRole('button', { name: 'memberActions' }));
    await user.click(await screen.findByText('removeMember'));
    await user.click(await screen.findByRole('button', { name: 'remove' }));
    expect(removeMemberMock).toHaveBeenCalledWith({ guildId: 'g1', userId: 'u2' });
  });

  it('owner sees Transfer guild for a member', async () => {
    const user = userEvent.setup();
    vi.mocked(useGuildPermissions).mockReturnValue({ canManageMembers: true, isOwner: true } as never);
    vi.mocked(useGetGuildMembersQuery).mockReturnValue(
      { data: [ownerMember, regularMember], isLoading: false } as never
    );
    render(<GuildMembersSection guildId="g1" userId="u1" />);
    await user.click(screen.getByRole('button', { name: 'memberActions' }));
    expect(await screen.findByText('transferOwnership')).toBeInTheDocument();
  });

  it('admin does not see Transfer guild', async () => {
    const user = userEvent.setup();
    vi.mocked(useGuildPermissions).mockReturnValue({ canManageMembers: true, isOwner: false } as never);
    vi.mocked(useGetGuildMembersQuery).mockReturnValue(
      { data: [ownerMember, regularMember, adminMember], isLoading: false } as never
    );
    render(<GuildMembersSection guildId="g1" userId="u9" />);
    await user.click(screen.getAllByRole('button', { name: 'memberActions' })[0]);
    await screen.findByText('removeMember');
    expect(screen.queryByText('transferOwnership')).not.toBeInTheDocument();
  });

  it('transfers ownership to a member after confirming', async () => {
    const user = userEvent.setup();
    vi.mocked(useGuildPermissions).mockReturnValue({ canManageMembers: true, isOwner: true } as never);
    vi.mocked(useGetGuildMembersQuery).mockReturnValue(
      { data: [ownerMember, regularMember], isLoading: false } as never
    );
    render(<GuildMembersSection guildId="g1" userId="u1" />);
    await user.click(screen.getByRole('button', { name: 'memberActions' }));
    await user.click(await screen.findByText('transferOwnership'));
    await user.click(await screen.findByRole('button', { name: 'transferOwnership' }));
    expect(transferOwnershipMock).toHaveBeenCalledWith({ guildId: 'g1', newOwnerId: 'u2' });
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
