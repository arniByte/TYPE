'use client';

import { useRef, useState } from 'react';
import {
  Reply,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Check,
  Clock,
  AlertCircle,
  CornerUpLeft,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Popover, MenuItem } from '@/components/ui/Popover';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { cn, tintFor } from '@/lib/utils';
import { formatTime } from '@/lib/time';
import { useApp } from './AppProvider';
import { MediaMessage } from './MediaMessage';
import type { Profile } from '@/lib/types/database';
import type { ChatMessage } from '@/hooks/useRealtimeMessages';

export type ReplySnippet = { name: string; text: string };

export function MessageBubble({
  message,
  isOwn,
  isGroup,
  sender,
  showSender,
  showAvatar,
  replySnippet,
  seen,
  previewUrl,
  animate,
  onReply,
}: {
  message: ChatMessage;
  isOwn: boolean;
  isGroup: boolean;
  sender?: Profile;
  showSender: boolean;
  showAvatar: boolean;
  replySnippet?: ReplySnippet;
  seen?: boolean;
  previewUrl?: string | null;
  /** Play the pop-in only for messages that arrive after first paint. */
  animate?: boolean;
  onReply: (m: ChatMessage) => void;
}) {
  const { supabase } = useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content ?? '');
  const [saving, setSaving] = useState(false);
  const [dragX, setDragX] = useState(0);
  const drag = useRef({ x: 0, y: 0, active: false });

  const isDeleted = !!message.deleted_at;
  const isMedia =
    message.type === 'image' ||
    message.type === 'video' ||
    message.type === 'file' ||
    message.type === 'audio';
  const senderName = sender?.display_name || sender?.username || 'Unknown';

  async function saveEdit() {
    const next = draft.trim();
    if (!next || next === message.content) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await supabase.rpc('edit_message', { _id: message.id, _content: next });
    setSaving(false);
    setEditing(false);
  }

  async function remove() {
    await supabase.rpc('delete_message', { _id: message.id });
  }

  // Swipe-to-reply (touch / mobile), directional like WhatsApp/Telegram:
  // incoming messages swipe RIGHT (dir +1), your own swipe LEFT (dir -1).
  const canSwipe = !isDeleted && !message._pending;
  const dir = isOwn ? -1 : 1;
  const TRIGGER = 52;
  function onTouchStart(e: React.TouchEvent) {
    if (!canSwipe) return;
    const t = e.touches[0];
    drag.current = { x: t.clientX, y: t.clientY, active: true };
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!drag.current.active) return;
    const t = e.touches[0];
    const dx = t.clientX - drag.current.x;
    const dy = t.clientY - drag.current.y;
    // Let vertical scroll win; only translate once the gesture is clearly horizontal.
    if (Math.abs(dy) > Math.abs(dx)) {
      drag.current.active = false;
      setDragX(0);
      return;
    }
    // Only engage in the allowed direction; a wrong-way drag stays put. The
    // result keeps `dir`'s sign so the bubble follows the finger and never
    // slides off-screen.
    const travel = Math.min(Math.max(dx * dir - 8, 0), 72);
    setDragX(travel > 0 ? travel * dir : 0);
  }
  function onTouchEnd() {
    if (drag.current.active && Math.abs(dragX) > TRIGGER) {
      navigator.vibrate?.(12);
      onReply(message);
    }
    drag.current.active = false;
    setDragX(0);
  }

  return (
    <div
      className={cn(
        'group relative flex w-full items-end gap-2',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        showAvatar || isOwn ? 'mt-2' : 'mt-0.5',
      )}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Swipe-to-reply hint — surfaces on the side the bubble is dragged from. */}
      {Math.abs(dragX) > 4 && (
        <span
          className={cn(
            'pointer-events-none absolute top-1/2 -translate-y-1/2 text-lime-deep',
            isOwn ? 'right-1' : 'left-1',
          )}
          style={{ opacity: Math.min(Math.abs(dragX) / TRIGGER, 1) }}
        >
          <Reply className="h-4 w-4" />
        </span>
      )}

      {/* Avatar gutter for incoming group messages */}
      {isGroup && !isOwn && (
        <div className="w-7 shrink-0">
          {showAvatar && <Avatar src={sender?.avatar_url} name={senderName} size="xs" />}
        </div>
      )}

      <div
        className={cn('flex max-w-[78%] flex-col sm:max-w-[68%]', isOwn ? 'items-end' : 'items-start')}
        style={{
          transform: dragX ? `translateX(${dragX}px)` : undefined,
          transition: drag.current.active ? 'none' : 'transform 0.18s ease-out',
        }}
      >
        {showSender && isGroup && !isOwn && (
          <span className={cn('mb-0.5 px-1 text-xs font-semibold', tintFor(senderName).split(' ')[1])}>
            {senderName}
          </span>
        )}

        <div
          className={cn(
            'relative rounded-2xl px-3 py-2 text-sm shadow-soft',
            animate && 'animate-bubble-in',
            isOwn ? 'bg-lime text-lime-ink' : 'bg-elevated text-fg',
            isOwn ? 'rounded-br-md' : 'rounded-bl-md',
            isMedia && !isDeleted && 'p-1.5',
          )}
        >
          {/* Reply quote */}
          {replySnippet && !isDeleted && (
            <div
              className={cn(
                'mb-1.5 flex items-start gap-1.5 rounded-lg border-l-2 px-2 py-1 text-xs',
                isOwn ? 'border-lime-ink/40 bg-black/10' : 'border-lime-deep/50 bg-black/5',
              )}
            >
              <CornerUpLeft className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
              <span className="min-w-0">
                <span className="block font-semibold opacity-80">{replySnippet.name}</span>
                <span className="line-clamp-2 opacity-70">{replySnippet.text}</span>
              </span>
            </div>
          )}

          {isDeleted ? (
            <span className="flex items-center gap-1.5 italic opacity-60">
              <Trash2 className="h-3.5 w-3.5" /> This message was deleted
            </span>
          ) : editing ? (
            <div className="w-[min(72vw,360px)]">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                className="bg-canvas text-fg"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    saveEdit();
                  }
                  if (e.key === 'Escape') setEditing(false);
                }}
              />
              <div className="mt-1.5 flex justify-end gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveEdit} loading={saving}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              {isMedia && (
                <MediaMessage
                  path={message.media_url}
                  type={message.type}
                  metadata={message.media_metadata}
                  previewUrl={previewUrl}
                />
              )}
              {message.content && (
                <p className={cn('whitespace-pre-wrap break-words', isMedia && 'px-1.5 pb-0.5 pt-1.5')}>
                  {message.content}
                </p>
              )}
            </>
          )}

          {/* Meta row */}
          {!editing && (
            <div
              className={cn(
                'mt-0.5 flex items-center justify-end gap-1 text-[10px]',
                isOwn ? 'text-lime-ink/75' : 'text-faint',
                isMedia && 'px-1.5 pb-0.5',
              )}
            >
              {message.edited_at && !isDeleted && <span>edited</span>}
              <span>{formatTime(message.created_at)}</span>
              {isOwn && message._pending && <Clock className="h-3 w-3" />}
              {isOwn && message._failed && <AlertCircle className="h-3 w-3 text-danger" />}
              {isOwn && !message._pending && !message._failed && !isDeleted && (
                <Check className="h-3 w-3" />
              )}
            </div>
          )}
        </div>

        {isOwn && seen && !isDeleted && <span className="mt-0.5 px-1 text-[10px] text-faint">Seen</span>}
        {isOwn && message._failed && (
          <span className="mt-0.5 px-1 text-[10px] text-danger">Failed to send</span>
        )}
      </div>

      {/* Hover actions */}
      {!editing && !isDeleted && !message._pending && (
        <div className="self-center opacity-0 transition-opacity group-hover:opacity-100">
          <Popover
            align={isOwn ? 'end' : 'start'}
            trigger={({ toggle }) => (
              <button
                onClick={toggle}
                className="focus-ring grid h-7 w-7 place-items-center rounded-full text-faint hover:bg-elevated hover:text-fg"
                aria-label="Message actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuItem
                  icon={<Reply className="h-4 w-4" />}
                  onClick={() => {
                    onReply(message);
                    close();
                  }}
                >
                  Reply
                </MenuItem>
                {message.content && (
                  <MenuItem
                    icon={<Copy className="h-4 w-4" />}
                    onClick={() => {
                      navigator.clipboard?.writeText(message.content ?? '');
                      close();
                    }}
                  >
                    Copy text
                  </MenuItem>
                )}
                {isOwn && message.type === 'text' && (
                  <MenuItem
                    icon={<Pencil className="h-4 w-4" />}
                    onClick={() => {
                      setDraft(message.content ?? '');
                      setEditing(true);
                      close();
                    }}
                  >
                    Edit
                  </MenuItem>
                )}
                {isOwn && (
                  <MenuItem
                    icon={<Trash2 className="h-4 w-4" />}
                    danger
                    onClick={() => {
                      remove();
                      close();
                    }}
                  >
                    Delete
                  </MenuItem>
                )}
              </>
            )}
          </Popover>
        </div>
      )}
    </div>
  );
}
