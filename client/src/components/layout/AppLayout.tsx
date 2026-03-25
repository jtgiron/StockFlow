import { Outlet } from "react-router";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-surface-950">
      <Sidebar />
      <div className="ml-64">
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
