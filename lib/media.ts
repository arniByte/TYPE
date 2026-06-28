import type { SupabaseClient } from '@supabase/supabase-js';
import type { MediaMetadata, MessageType } from '@/lib/types/database';

type Client = SupabaseClient;

export const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB (free-tier friendly)

export function messageTypeForFile(file: File): Exclude<MessageType, 'text' | 'system'> {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'file';
}

function extFor(file: File): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop() : '';
  return (fromName || file.type.split('/')[1] || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Best-effort intrinsic dimensions / duration so the UI can reserve space. */
export async function probeMedia(file: File): Promise<MediaMetadata> {
  const base: MediaMetadata = { size: file.size, name: file.name, mime: file.type };
  try {
    if (file.type.startsWith('image/')) {
      const bitmap = await createImageBitmap(file);
      base.width = bitmap.width;
      base.height = bitmap.height;
      bitmap.close();
    } else if (file.type.startsWith('video/')) {
      const meta = await readVideoMeta(file);
      Object.assign(base, meta);
    }
  } catch {
    /* dimensions are optional */
  }
  return base;
}

function readVideoMeta(file: File): Promise<MediaMetadata> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const meta = {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Math.round(video.duration),
      };
      URL.revokeObjectURL(url);
      resolve(meta);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
    video.src = url;
  });
}

export type UploadResult = { path: string; type: MessageType; metadata: MediaMetadata };

export async function uploadMedia(
  supabase: Client,
  conversationId: string,
  userId: string,
  file: File,
): Promise<UploadResult> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('File is too large (max 50 MB).');
  }
  const metadata = await probeMedia(file);
  const path = `${conversationId}/${userId}/${crypto.randomUUID()}.${extFor(file)}`;
  const { error } = await supabase.storage.from('media').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return { path, type: messageTypeForFile(file), metadata };
}

/** Private bucket → short-lived signed URL for rendering. */
export async function getSignedUrl(
  supabase: Client,
  path: string,
  expiresIn = 60 * 60 * 2,
): Promise<string | null> {
  const { data, error } = await supabase.storage.from('media').createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Avatars live in a public bucket — derive the URL directly. */
export async function uploadAvatar(supabase: Client, userId: string, file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error('Avatar must be under 5 MB.');
  const path = `${userId}/${crypto.randomUUID()}.${extFor(file)}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}
