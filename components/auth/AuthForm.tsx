'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, AlertCircle, MailCheck, AtSign } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.7 34.5 27 35.5 24 35.5c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6.6 5.6C41.8 36.8 44 31 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function SolanaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M6.4 16.7c.1-.1.3-.2.5-.2h13.4c.3 0 .5.4.3.6l-2.6 2.6c-.1.1-.3.2-.5.2H4.1c-.3 0-.5-.4-.3-.6l2.6-2.6Zm0-9.4c.2-.1.3-.2.5-.2h13.4c.3 0 .5.4.3.6L18 10.3c-.1.1-.3.2-.5.2H4.1c-.3 0-.5-.4-.3-.6l2.6-2.6Zm11.2 4.7c-.1-.1-.3-.2-.5-.2H3.7c-.3 0-.5.4-.3.6l2.6 2.6c.1.1.3.2.5.2h13.4c.3 0 .5-.4.3-.6l-2.6-2.6Z" />
    </svg>
  );
}

function EthereumIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 2 6 12l6 3.5L18 12 12 2Zm0 15.2L6 13.7 12 22l6-8.3-6 3.5Z" />
    </svg>
  );
}

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/app';
  const initialError = params.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [web3Loading, setWeb3Loading] = useState<'solana' | 'ethereum' | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else {
        const handle = username.trim().toLowerCase();
        if (!/^[a-z0-9_]{2,24}$/.test(handle)) {
          throw new Error('Username must be 2–24 chars: lowercase letters, numbers or _');
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name || undefined, username: handle },
            emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        // The chosen handle rides in user metadata; handle_new_user (and
        // ensure_profile as a fallback) claim it with collision-safe suffixing.
        if (!data.session) {
          setEmailSent(true);
        } else {
          router.push(next);
          router.refresh();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleWeb3(chain: 'solana' | 'ethereum') {
    setError(null);
    setWeb3Loading(chain);
    try {
      const w = window as unknown as { solana?: unknown; ethereum?: unknown };
      const provider = chain === 'solana' ? w.solana : w.ethereum;
      if (!provider) {
        throw new Error(
          chain === 'solana'
            ? 'No Solana wallet found. Install Phantom and try again.'
            : 'No Ethereum wallet found. Install MetaMask and try again.',
        );
      }
      const statement = 'Sign in to TYPE';
      const { error } =
        chain === 'solana'
          ? await supabase.auth.signInWithWeb3({ chain: 'solana', statement })
          : await supabase.auth.signInWithWeb3({ chain: 'ethereum', statement });
      if (error) throw error;
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wallet sign-in failed');
    } finally {
      setWeb3Loading(null);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  if (emailSent) {
    return (
      <div className="animate-fade-in text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-lime/20 text-lime-deep">
          <MailCheck className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">Check your inbox</h2>
        <p className="mt-2 text-sm text-muted">
          We sent a confirmation link to <span className="text-fg">{email}</span>. Click it to finish
          creating your account.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm text-lime-deep hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full"
        onClick={handleGoogle}
        loading={googleLoading}
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => handleWeb3('solana')}
          loading={web3Loading === 'solana'}
        >
          <SolanaIcon />
          Solana
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => handleWeb3('ethereum')}
          loading={web3Loading === 'ethereum'}
        >
          <EthereumIcon />
          Ethereum
        </Button>
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-line" />
        or with email
        <span className="h-px flex-1 bg-line" />
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleEmail} className="space-y-3.5">
        {mode === 'signup' && (
          <>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                icon={<User className="h-4 w-4" />}
                placeholder="Ada Lovelace"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                required
                icon={<AtSign className="h-4 w-4" />}
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                autoComplete="off"
                maxLength={24}
              />
              <p className="mt-1 px-1 text-xs text-faint">
                People will find you as <span className="text-fg">@{username || 'username'}</span>
              </p>
            </div>
          </>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            icon={<Mail className="h-4 w-4" />}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            icon={<Lock className="h-4 w-4" />}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {mode === 'login' ? (
          <>
            New to TYPE?{' '}
            <Link href="/signup" className="text-lime-deep hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/login" className="text-lime-deep hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
