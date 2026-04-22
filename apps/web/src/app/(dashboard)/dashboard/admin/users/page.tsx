import { auth } from '../../../../../auth';
import { apiClient } from '../../../../../lib/api-client';
import type { Paginated } from '@gb-mis/types';

interface UserRow {
  id: string;
  displayName: string | null;
  status: string;
  createdAt: string;
  roles: Array<{ role: string }>;
}

export const metadata = { title: 'User Management — GB MIS' };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;

  const query = new URLSearchParams();
  if (sp.page) query.set('page', sp.page);
  if (sp.search) query.set('search', sp.search);
  query.set('limit', '20');

  const data = await apiClient
    .get<Paginated<UserRow>>(`/users?${query.toString()}`, session?.accessToken)
    .catch(() => ({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">{data.total} users in system</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Roles</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Since</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.items.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{u.displayName ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <span
                        key={r.role}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                      >
                        {r.role}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.status}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            No users found.
          </div>
        )}
      </div>
    </div>
  );
}
