import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = { title: 'Create account' };

export default function SignupPage() {
  return (
    <AuthShell title="Create your account" subtitle="It takes less than a minute. Free forever.">
      <Suspense fallback={<div className="h-64" />}>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
