'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Pencil,
  Check,
  UserPlus,
  LogOut,
  Crown,
  X,
  Ban,
  Search,
  ShieldOff,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useApp } from './AppProvider';
import { formatLastSeen } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { Conversation, MemberRole, Profile, UserSearchResult } from '@/lib/types/database';

export type Member = { user_id: string; role: MemberRole; last_read_at: string | null; profile: Profile };

export function ConversationInfoModal({
  open,
  onClose,
  conversation,
  members,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  conversation: Conversation;
  members: Member[];
  onChanged: () => void;
}) {
  const { supabase, me, isOnline } = useApp();
  const router = useRouter();
  const isGroup = conversation.type === 'group';
  const myRole = members.find((m) => m.user_id === me.id)?.role;
  const isAdmin = myRole === 'admin';
  const peer = !isGroup ? members.find((m) => m.user_id !== me.id)?.profile ?? null : null;

  const [name, setName] = useState(conversation.name ?? '');
  const [editingName, setEditingName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [blockState, setBlockState] = useState<{ blocked: boolean; byMe: boolean } | null>(null);

  useEffect(() => {
    setName(conversation.name ?? '');
  }, [conversation.name]);

  // Direct: resolve block state.
  useEffect(() => {
    if (!open || isGroup || !peer) return;
    supabase
      .from('contacts')
      .select('status, blocked_by')
      .or(
        `and(requester_id.eq.${me.id},addressee_id.eq.${peer.id}),and(requester_id.eq.${peer.id},addressee_id.eq.${me.id})`,
      )
      .maybeSingle()
      .then(({ data }) => {
        if (data?.status === 'blocked') setBlockState({ blocked: true, byMe: data.blocked_by === me.id });
        else setBlockState({ blocked: false, byMe: false });
      });
  }, [open, isGroup, peer, me.id, supabase]);

  // Add-members search.
  useEffect(() => {
    if (!addOpen) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc('search_users', { _q: q });
      const existing = new Set(members.map((m) => m.user_id));
      setResults(((data as UserSearchResult[]) ?? []).filter((u) => !existing.has(u.id)));
    }, 220);
    return () => clearTimeout(t);
  }, [query, addOpen, supabase, members]);

  async function saveName() {
    if (!name.trim() || name.trim() === conversation.name) {
      setEditingName(false);
      return;
    }
    setBusy(true);
    await supabase.rpc('rename_conversation', { _conv: conversation.id, _name: name.trim() });
    setBusy(false);
    setEditingName(false);
    onChanged();
  }

  async function addMember(u: UserSearchResult) {
    setBusy(true);
    await supabase.rpc('add_group_members', { _conv: conversation.id, _member_ids: [u.id] });
    setBusy(false);
    setQuery('');
    setResults([]);
    setAddOpen(false);
    onChanged();
  }

  async function removeMember(userId: string) {
    setBusy(true);
    await supabase.rpc('remove_group_member', { _conv: conversation.id, _target: userId });
    setBusy(false);
    onChanged();
  }

  async function leave() {
    setBusy(true);
    await supabase.rpc('leave_conversation', { _conv: conversation.id });
    onChanged();
    onClose();
    router.push('/app');
  }

  async function toggleBlock() {
    if (!peer) return;
    setBusy(true);
    const next = !(blockState?.blocked && blockState.byMe);
    await supabase.rpc('set_block', { _target: peer.id, _blocked: next });
    setBlockState({ blocked: next, byMe: next });
    setBusy(false);
    onChanged();
  }

  return (
    <Modal open={open} onClose={onClose} title={isGroup ? 'Group info' : 'Contact info'}>
      {/* Header card */}
      <div className="flex flex-col items-center pb-4 text-center">
        <Avatar
          src={isGroup ? conversation.avatar_url : peer?.avatar_url}
          name={isGroup ? conversation.name : peer?.display_name || peer?.username}
          group={isGroup}
          online={!isGroup && peer ? isOnline(peer.id) : undefined}
          size="xl"
        />
        {isGroup ? (
          editingName ? (
            <div className="mt-3 flex w-full max-w-xs items-center gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />
              <Button size="icon" onClick={saveName} loading={busy} aria-label="Save name">
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <h3 className="text-lg font-bold">{conversation.name || 'Group'}</h3>
              {isAdmin && (
                <button onClick={() => setEditingName(true)} className="text-faint hover:text-fg">
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>
          )
        ) : (
          <>
            <h3 className="mt-3 text-lg font-bold">{peer?.display_name || peer?.username}</h3>
            <p className="text-sm text-muted">@{peer?.username}</p>
            {peer?.bio && <p className="mt-2 max-w-xs text-sm text-muted">{peer.bio}</p>}
            <p className="mt-1 text-xs text-faint">
              {peer && isOnline(peer.id) ? 'Online now' : formatLastSeen(peer?.last_seen_at ?? null)}
            </p>
          </>
        )}
      </div>

      {/* Group members */}
      {isGroup && (
        <div className="border-t border-line pt-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-faint">
              {members.length} members
            </span>
            {isAdmin && (
              <button
                onClick={() => setAddOpen((v) => !v)}
                className="flex items-center gap-1 text-xs text-lime-deep hover:underline"
              >
                <UserPlus className="h-3.5 w-3.5" /> Add
              </button>
            )}
          </div>

          {addOpen && (
            <div className="mb-3">
              <Input
                icon={<Search className="h-4 w-4" />}
                placeholder="Add someone"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {results.length > 0 && (
                <div className="mt-1.5 max-h-40 space-y-0.5 overflow-y-auto">
                  {results.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => addMember(u)}
                      disabled={busy}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-hover"
                    >
                      <Avatar src={u.avatar_url} name={u.display_name || u.username} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{u.display_name || u.username}</span>
                        <span className="block truncate text-xs text-muted">@{u.username}</span>
                      </span>
                      <UserPlus className="h-4 w-4 text-lime-deep" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {members.map((m) => (
              <div key={m.user_id} className="group flex items-center gap-3 rounded-xl px-2 py-1.5">
                <Avatar
                  src={m.profile.avatar_url}
                  name={m.profile.display_name || m.profile.username}
                  online={isOnline(m.user_id)}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.user_id === me.id ? 'You' : m.profile.display_name || m.profile.username}
                  </p>
                  <p className="truncate text-xs text-muted">@{m.profile.username}</p>
                </div>
                {m.role === 'admin' && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-lime-deep">
                    <Crown className="h-3.5 w-3.5" /> Admin
                  </span>
                )}
                {isAdmin && m.user_id !== me.id && (
                  <button
                    onClick={() => removeMember(m.user_id)}
                    className="text-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                    aria-label="Remove member"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <Button variant="danger" className="mt-4 w-full" onClick={leave} loading={busy}>
            <LogOut className="h-4 w-4" /> Leave group
          </Button>
        </div>
      )}

      {/* Direct actions */}
      {!isGroup && peer && (
        <div className="border-t border-line pt-4">
          {blockState?.blocked && !blockState.byMe ? (
            <div className="flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger">
              <ShieldOff className="h-4 w-4" /> This person has blocked you.
            </div>
          ) : (
            <Button
              variant={blockState?.blocked ? 'secondary' : 'danger'}
              className="w-full"
              onClick={toggleBlock}
              loading={busy}
            >
              {blockState?.blocked ? (
                <>
                  <Check className="h-4 w-4" /> Unblock @{peer.username}
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4" /> Block @{peer.username}
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}
