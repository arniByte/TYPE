'use client';

import { useState } from 'react';
import { Download, FileText, Play, AlertCircle } from 'lucide-react';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { Spinner } from '@/components/ui/Spinner';
import { formatBytes } from '@/lib/utils';
import type { MediaMetadata, MessageType } from '@/lib/types/database';

/** Constrain a media box so tall/wide assets stay tidy without layout shift. */
function boxStyle(meta: MediaMetadata | null) {
  const w = meta?.width ?? 0;
  const h = meta?.height ?? 0;
  if (!w || !h) return { aspectRatio: '4 / 3', maxWidth: 320 };
  const ratio = w / h;
  const maxW = 320;
  const maxH = 380;
  let width = Math.min(maxW, w);
  let height = width / ratio;
  if (height > maxH) {
    height = maxH;
    width = height * ratio;
  }
  return { width, height };
}

export function MediaMessage({
  path,
  type,
  metadata,
  previewUrl,
}: {
  path: string | null;
  type: MessageType;
  metadata: MediaMetadata | null;
  /** Local blob URL for an optimistic (still-uploading) message. */
  previewUrl?: string | null;
}) {
  const { url: signed, refresh } = useSignedUrl(previewUrl ? null : path);
  const url = previewUrl ?? signed;
  const [errored, setErrored] = useState(false);

  if (type === 'file') {
    return (
      <a
        href={url ?? undefined}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-xl border border-line bg-elevated p-2.5 pr-4 transition-colors hover:bg-hover"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-lime/20 text-lime-deep">
          <FileText className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{metadata?.name ?? 'Attachment'}</span>
          <span className="block text-xs opacity-70">{formatBytes(metadata?.size ?? 0)}</span>
        </span>
        <Download className="ml-auto h-4 w-4 shrink-0 opacity-70" />
      </a>
    );
  }

  const style = boxStyle(metadata);

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-elevated"
      style={{ ...style, maxWidth: '100%' }}
    >
      {!url && !errored && (
        <div className="absolute inset-0 grid place-items-center text-muted">
          <Spinner className="h-5 w-5" />
        </div>
      )}
      {errored && (
        <button
          onClick={() => {
            setErrored(false);
            refresh();
          }}
          className="absolute inset-0 grid place-items-center gap-1 text-xs text-muted"
        >
          <AlertCircle className="h-5 w-5" />
          Tap to retry
        </button>
      )}
      {url && type === 'image' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={metadata?.name ?? 'image'}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setErrored(true)}
        />
      )}
      {url && type === 'video' && (
        <video
          src={url}
          controls
          playsInline
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        >
          <track kind="captions" />
        </video>
      )}
      {!url && type === 'video' && (
        <div className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-black/50">
          <Play className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
