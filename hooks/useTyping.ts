'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useApp } from '@/components/chat/AppProvider';

type Typer = { name: string; expires: number };
const EXPIRY_MS = 4500;
const THROTTLE_MS = 2000;

/** Ephemeral typing indicator for one conversation (broadcast, no DB). */
export function useTyping(conversationId: string) {
  const { supabase, me } = useApp();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribed = useRef(false);
  const lastSent = useRef(0);
  const typersRef = useRef(new Map<string, Typer>());
  const [typing, setTyping] = useState<string[]>([]);

  useEffect(() => {
    typersRef.current = new Map();
    setTyping([]);
    subscribed.current = false;

    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { broadcast: { self: false } },
    });
    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload?.user_id || payload.user_id === me.id) return;
        typersRef.current.set(payload.user_id, {
          name: payload.name ?? 'Someone',
          expires: Date.now() + EXPIRY_MS,
        });
        setTyping([...typersRef.current.values()].map((t) => t.name));
      })
      .on('broadcast', { event: 'stop' }, ({ payload }) => {
        if (!payload?.user_id) return;
        typersRef.current.delete(payload.user_id);
        setTyping([...typersRef.current.values()].map((t) => t.name));
      })
      .subscribe((status) => {
        subscribed.current = status === 'SUBSCRIBED';
      });
    channelRef.current = channel;

    const prune = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, t] of typersRef.current) {
        if (t.expires < now) {
          typersRef.current.delete(id);
          changed = true;
        }
      }
      if (changed) setTyping([...typersRef.current.values()].map((t) => t.name));
    }, 1000);

    return () => {
      clearInterval(prune);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, supabase, me.id]);

  const notifyTyping = useCallback(() => {
    if (!subscribed.current) return;
    const now = Date.now();
    if (now - lastSent.current < THROTTLE_MS) return;
    lastSent.current = now;
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: me.id, name: me.display_name || me.username },
    });
  }, [me.id, me.display_name, me.username]);

  const notifyStop = useCallback(() => {
    lastSent.current = 0;
    if (!subscribed.current) return;
    channelRef.current?.send({
      type: 'broadcast',
      event: 'stop',
      payload: { user_id: me.id },
    });
  }, [me.id]);

  return { typing, notifyTyping, notifyStop };
}
