import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Compass,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Rocket,
  Users,
  X,
  GitCompareArrows,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCompare } from "../context/CompareContext";

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-violet-50 text-violet-700"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const { creators: compareList } = useCompare();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  const brandLinks = [
    { to: "/brand", label: "Dashboard", icon: LayoutDashboard },
    { to: "/discover", label: "Discover", icon: Compass },
    { to: "/briefs", label: "Briefs", icon: FileText },
    { to: "/projects", label: "Projects", icon: FolderKanban },
    { to: "/shortlist", label: "Shortlist", icon: Users },
  ];
  const creatorLinks = [
    { to: "/creator", label: "Dashboard", icon: LayoutDashboard },
    { to: "/discover", label: "Discover", icon: Compass },
    { to: "/creator/briefs", label: "Open Briefs", icon: FileText },
    { to: "/projects", label: "Projects", icon: FolderKanban },
  ];
  const guestLinks = [
    { to: "/discover", label: "Marketplace", icon: Compass },
    { to: "/login", label: "Log in", icon: null },
  ];

  const links = user
    ? user.role === "brand"
      ? brandLinks
      : creatorLinks
    : guestLinks;

  const onLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <nav className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm">
            <Rocket className="h-5 w-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">
            Creator<span className="text-violet-600">AI</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={linkCls}
              end={l.to === "/brand" || l.to === "/creator"}
            >
              {l.icon && <l.icon className="h-4 w-4" />}
              {l.label}
            </NavLink>
          ))}
          <NavLink to="/compare" className={linkCls}>
            <GitCompareArrows className="h-4 w-4" />
            Compare{compareList.length > 0 ? ` (${compareList.length})` : ""}
          </NavLink>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {!user && (
            <>
              <Link to="/login" className="btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="btn-primary">
                Get started
              </Link>
            </>
          )}
          {user && (
            <>
              {user.role === "brand" && (
                <Link to="/briefs/new" className="btn-primary">
                  <Plus className="h-4 w-4" /> New brief
                </Link>
              )}
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 py-1 pl-1 pr-3">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-sm font-bold text-white ${
                    user.role === "brand"
                      ? "from-indigo-500 to-violet-600"
                      : "from-fuchsia-500 to-violet-600"
                  }`}
                >
                  {user.full_name.charAt(0).toUpperCase()}
                </span>
                <div className="leading-tight">
                  <p className="text-xs font-semibold text-slate-800">
                    {user.full_name.split(" ")[0]}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">
                    {user.role}
                  </p>
                </div>
              </div>
              <button onClick={onLogout} className="btn-ghost" title="Log out">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        <button
          className="btn-ghost md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>


      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={linkCls}
                end={l.to === "/brand" || l.to === "/creator"}
              >
                {l.icon && <l.icon className="h-4 w-4" />}
                {l.label}
              </NavLink>
            ))}
            <NavLink to="/compare" className={linkCls}>
              <GitCompareArrows className="h-4 w-4" />
              Compare{compareList.length > 0 ? ` (${compareList.length})` : ""}
            </NavLink>
            <div className="mt-2 flex gap-2">
              {!user && (
                <>
                  <Link to="/login" className="btn-primary flex-1">
                    Log in
                  </Link>
                  <Link to="/register" className="btn-secondary flex-1">
                    Sign up
                  </Link>
                </>
              )}
              {user && (
                <button onClick={onLogout} className="btn-danger flex-1">
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

