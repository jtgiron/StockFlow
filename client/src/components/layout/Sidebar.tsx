import { NavLink } from "react-router";
import { useAuth } from "../../contexts/AuthContext";

const navGroups = [
  {
    label: "Ventas",
    items: [
      {
        to: "/",
        label: "Dashboard",
        icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
        roles: ["admin", "employee"],
        end: true,
      },
      {
        to: "/pos",
        label: "Punto de Venta",
        icon: "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z",
        roles: ["admin", "employee"],
        end: false,
      },
    ],
  },
  {
    label: "Inventario",
    items: [
      {
        to: "/products",
        label: "Productos",
        icon: "M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z",
        roles: ["admin", "employee"],
        end: false,
      },
      {
        to: "/categories",
        label: "Categorías",
        icon: "M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z M6 6h.008v.008H6V6z",
        roles: ["admin"],
        end: false,
      },
      {
        to: "/stock",
        label: "Stock",
        icon: "M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.429 9.75m11.142 0l4.179 2.25-9.75 5.25-9.75-5.25 4.179-2.25",
        roles: ["admin", "employee"],
        end: false,
      },
      {
        to: "/price-lists",
        label: "Listas de Precios",
        icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
        roles: ["admin"],
        end: false,
      },
    ],
  },
  {
    label: "Finanzas",
    items: [
      {
        to: "/cash-register",
        label: "Caja",
        icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
        roles: ["admin", "employee"],
        end: false,
      },
      {
        to: "/credits",
        label: "Fiados",
        icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
        roles: ["admin", "employee"],
        end: false,
      },
      {
        to: "/reports",
        label: "Reportes",
        icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
        roles: ["admin"],
        end: false,
      },
    ],
  },
  {
    label: "Administración",
    items: [
      {
        to: "/users",
        label: "Usuarios",
        icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
        roles: ["admin"],
        end: false,
      },
    ],
  },
];

export default function Sidebar() {
  const { role, profile, signOut, isAdmin } = useAuth();
  const appVersion = import.meta.env.VITE_APP_VERSION;

  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => role && item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-surface-900 border-r border-surface-800 flex flex-col z-30">
      {/* Logo */}
      <div className="px-5 py-4.5 border-b border-surface-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
          </div>
          <div>
            <span className="text-2xl font-semibold text-surface-50 font-display tracking-tight leading-none block">
              StockFlow
            </span>
            <span className="text-sm text-surface-600 leading-none block mt-0.5">
              Sistema de gestión
            </span>
            <span className="text-[14px] text-surface-500 leading-none block mt-1">
              v{appVersion}
            </span>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-5">
          {filteredGroups.map((group, gi) => (
            <div key={gi}>
              <p className="text-xs font-semibold text-surface-600 uppercase tracking-widest px-3 mb-1.5">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-base transition-colors duration-150 ${
                          isActive
                            ? "bg-amber-500/10 text-amber-400 font-medium [box-shadow:inset_3px_0_0_0_#f59e0b]"
                            : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/60"
                        }`
                      }
                    >
                      <svg
                        className="w-5 h-5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d={item.icon}
                        />
                      </svg>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-surface-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-sm font-bold text-amber-400 shrink-0">
              {profile?.full_name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-surface-200 truncate leading-none">
                {profile?.full_name ?? "Usuario"}
              </p>
              <p className="text-xs text-surface-500 mt-0.5">
                {isAdmin ? "Admin" : "Empleado"}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            title="Cerrar sesión"
            className="p-1.5 text-surface-500 hover:text-surface-300 hover:bg-surface-800 rounded-lg transition-colors shrink-0"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
