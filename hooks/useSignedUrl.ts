'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/components/chat/AppProvider';
import { getSignedUrl } from '@/lib/media';

// Module-level cache shared by all media renderers.
const cache = new Map<string, { url: string; expires: number }>();
const TTL = 1000 * 60 * 60 * 2; // 2h, matches getSignedUrl default

function cached(path: string | null | undefined): string | null {
  if (!path) return null;
  const hit = cache.get(path);
  return hit && hit.expires > Date.now() ? hit.url : null;
}

export function useSignedUrl(path: string | null | undefined) {
  const { supabase } = useApp();
  const [url, setUrl] = useState<string | null>(() => cached(path));

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    const hit = cache.get(path);
    if (hit && hit.expires > Date.now()) {
      setUrl(hit.url);
      return;
    }
    (async () => {
      const signed = await getSignedUrl(supabase, path);
      if (cancelled || !signed) return;
      cache.set(path, { url: signed, expires: Date.now() + TTL });
      setUrl(signed);
    })();
    return () => {
      cancelled = true;
    };
  }, [path, supabase]);

  // Called on <img>/<video> error — force a fresh signed URL.
  const refresh = useCallback(() => {
    if (!path) return;
    cache.delete(path);
    (async () => {
      const signed = await getSignedUrl(supabase, path);
      if (signed) {
        cache.set(path, { url: signed, expires: Date.now() + TTL });
        setUrl(signed);
      }
    })();
  }, [path, supabase]);

  return { url, refresh };
}
