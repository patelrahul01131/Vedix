import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div className="flex h-screen w-full bg-[#0d0d0d] text-zinc-100 overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-[#0d0d0d] relative h-full">
        <Outlet />
      </main>
    </div>
  );
}
