'use client';

import { LogOut, User } from 'lucide-react';
import type { Session } from 'next-auth';
import { signOut } from 'next-auth/react';

interface TopBarProps {
  user: Session['user'];
}

export function TopBar({ user }: TopBarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium text-foreground">{user?.name ?? user?.email ?? 'User'}</span>
        </div>
        <button
          onClick={() => void signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </header>
  );
}
