'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Send, X, Image as ImageIcon, Film, CornerUpLeft, Loader2, Mic, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn, formatBytes } from '@/lib/utils';
import { uploadMedia, messageTypeForFile, MAX_FILE_BYTES } from '@/lib/media';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useApp } from './AppProvider';
import type { ChatMessage } from '@/hooks/useRealtimeMessages';

function fmtClock(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export type ReplyTarget = { id: string; name: string; text: string } | null;

export function Composer({
  conversationId,
  reply,
  onCancelReply,
  addPending,
  markFailed,
  onSent,
  notifyTyping,
  notifyStop,
}: {
  conversationId: string;
  reply: ReplyTarget;
  onCancelReply: () => void;
  addPending: (m: ChatMessage) => void;
  markFailed: (id: string) => void;
  onSent: () => void;
  notifyTyping: () => void;
  notifyStop: () => void;
}) {
  const { supabase, me } = useApp();
  const [value, setValue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceRecorder();

  // Stable image thumbnails (avoid creating a fresh blob URL on every render).
  const filePreviews = useMemo(
    () => files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null)),
    [files],
  );
  useEffect(() => {
    return () => filePreviews.forEach((u) => u && URL.revokeObjectURL(u));
  }, [filePreviews]);

  // Clear the typing indicator when leaving the conversation.
  useEffect(() => () => notifyStop(), [notifyStop]);

  function autoresize() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    const tooBig = picked.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) setError(`“${tooBig.name}” is over 50 MB.`);
    setFiles((prev) => [...prev, ...picked.filter((f) => f.size <= MAX_FILE_BYTES)].slice(0, 8));
    e.target.value = '';
  }

  function newMessage(partial: Partial<ChatMessage>): ChatMessage {
    return {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender_id: me.id,
      content: null,
      type: 'text',
      media_url: null,
      media_metadata: null,
      reply_to: null,
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null,
      ...partial,
    };
  }

  async function handleSend() {
    const text = value.trim();
    if (!text && files.length === 0) return;
    setError(null);
    notifyStop();

    const sendFiles = files;
    const replyId = reply?.id ?? null;
    let replyUsed = false;

    setValue('');
    setFiles([]);
    if (taRef.current) taRef.current.style.height = 'auto';
    onCancelReply();

    // Media messages first. Show an optimistic bubble with a local preview
    // immediately, then upload — so a failed upload surfaces a retryable
    // bubble instead of silently vanishing.
    if (sendFiles.length) {
      setUploading(true);
      for (const file of sendFiles) {
        const previewUrl = URL.createObjectURL(file);
        const type = messageTypeForFile(file);
        const msg = newMessage({ type, media_url: null, reply_to: replyUsed ? null : replyId });
        msg._previewUrl = previewUrl;
        replyUsed = true;
        addPending(msg);
        onSent();
        try {
          const { path, metadata } = await uploadMedia(supabase, conversationId, me.id, file);
          const { error: insErr } = await supabase.from('messages').insert({
            id: msg.id,
            conversation_id: conversationId,
            sender_id: me.id,
            type,
            media_url: path,
            media_metadata: metadata,
            reply_to: msg.reply_to,
          });
          if (insErr) markFailed(msg.id);
        } catch (err) {
          markFailed(msg.id);
          setError(err instanceof Error ? err.message : 'Upload failed');
        }
      }
      setUploading(false);
    }

    // Then the text.
    if (text) {
      const msg = newMessage({ content: text, type: 'text', reply_to: replyUsed ? null : replyId });
      addPending(msg);
      onSent();
      const { error: insErr } = await supabase.from('messages').insert({
        id: msg.id,
        conversation_id: conversationId,
        sender_id: me.id,
        content: text,
        type: 'text',
        reply_to: msg.reply_to,
      });
      if (insErr) markFailed(msg.id);
    }
  }

  async function startVoice() {
    setError(null);
    const ok = await voice.start();
    if (!ok) setError('Microphone access was denied.');
  }

  async function sendVoice() {
    const secs = voice.seconds;
    const blob = await voice.stop();
    if (!blob || blob.size < 600) {
      setError('Hold on a little longer to record a voice message.');
      return;
    }
    const ext = /mp4|m4a|aac/.test(blob.type) ? 'm4a' : 'webm';
    const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type || 'audio/webm' });
    const previewUrl = URL.createObjectURL(blob);
    const replyId = reply?.id ?? null;
    const msg = newMessage({ type: 'audio', reply_to: replyId });
    msg._previewUrl = previewUrl;
    onCancelReply();
    addPending(msg);
    onSent();
    setUploading(true);
    try {
      const { path, metadata } = await uploadMedia(supabase, conversationId, me.id, file);
      const { error: insErr } = await supabase.from('messages').insert({
        id: msg.id,
        conversation_id: conversationId,
        sender_id: me.id,
        type: 'audio',
        media_url: path,
        media_metadata: { ...metadata, duration: secs },
        reply_to: msg.reply_to,
      });
      if (insErr) markFailed(msg.id);
    } catch (err) {
      markFailed(msg.id);
      setError(err instanceof Error ? err.message : 'Could not send voice message');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="border-t border-line bg-surface px-3 pb-safe pt-2 sm:px-4">
      {/* Reply bar */}
      {reply && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border-l-2 border-lime bg-elevated px-3 py-2 text-sm">
          <CornerUpLeft className="h-4 w-4 shrink-0 text-lime-deep" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-lime-deep">Replying to {reply.name}</p>
            <p className="truncate text-xs text-muted">{reply.text}</p>
          </div>
          <button onClick={onCancelReply} className="text-faint hover:text-fg" aria-label="Cancel reply">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* File previews */}
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="group relative flex items-center gap-2 rounded-xl border border-line bg-elevated p-1.5 pr-2.5"
            >
              <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg bg-canvas text-muted">
                {f.type.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={filePreviews[i] ?? ''} alt={f.name} className="h-full w-full object-cover" />
                ) : f.type.startsWith('video/') ? (
                  <Film className="h-4 w-4" />
                ) : (
                  <ImageIcon className="h-4 w-4" />
                )}
              </span>
              <span className="max-w-[120px]">
                <span className="block truncate text-xs font-medium">{f.name}</span>
                <span className="block text-[10px] text-faint">{formatBytes(f.size)}</span>
              </span>
              <button
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                className="ml-1 text-faint hover:text-fg"
                aria-label="Remove file"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mb-2 px-1 text-xs text-danger">{error}</p>}

      {voice.recording ? (
        <div className="flex items-center gap-2 animate-fade-in">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full text-danger"
            onClick={voice.cancel}
            aria-label="Cancel recording"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
          <div className="flex h-11 flex-1 items-center gap-2.5 rounded-2xl border border-line bg-elevated px-4">
            <span className="h-2.5 w-2.5 rounded-full bg-danger animate-rec-pulse" />
            <span className="text-sm font-semibold tabular-nums">{fmtClock(voice.seconds)}</span>
            <span className="hidden truncate text-xs text-muted sm:inline">Recording — tap send to share</span>
          </div>
          <Button
            size="icon"
            className="shrink-0 rounded-full"
            onClick={sendVoice}
            disabled={uploading}
            aria-label="Send voice message"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={onPick}
          />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full"
            onClick={() => fileRef.current?.click()}
            aria-label="Attach photo or video"
          >
            <Plus className="h-5 w-5" />
          </Button>

          <textarea
            ref={taRef}
            value={value}
            rows={1}
            placeholder="Type a message"
            onChange={(e) => {
              setValue(e.target.value);
              autoresize();
              notifyTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="focus-ring max-h-40 min-h-[44px] flex-1 resize-none rounded-2xl border border-line bg-elevated px-4 py-2.5 text-sm text-fg placeholder:text-faint focus:border-lime-deep/60"
          />

          {value.trim() || files.length > 0 ? (
            <Button
              size="icon"
              className="shrink-0 rounded-full"
              onClick={handleSend}
              disabled={uploading}
              aria-label="Send"
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full"
              onClick={startVoice}
              aria-label="Record voice message"
            >
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
