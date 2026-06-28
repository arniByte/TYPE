'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/components/chat/AppProvider';
import type { Message } from '@/lib/types/database';

export type ChatMessage = Message & {
  _pending?: boolean;
  _failed?: boolean;
  /** Local blob URL shown while media is still uploading. */
  _previewUrl?: string | null;
};

const PAGE = 30;

function sortAsc(a: ChatMessage, b: ChatMessage) {
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
  return a.id < b.id ? -1 : 1;
}

/**
 * Live message state for one conversation.
 *
 * Correctness (from review):
 *  - Subscribe FIRST, buffer inbound rows, THEN fetch the initial page, then
 *    merge — de-duping by id so nothing is missed or doubled.
 *  - On reconnect / tab refocus, catch up on rows newer than what we hold.
 *  - Keyset pagination by (created_at, id) — never OFFSET.
 *  - Optimistic rows carry a client uuid; the realtime echo with the same id
 *    transparently replaces them.
 */
export function useRealtimeMessages(conversationId: string) {
  const { supabase } = useApp();
  const mapRef = useRef(new Map<string, ChatMessage>());
  const listRef = useRef<ChatMessage[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const sync = useCallback(() => {
    const arr = Array.from(mapRef.current.values()).sort(sortAsc);
    listRef.current = arr;
    setMessages(arr);
  }, []);

  /** Upsert authoritative DB rows (clears any optimistic flags for that id). */
  const upsertReal = useCallback(
    (rows: Message[]) => {
      let changed = false;
      for (const r of rows) {
        if (!r?.id) continue;
        mapRef.current.set(r.id, { ...r });
        changed = true;
      }
      if (changed) sync();
    },
    [sync],
  );

  const addPending = useCallback(
    (msg: ChatMessage) => {
      mapRef.current.set(msg.id, { ...msg, _pending: true, _failed: false });
      sync();
    },
    [sync],
  );

  const markFailed = useCallback(
    (id: string) => {
      const m = mapRef.current.get(id);
      if (m) {
        mapRef.current.set(id, { ...m, _pending: false, _failed: true });
        sync();
      }
    },
    [sync],
  );

  const removeLocal = useCallback(
    (id: string) => {
      if (mapRef.current.delete(id)) sync();
    },
    [sync],
  );

  // Subscribe + initial load + catch-up, reset when the conversation changes.
  useEffect(() => {
    mapRef.current = new Map();
    listRef.current = [];
    setMessages([]);
    setInitialLoaded(false);
    setHasMore(false);

    let buffer: Message[] = [];
    let ready = false;
    let firstLoadDone = false;
    let cancelled = false;

    const fetchLatest = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE);
      if (cancelled) return;
      const rows = (data ?? []).slice().reverse();
      upsertReal(rows);
      setHasMore((data?.length ?? 0) === PAGE);
    };

    // On reconnect / refocus, heal two kinds of gap: (1) inserts we missed
    // while disconnected, and (2) edits / soft-deletes applied to recently
    // visible messages (which a "newer than newest" query alone would miss).
    const catchUp = async () => {
      const prevNewest = listRef.current[listRef.current.length - 1];
      if (!prevNewest) return fetchLatest();
      // (1) all rows newer than what we hold — overflow-safe for long gaps
      const { data: newer } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .gt('created_at', prevNewest.created_at)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(500);
      if (!cancelled) upsertReal(newer ?? []);
      // (2) re-pull the latest page to absorb edits / soft-deletes
      const { data: latest } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE);
      if (!cancelled) upsertReal(latest ?? []);
    };

    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as Message;
          if (!row?.id) return; // soft-delete is an UPDATE; hard deletes ignored
          if (!ready) buffer.push(row);
          else upsertReal([row]);
        },
      )
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED' || cancelled) return;
        if (!firstLoadDone) {
          await fetchLatest();
          if (cancelled) return;
          upsertReal(buffer); // flush rows that arrived during the fetch
          buffer = [];
          ready = true;
          firstLoadDone = true;
          setInitialLoaded(true);
        } else {
          // reconnect → heal any gap
          await catchUp();
        }
      });

    const onVisible = () => {
      if (document.visibilityState === 'visible' && firstLoadDone) catchUp();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase, upsertReal]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore) return;
    const oldest = listRef.current[0];
    if (!oldest) return;
    const beforeOldestId = oldest.id;
    setLoadingOlder(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .or(`created_at.lt.${oldest.created_at},and(created_at.eq.${oldest.created_at},id.lt.${oldest.id})`)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(PAGE);
    upsertReal((data ?? []).slice().reverse());
    // Guard against a no-progress loop: if the oldest row didn't move back,
    // there is nothing older to load.
    const advanced = listRef.current[0]?.id !== beforeOldestId;
    setHasMore(advanced && (data?.length ?? 0) === PAGE);
    setLoadingOlder(false);
  }, [conversationId, supabase, hasMore, loadingOlder, upsertReal]);

  return { messages, initialLoaded, hasMore, loadingOlder, loadOlder, addPending, markFailed, removeLocal };
}
