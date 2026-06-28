'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AtSign, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usernameToEmail, isValidUsername, cleanUsername } from '@/lib/auth';

/**
 * One-step username + password auth, right on the landing page.
 * Sign up binds your @handle forever; logging in uses the same handle.
 */
export function QuickAuth() {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidUsername(username)) {
      setError('Pick a handle: 2–24 letters, numbers or _');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const email = usernameToEmail(username);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: cleanUsername(username) } },
        });
        if (error) {
          throw new Error(
            /registered|exists/i.test(error.message) ? 'That @handle is taken — try another' : error.message,
          );
        }
        if (!data.session) {
          throw new Error('Almost there — turn off “Confirm email” in Supabase to enable instant sign-up.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw new Error('Wrong handle or password');
        }
      }
      router.push('/app');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm animate-slide-in-up rounded-3xl border border-line bg-surface p-5 shadow-soft">
      <form onSubmit={submit} className="space-y-2.5">
        <Input
          icon={<AtSign className="h-4 w-4" />}
          placeholder="yourhandle"
          value={username}
          onChange={(e) => setUsername(cleanUsername(e.target.value))}
          autoComplete="username"
          aria-label="Username"
          autoFocus
        />
        <Input
          type="password"
          icon={<Lock className="h-4 w-4" />}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          aria-label="Password"
        />
        {error && (
          <p className="flex items-start gap-1.5 px-1 text-xs text-danger">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {mode === 'signup' ? 'Claim your @handle' : 'Log in'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <div className="mt-3 flex items-center justify-between px-1 text-xs">
        <button
          onClick={() => {
            setMode((m) => (m === 'signup' ? 'login' : 'signup'));
            setError(null);
          }}
          className="text-muted hover:text-fg"
        >
          {mode === 'signup' ? 'Already have a handle? Log in' : 'New here? Create a handle'}
        </button>
        <Link href={mode === 'signup' ? '/signup' : '/login'} className="text-lime-deep hover:underline">
          More sign-in options
        </Link>
      </div>
    </div>
  );
}
