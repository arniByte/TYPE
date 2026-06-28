'use client';

import Link from 'next/link';
import { Image as ImageIcon, Video, Paperclip, Mic, Check } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/time';
import { useApp } from './AppProvider';
import type { ConversationOverview } from '@/lib/types/database';

export function conversationTitle(c: ConversationOverview): string {
  if (c.type === 'group') return c.name || 'Group';
  return c.peer?.display_name || c.peer?.username || 'Direct message';
}

function previewIcon(type: string) {
  if (type === 'image') return <ImageIcon className="h-3.5 w-3.5" />;
  if (type === 'video') return <Video className="h-3.5 w-3.5" />;
  if (type === 'audio') return <Mic className="h-3.5 w-3.5" />;
  if (type === 'file') return <Paperclip className="h-3.5 w-3.5" />;
  return null;
}

export function ConversationItem({
  c,
  active,
}: {
  c: ConversationOverview;
  active: boolean;
}) {
  const { me, isOnline } = useApp();
  const title = conversationTitle(c);
  const avatarUrl = c.type === 'group' ? c.avatar_url : c.peer?.avatar_url;
  const online = c.type === 'direct' && c.peer ? isOnline(c.peer.id) : undefined;
  const last = c.last_message;
  const fromMe = last?.sender_id === me.id;

  let previewText = 'No messages yet';
  if (last) {
    if (last.deleted) previewText = 'Message deleted';
    else if (last.type === 'system') previewText = last.content ?? '';
    else if (last.type === 'text') previewText = last.content ?? '';
    else
      previewText =
        last.type === 'image'
          ? 'Photo'
          : last.type === 'video'
            ? 'Video'
            : last.type === 'audio'
              ? 'Voice message'
              : 'File';
  }

  return (
    <Link
      href={`/app/c/${c.id}`}
      className={cn(
        'group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-150 active:scale-[0.98]',
        active ? 'bg-elevated' : 'hover:bg-hover',
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-lime" />
      )}
      <Avatar src={avatarUrl} name={title} group={c.type === 'group'} online={online} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold text-fg">{title}</span>
          <span className="shrink-0 text-[11px] text-faint">
            {formatRelative(c.last_message_at)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1 text-xs text-muted">
            {fromMe && last && last.type !== 'system' && !last.deleted && (
              <Check className="h-3.5 w-3.5 shrink-0 text-faint" />
            )}
            {last && previewIcon(last.type)}
            <span className="truncate">{previewText}</span>
          </span>
          {c.unread > 0 && <Badge>{c.unread > 99 ? '99+' : c.unread}</Badge>}
        </div>
      </div>
    </Link>
  );
}
