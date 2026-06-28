'use client';

import Link from 'next/link';
import { ChevronLeft, Info } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { TypingDots } from './TypingIndicator';
import { formatLastSeen } from '@/lib/time';
import type { Conversation, Profile } from '@/lib/types/database';

export function ChatHeader({
  conversation,
  peer,
  memberCount,
  online,
  typingNames,
  onOpenInfo,
}: {
  conversation: Conversation;
  peer: Profile | null;
  memberCount: number;
  online: boolean;
  typingNames: string[];
  onOpenInfo: () => void;
}) {
  const isGroup = conversation.type === 'group';
  const title = isGroup ? conversation.name || 'Group' : peer?.display_name || peer?.username || 'Direct message';
  const avatarUrl = isGroup ? conversation.avatar_url : peer?.avatar_url;

  let subtitle: React.ReactNode;
  if (typingNames.length > 0) {
    subtitle = (
      <span className="flex items-center gap-1.5 text-lime-deep">
        <TypingDots />
        typing…
      </span>
    );
  } else if (isGroup) {
    subtitle = `${memberCount} member${memberCount === 1 ? '' : 's'}`;
  } else {
    subtitle = online ? <span className="text-online">Online</span> : formatLastSeen(peer?.last_seen_at ?? null);
  }

  return (
    <header className="flex items-center gap-2 border-b border-line bg-surface/80 px-2 py-2.5 backdrop-blur sm:px-4">
      <Link href="/app" className="lg:hidden">
        <Button variant="ghost" size="icon" aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </Link>

      <button
        onClick={onOpenInfo}
        className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left hover:bg-elevated/60"
      >
        <Avatar
          src={avatarUrl}
          name={title}
          group={isGroup}
          online={isGroup ? undefined : online}
          size="md"
        />
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">{title}</p>
          <p className="truncate text-xs text-muted">{subtitle}</p>
        </div>
      </button>

      <Button variant="ghost" size="icon" onClick={onOpenInfo} aria-label="Conversation info">
        <Info className="h-5 w-5" />
      </Button>
    </header>
  );
}
