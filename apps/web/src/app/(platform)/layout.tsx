import type { ReactNode } from 'react';
import Sidebar from '@/components/platform/sidebar';
import Topbar from '@/components/platform/topbar';

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen grid-cols-[260px_1fr]">
        <aside className="border-r bg-white">
          <Sidebar />
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="h-16 border-b bg-white">
            <Topbar />
          </header>

          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
