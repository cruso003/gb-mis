'use client';

import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

export function LoginContent() {
  const params = useSearchParams();
  const callbackUrl = params?.get('callbackUrl') ?? '/dashboard';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-accent/5">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-card p-10 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <span className="text-2xl font-bold text-primary-foreground">GB</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            GB MIS
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ministry of Gender, Children and Social Protection
          </p>
          <p className="text-xs text-muted-foreground">Republic of Liberia</p>
        </div>

        <button
          onClick={() => void signIn('keycloak', { callbackUrl })}
          className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Sign in with MOGCSP Account
        </button>

        <p className="text-center text-xs text-muted-foreground">
          This system contains sensitive data. Access is restricted to authorised MOGCSP personnel.
          All activity is logged.
        </p>
      </div>
    </main>
  );
}
