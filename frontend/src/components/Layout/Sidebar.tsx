import { NavLink } from "react-router-dom";
import {
  CalendarIcon,
  ListsIcon,
  CheckIcon,
  StarIcon,
  PhotosIcon,
  CameraIcon,
  SettingsIcon,
} from "./SidebarIcons";
import { publicLogoUrl } from "../../lib/branding";

export const navItems = [
  { path: "/calendar", label: "Calendar", Icon: CalendarIcon },
  { path: "/lists", label: "Lists", Icon: ListsIcon },
  { path: "/tasks", label: "Chores", Icon: CheckIcon },
  { path: "/rewards", label: "Rewards", Icon: StarIcon },
  { path: "/photos", label: "Photos", Icon: PhotosIcon },
  { path: "/cameras", label: "Cameras", Icon: CameraIcon },
  { path: "/settings", label: "Settings", Icon: SettingsIcon },
];

export default function Sidebar() {
  return (
    <aside
      className="hidden md:flex flex-col items-center py-4 flex-shrink-0 border-r border-skydark-border bg-skydark-surface w-20"
      style={{ width: 80 }}
      aria-label="Main navigation"
    >
      <div className="mb-4 flex items-center justify-center w-12 h-12" aria-hidden>
        <img src={publicLogoUrl} alt="" className="max-w-full max-h-full object-contain" width={48} height={48} />
      </div>
      <nav className="flex flex-col items-center gap-1 w-full" aria-label="Main">
        {navItems.map(({ path, label, Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
                isActive
                  ? "bg-[rgba(59,155,191,0.1)] text-skydark-accent"
                  : "text-skydark-text-secondary hover:bg-skydark-surface-muted"
              }`
            }
            title={label}
            aria-label={label}
          >
            <Icon />
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
