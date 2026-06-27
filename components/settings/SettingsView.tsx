'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Camera, Check, LogOut, AlertCircle } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useApp } from '@/components/chat/AppProvider';
import { uploadAvatar } from '@/lib/media';

export function SettingsView() {
  const { supabase, me } = useApp();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [avatar, setAvatar] = useState(me.avatar_url);
  const [displayName, setDisplayName] = useState(me.display_name ?? '');
  const [username, setUsername] = useState(me.username);
  const [bio, setBio] = useState(me.bio ?? '');
  const [status, setStatus] = useState(me.status ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(supabase, me.id, file);
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', me.id);
      if (error) throw error;
      setAvatar(url);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function save() {
    setError(null);
    const uname = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{2,24}$/.test(uname)) {
      setError('Username must be 2–24 characters: lowercase letters, numbers or underscores.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        username: uname,
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        status: status.trim() || null,
      })
      .eq('id', me.id);
    setSaving(false);
    if (error) {
      setError(
        error.code === '23505'
          ? 'That username is already taken.'
          : error.message || 'Could not save changes',
      );
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col bg-canvas">
      <header className="flex items-center gap-2 border-b border-line bg-surface/80 px-2 py-3 backdrop-blur sm:px-4">
        <Link href="/app" className="lg:hidden">
          <Button variant="ghost" size="icon" aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="px-1 text-lg font-bold tracking-tight">Settings</h1>
      </header>

      <div className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-5 py-7">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <Avatar src={avatar} name={displayName || username} size="xl" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="focus-ring absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-lime text-lime-ink shadow-glow-sm transition-transform hover:scale-105 disabled:opacity-60"
              aria-label="Change photo"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
          </div>
          <p className="mt-3 text-sm text-muted">{uploadingAvatar ? 'Uploading…' : 'Tap to change photo'}</p>
        </div>

        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="display">Display name</Label>
            <Input
              id="display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder="Your name"
            />
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              maxLength={24}
              placeholder="username"
            />
            <p className="mt-1 px-1 text-xs text-faint">People find you with @{username || 'username'}</p>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Input
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              maxLength={60}
              placeholder="Available"
            />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="A line about you"
            />
          </div>
        </div>

        <Button className="mt-6 w-full" size="lg" onClick={save} loading={saving}>
          {saved ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : (
            'Save changes'
          )}
        </Button>

        <form action="/auth/signout" method="post" className="mt-3">
          <Button type="submit" variant="ghost" className="w-full text-muted">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
