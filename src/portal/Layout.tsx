import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useClientAppStore } from "../store/useClientAppStore";
import { portalApiService } from "../api/portalService";

// Deliberately its own, simpler chrome rather than reusing admin/Layout.tsx
// or employee/Layout.tsx - those pull in staff-only pieces (useAppStore,
// the avatar/account Menu, admin-role-aware Drawer) that have no meaning
// for a client session.
const navItems = [
  { to: "/portal/orders", label: "My Orders" },
  { to: "/portal/billing", label: "Billing" },
  { to: "/portal/submit-job", label: "Submit a Job" },
  { to: "/portal/job-requests", label: "My Requests" },
];

export default function PortalLayout() {
  const { clientUser, clearClientUser } = useClientAppStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await portalApiService.post("/client-auth/logout");
    } finally {
      clearClientUser();
      navigate("/portal/login");
    }
  };

  return (
    <div className="min-h-screen bg-blue-50/50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/images/logo.webp" alt="" className="h-8 w-auto" />
            <img src="/images/logo_text.webp" alt="Zybrannox" className="h-5 w-auto" />
          </div>

          <nav className="flex items-center gap-1 flex-wrap">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-blue-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-900">
                {clientUser?.firstName} {clientUser?.lastName}
              </div>
              {clientUser?.companyName && (
                <div className="text-xs text-slate-500">{clientUser.companyName}</div>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
