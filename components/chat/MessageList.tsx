'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { isSameDay, formatDayLabel } from '@/lib/time';
import { cn } from '@/lib/utils';
import { MessageBubble, type ReplySnippet } from './MessageBubble';
import type { Profile } from '@/lib/types/database';
import type { ChatMessage } from '@/hooks/useRealtimeMessages';

const CLUSTER_GAP_MS = 5 * 60 * 1000;

function DaySeparator({ iso }: { iso: string }) {
  return (
    <div className="my-3 flex items-center justify-center">
      <span className="rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-medium text-muted">
        {formatDayLabel(iso)}
      </span>
    </div>
  );
}

function SystemMessage({ text }: { text: string }) {
  return (
    <div className="my-2 flex justify-center">
      <span className="rounded-full bg-elevated/60 px-3 py-1 text-center text-xs text-muted">{text}</span>
    </div>
  );
}

export function MessageList({
  messages,
  me,
  profiles,
  isGroup,
  peerLastReadAt,
  initialLoaded,
  hasMore,
  loadingOlder,
  loadOlder,
  onReply,
  scrollToken,
}: {
  messages: ChatMessage[];
  me: Profile;
  profiles: Map<string, Profile>;
  isGroup: boolean;
  peerLastReadAt: string | null;
  initialLoaded: boolean;
  hasMore: boolean;
  loadingOlder: boolean;
  loadOlder: () => void;
  onReply: (m: ChatMessage) => void;
  scrollToken: number;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const prevHeight = useRef<number | null>(null);
  const [showJump, setShowJump] = useState(false);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottom.current = fromBottom < 120;
    setShowJump(fromBottom > 400);
    if (el.scrollTop < 140 && hasMore && !loadingOlder) {
      prevHeight.current = el.scrollHeight;
      loadOlder();
    }
  }

  // Maintain scroll position when prepending older pages / pin to bottom otherwise.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (prevHeight.current != null) {
      el.scrollTop = el.scrollHeight - prevHeight.current;
      prevHeight.current = null;
    } else if (atBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Snap to bottom once the first page lands.
  useEffect(() => {
    if (initialLoaded && scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
      atBottom.current = true;
    }
  }, [initialLoaded]);

  // Force-scroll to bottom after the user sends a message.
  useEffect(() => {
    if (scrollToken > 0 && scroller.current) {
      scroller.current.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
      atBottom.current = true;
    }
  }, [scrollToken]);

  function jumpToLatest() {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  const lastOwnIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender_id === me.id && !messages[i].deleted_at) return i;
    }
    return -1;
  })();

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scroller}
        onScroll={onScroll}
        className="h-full overflow-y-auto px-3 py-2 sm:px-6"
      >
        {!initialLoaded ? (
          <div className="grid h-full place-items-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            className="h-full"
            mascot
            title="Say hello"
            description="This is the very beginning of your conversation. Send the first message."
          />
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col pb-2">
            {hasMore && (
              <div className="flex justify-center py-2">
                {loadingOlder ? (
                  <Spinner className="h-4 w-4 text-muted" />
                ) : (
                  <button
                    onClick={loadOlder}
                    className="rounded-full px-3 py-1 text-xs text-muted hover:bg-elevated"
                  >
                    Load earlier messages
                  </button>
                )}
              </div>
            )}

            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const newDay = !prev || !isSameDay(prev.created_at, m.created_at);

              if (m.type === 'system') {
                const name = profiles.get(m.sender_id)?.display_name || profiles.get(m.sender_id)?.username || '';
                return (
                  <div key={m.id}>
                    {newDay && <DaySeparator iso={m.created_at} />}
                    <SystemMessage text={`${name} ${m.content ?? ''}`.trim()} />
                  </div>
                );
              }

              const isOwn = m.sender_id === me.id;
              const sender = profiles.get(m.sender_id);
              const clusteredPrev =
                prev &&
                prev.sender_id === m.sender_id &&
                prev.type !== 'system' &&
                isSameDay(prev.created_at, m.created_at) &&
                new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < CLUSTER_GAP_MS;
              const clusteredNext =
                next &&
                next.sender_id === m.sender_id &&
                next.type !== 'system' &&
                isSameDay(next.created_at, m.created_at) &&
                new Date(next.created_at).getTime() - new Date(m.created_at).getTime() < CLUSTER_GAP_MS;

              let replySnippet: ReplySnippet | undefined;
              if (m.reply_to) {
                const target = messages.find((x) => x.id === m.reply_to);
                if (target) {
                  const tName =
                    target.sender_id === me.id
                      ? 'You'
                      : profiles.get(target.sender_id)?.display_name ||
                        profiles.get(target.sender_id)?.username ||
                        'Unknown';
                  const tText = target.deleted_at
                    ? 'Deleted message'
                    : target.content ||
                      (target.type === 'image' ? 'Photo' : target.type === 'video' ? 'Video' : 'File');
                  replySnippet = { name: tName, text: tText };
                }
              }

              const seen =
                !isGroup &&
                i === lastOwnIndex &&
                !!peerLastReadAt &&
                new Date(peerLastReadAt).getTime() >= new Date(m.created_at).getTime();

              return (
                <div key={m.id}>
                  {newDay && <DaySeparator iso={m.created_at} />}
                  <MessageBubble
                    message={m}
                    isOwn={isOwn}
                    isGroup={isGroup}
                    sender={sender}
                    showSender={!clusteredPrev || newDay}
                    showAvatar={!clusteredNext}
                    replySnippet={replySnippet}
                    seen={seen}
                    previewUrl={m._previewUrl}
                    onReply={onReply}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={jumpToLatest}
        className={cn(
          'absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full border border-line bg-elevated text-fg shadow-pop transition-all',
          showJump ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0',
        )}
        aria-label="Jump to latest"
      >
        <ChevronDown className="h-5 w-5" />
      </button>
    </div>
  );
}
