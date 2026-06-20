import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <section className="flex-1 p-7 overflow-auto">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
