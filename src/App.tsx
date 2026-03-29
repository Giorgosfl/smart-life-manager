import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/devices", label: "Devices", icon: "\uD83D\uDCA1" },
  { to: "/scenes", label: "Scenes", icon: "\uD83C\uDFAC" },
  { to: "/automations", label: "Automations", icon: "\u26A1" },
  { to: "/timers", label: "Timers", icon: "\u23F0" },
  { to: "/mirrors", label: "Mirrors", icon: "\uD83E\uDE9E" },
  { to: "/killswitch", label: "Kill Switch", icon: "\uD83D\uDED1" },
  { to: "/settings", label: "Settings", icon: "\u2699\uFE0F" },
];

export default function App() {
  return (
    <>
      <nav className="w-56 shrink-0 border-r border-card-border bg-card p-4 flex flex-col gap-1 min-h-screen">
        <span className="text-lg font-bold mb-4 px-3 py-2 text-foreground">
          Smart Life
        </span>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-background hover:text-foreground"
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </>
  );
}
