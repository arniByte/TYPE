'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, MessageSquare, X, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { useApp } from './AppProvider';
import type { UserSearchResult } from '@/lib/types/database';

type Mode = 'direct' | 'group';

export function NewConversationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { supabase, refreshConversations } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('direct');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UserSearchResult[]>([]);
  const [groupName, setGroupName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on open/close.
  useEffect(() => {
    if (!open) {
      setMode('direct');
      setQuery('');
      setResults([]);
      setSelected([]);
      setGroupName('');
      setError(null);
    }
  }, [open]);

  // Debounced user search.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc('search_users', { _q: q });
      setResults((data as UserSearchResult[]) ?? []);
      setSearching(false);
    }, 220);
    return () => clearTimeout(t);
  }, [query, open, supabase]);

  function toggleSelect(u: UserSearchResult) {
    setSelected((prev) =>
      prev.some((p) => p.id === u.id) ? prev.filter((p) => p.id !== u.id) : [...prev, u],
    );
  }

  async function startDirect(u: UserSearchResult) {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('create_direct_conversation', { _other: u.id });
      if (error) throw error;
      await refreshConversations();
      onClose();
      router.push(`/app/c/${data as string}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start chat');
    } finally {
      setBusy(false);
    }
  }

  async function createGroup() {
    if (!groupName.trim()) {
      setError('Give your group a name');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('create_group', {
        _name: groupName.trim(),
        _member_ids: selected.map((s) => s.id),
      });
      if (error) throw error;
      await refreshConversations();
      onClose();
      router.push(`/app/c/${data as string}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create group');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New conversation">
      {/* Mode toggle */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-canvas p-1">
        {(['direct', 'group'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'focus-ring flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors',
              mode === m ? 'bg-elevated text-fg shadow-soft' : 'text-muted hover:text-fg',
            )}
          >
            {m === 'direct' ? <MessageSquare className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            {m === 'direct' ? 'Message' : 'Group'}
          </button>
        ))}
      </div>

      {mode === 'group' && (
        <div className="mb-3">
          <Input
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            maxLength={80}
          />
          {selected.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {selected.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-elevated py-1 pl-1 pr-2 text-xs"
                >
                  <Avatar src={u.avatar_url} name={u.display_name || u.username} size="xs" />
                  {u.display_name || u.username}
                  <button onClick={() => toggleSelect(u)} className="text-faint hover:text-fg">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <Input
        autoFocus
        icon={<Search className="h-4 w-4" />}
        placeholder="Search by username or name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-3 max-h-64 min-h-[6rem] overflow-y-auto">
        {searching ? (
          <div className="grid place-items-center py-8 text-muted">
            <Spinner className="h-5 w-5" />
          </div>
        ) : query.trim() && results.length === 0 ? (
          <EmptyState className="py-8" title="No users found" description="Try a different name or username." />
        ) : (
          <div className="space-y-0.5">
            {results.map((u) => {
              const isSelected = selected.some((s) => s.id === u.id);
              return (
                <button
                  key={u.id}
                  disabled={busy}
                  onClick={() => (mode === 'direct' ? startDirect(u) : toggleSelect(u))}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-hover disabled:opacity-60',
                    isSelected && 'bg-elevated',
                  )}
                >
                  <Avatar src={u.avatar_url} name={u.display_name || u.username} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.display_name || u.username}</p>
                    <p className="truncate text-xs text-muted">@{u.username}</p>
                  </div>
                  {mode === 'group' &&
                    (isSelected ? (
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-lime text-lime-ink">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <span className="h-5 w-5 rounded-full border border-line-strong" />
                    ))}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {mode === 'group' && (
        <Button className="mt-4 w-full" onClick={createGroup} loading={busy} disabled={!groupName.trim()}>
          Create group{selected.length > 0 ? ` · ${selected.length + 1} people` : ''}
        </Button>
      )}
    </Modal>
  );
}
