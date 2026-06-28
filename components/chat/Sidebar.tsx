'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, SquarePen, Users, Settings, LogOut, UserPlus } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConversationSkeleton } from '@/components/ui/Skeleton';
import { Popover, MenuItem } from '@/components/ui/Popover';
import { useApp } from './AppProvider';
import { ConversationItem, conversationTitle } from './ConversationItem';
import { NewConversationModal } from './NewConversationModal';

export function Sidebar() {
  const { me, conversations, loadingConversations } = useApp();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [newOpen, setNewOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => conversationTitle(c).toLowerCase().includes(q));
  }, [conversations, query]);

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 pt-4">
        <Logo size="sm" href="/app" />
        <div className="flex items-center gap-1">
          <Link href="/app/contacts">
            <Button variant="ghost" size="icon" aria-label="Contacts">
              <Users className="h-5 w-5" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" aria-label="New conversation" onClick={() => setNewOpen(true)}>
            <SquarePen className="h-5 w-5" />
          </Button>
          <Popover
            trigger={({ toggle }) => (
              <button onClick={toggle} className="focus-ring ml-1 rounded-full" aria-label="Account menu">
                <Avatar src={me.avatar_url} name={me.display_name || me.username} size="sm" />
              </button>
            )}
          >
            {(close) => (
              <>
                <div className="border-b border-line px-3 py-2.5">
                  <p className="truncate text-sm font-semibold">{me.display_name || me.username}</p>
                  <p className="truncate text-xs text-muted">@{me.username}</p>
                </div>
                <div className="pt-1">
                  <Link href="/app/settings" onClick={close}>
                    <MenuItem icon={<Settings className="h-4 w-4" />}>Settings</MenuItem>
                  </Link>
                  <Link href="/app/contacts" onClick={close}>
                    <MenuItem icon={<UserPlus className="h-4 w-4" />}>Contacts &amp; requests</MenuItem>
                  </Link>
                  <form action="/auth/signout" method="post">
                    <button type="submit" className="w-full">
                      <MenuItem icon={<LogOut className="h-4 w-4" />} danger>
                        Sign out
                      </MenuItem>
                    </button>
                  </form>
                </div>
              </>
            )}
          </Popover>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-2 pt-3">
        <Input
          icon={<Search className="h-4 w-4" />}
          placeholder="Search conversations"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-2 pb-4">
        {loadingConversations ? (
          <div className="pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <ConversationSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          query ? (
            <EmptyState
              className="pt-16"
              title="No matches"
              description={`Nothing matches “${query}”.`}
              icon={<Search className="h-6 w-6" />}
            />
          ) : (
            <EmptyState
              className="pt-16"
              mascot
              title="No conversations yet"
              description="Start a chat or create a group to get going."
              action={
                <Button onClick={() => setNewOpen(true)}>
                  <SquarePen className="h-4 w-4" /> New conversation
                </Button>
              }
            />
          )
        ) : (
          <div className="space-y-0.5 pt-1">
            {filtered.map((c) => (
              <ConversationItem key={c.id} c={c} active={pathname === `/app/c/${c.id}`} />
            ))}
          </div>
        )}
      </div>

      <NewConversationModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}
