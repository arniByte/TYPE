'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Search,
  UserPlus,
  Check,
  X,
  MessageSquare,
  Ban,
  Clock,
  Users,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useApp } from '@/components/chat/AppProvider';
import { cn } from '@/lib/utils';
import type { Contact, Profile, UserSearchResult } from '@/lib/types/database';

type EnrichedContact = Contact & { other: Profile };

export function ContactsView() {
  const { supabase, me, isOnline } = useApp();
  const router = useRouter();
  const [contacts, setContacts] = useState<EnrichedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: rows } = await supabase.from('contacts').select('*');
    const list = (rows ?? []) as Contact[];
    const otherIds = list.map((r) => (r.requester_id === me.id ? r.addressee_id : r.requester_id));
    let profiles: Profile[] = [];
    if (otherIds.length) {
      const { data } = await supabase.from('profiles').select('*').in('id', otherIds);
      profiles = (data ?? []) as Profile[];
    }
    const map = new Map(profiles.map((p) => [p.id, p]));
    setContacts(
      list
        .map((r) => {
          const otherId = r.requester_id === me.id ? r.addressee_id : r.requester_id;
          const other = map.get(otherId);
          return other ? { ...r, other } : null;
        })
        .filter(Boolean) as EnrichedContact[],
    );
    setLoading(false);
  }, [supabase, me.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced add-search.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
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
  }, [query, supabase]);

  const incoming = useMemo(
    () => contacts.filter((c) => c.status === 'pending' && c.addressee_id === me.id),
    [contacts, me.id],
  );
  const outgoing = useMemo(
    () => contacts.filter((c) => c.status === 'pending' && c.requester_id === me.id),
    [contacts, me.id],
  );
  const accepted = useMemo(() => contacts.filter((c) => c.status === 'accepted'), [contacts]);
  const blocked = useMemo(
    () => contacts.filter((c) => c.status === 'blocked' && c.blocked_by === me.id),
    [contacts, me.id],
  );

  async function sendRequest(username: string) {
    setPendingId(username);
    await supabase.rpc('send_contact_request', { _username: username });
    const { data } = await supabase.rpc('search_users', { _q: query.trim() });
    setResults((data as UserSearchResult[]) ?? []);
    setPendingId(null);
    load();
  }

  async function respond(id: string, accept: boolean) {
    setPendingId(id);
    await supabase.rpc('respond_contact_request', { _contact_id: id, _accept: accept });
    await load();
    setPendingId(null);
  }

  async function block(target: string, blocked: boolean) {
    setPendingId(target);
    await supabase.rpc('set_block', { _target: target, _blocked: blocked });
    await load();
    setPendingId(null);
  }

  async function message(userId: string) {
    const { data } = await supabase.rpc('create_direct_conversation', { _other: userId });
    if (data) router.push(`/app/c/${data as string}`);
  }

  return (
    <div className="flex h-full flex-col bg-canvas">
      <header className="flex items-center gap-2 border-b border-line bg-surface/80 px-2 py-3 backdrop-blur sm:px-4">
        <Link href="/app" className="lg:hidden">
          <Button variant="ghost" size="icon" aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="px-1 text-lg font-bold tracking-tight">Contacts</h1>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 py-5">
        {/* Add */}
        <section className="mb-6">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Find people by username or name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query.trim() && (
            <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-surface">
              {searching ? (
                <div className="grid place-items-center py-6 text-muted">
                  <Spinner className="h-5 w-5" />
                </div>
              ) : results.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">No users found.</p>
              ) : (
                results.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-3 py-2.5">
                    <Avatar src={u.avatar_url} name={u.display_name || u.username} size="md" online={isOnline(u.id)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.display_name || u.username}</p>
                      <p className="truncate text-xs text-muted">@{u.username}</p>
                    </div>
                    {u.contact_status === 'accepted' ? (
                      <Button size="sm" variant="secondary" onClick={() => message(u.id)}>
                        <MessageSquare className="h-4 w-4" /> Message
                      </Button>
                    ) : u.contact_status === 'pending' ? (
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <Clock className="h-3.5 w-3.5" /> Pending
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => sendRequest(u.username)}
                        loading={pendingId === u.username}
                      >
                        <UserPlus className="h-4 w-4" /> Add
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {loading ? (
          <div className="grid place-items-center py-16 text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <>
            {/* Requests */}
            {incoming.length > 0 && (
              <Section title={`Requests · ${incoming.length}`}>
                {incoming.map((c) => (
                  <Row key={c.id} profile={c.other} online={isOnline(c.other.id)}>
                    <Button size="sm" onClick={() => respond(c.id, true)} loading={pendingId === c.id}>
                      <Check className="h-4 w-4" /> Accept
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => respond(c.id, false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </Row>
                ))}
              </Section>
            )}

            {/* Contacts */}
            <Section title={`Your contacts · ${accepted.length}`}>
              {accepted.length === 0 ? (
                <EmptyState
                  className="py-10"
                  icon={<Users className="h-6 w-6" />}
                  title="No contacts yet"
                  description="Search above to find people and send a request."
                />
              ) : (
                accepted.map((c) => (
                  <Row key={c.id} profile={c.other} online={isOnline(c.other.id)}>
                    <Button size="sm" variant="secondary" onClick={() => message(c.other.id)}>
                      <MessageSquare className="h-4 w-4" /> Message
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => block(c.other.id, true)}
                      aria-label="Block"
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                  </Row>
                ))
              )}
            </Section>

            {/* Outgoing */}
            {outgoing.length > 0 && (
              <Section title={`Sent requests · ${outgoing.length}`}>
                {outgoing.map((c) => (
                  <Row key={c.id} profile={c.other} online={isOnline(c.other.id)}>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Clock className="h-3.5 w-3.5" /> Pending
                    </span>
                  </Row>
                ))}
              </Section>
            )}

            {/* Blocked */}
            {blocked.length > 0 && (
              <Section title={`Blocked · ${blocked.length}`}>
                {blocked.map((c) => (
                  <Row key={c.id} profile={c.other} online={false}>
                    <Button size="sm" variant="ghost" onClick={() => block(c.other.id, false)}>
                      Unblock
                    </Button>
                  </Row>
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-faint">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">{children}</div>
    </section>
  );
}

function Row({
  profile,
  online,
  children,
}: {
  profile: Profile;
  online: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex items-center gap-3 px-3 py-2.5')}>
      <Avatar src={profile.avatar_url} name={profile.display_name || profile.username} size="md" online={online} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{profile.display_name || profile.username}</p>
        <p className="truncate text-xs text-muted">@{profile.username}</p>
      </div>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}
