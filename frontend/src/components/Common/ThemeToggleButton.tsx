import { useAppContext } from "../../contexts/AppContext";

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

interface ThemeToggleButtonProps {
  className?: string;
}

export default function ThemeToggleButton({ className = "" }: ThemeToggleButtonProps) {
  const { settings, setSettings } = useAppContext();
  const isDark = settings.themePreference === "dark";

  return (
    <button
      type="button"
      data-compact
      onClick={() => setSettings({ themePreference: isDark ? "light" : "dark" })}
      className={`p-2 rounded-lg text-skydark-text-secondary hover:bg-skydark-surface-muted hover:text-skydark-text focus:outline-none focus:ring-2 focus:ring-skydark-accent shrink-0 ${className}`}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
    </button>
  );
}
