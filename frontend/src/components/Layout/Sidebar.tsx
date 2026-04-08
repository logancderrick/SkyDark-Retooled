import { NavLink } from "react-router-dom";
import {
  CalendarIcon,
  ListsIcon,
  CheckIcon,
  StarIcon,
  PhotosIcon,
  SettingsIcon,
} from "./SidebarIcons";
import skydarkLogo from "../../assets/skydark-logo.png";

export const navItems = [
  { path: "/calendar", label: "Calendar", Icon: CalendarIcon },
  { path: "/lists", label: "Lists", Icon: ListsIcon },
  { path: "/tasks", label: "Chores", Icon: CheckIcon },
  { path: "/rewards", label: "Rewards", Icon: StarIcon },
  { path: "/photos", label: "Photos", Icon: PhotosIcon },
  { path: "/settings", label: "Settings", Icon: SettingsIcon },
];

export default function Sidebar() {
  return (
    <aside
      className="hidden md:flex flex-col items-center py-4 flex-shrink-0 border-r border-gray-200 bg-white w-20"
      style={{ width: 80 }}
      aria-label="Main navigation"
    >
      <div className="mb-4 flex items-center justify-center w-12 h-12" aria-hidden>
        <img src={skydarkLogo} alt="" className="max-w-full max-h-full object-contain" />
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
                  : "text-skydark-text-secondary hover:bg-gray-100"
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
