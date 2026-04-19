/**
 * Toggle switch using Radix UI Switch. Accessible and reliable positioning.
 * Active: teal (#3B9BBF), Inactive: gray (#D1D5DB).
 */

import * as Switch from "@radix-ui/react-switch";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export default function Toggle({
  checked,
  onChange,
  disabled = false,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: ToggleProps) {
  return (
    <Switch.Root
      data-compact
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className="
        relative inline-flex h-7 w-12 shrink-0 rounded-full
        bg-skydark-toggle-track transition-colors duration-200
        data-[state=checked]:bg-skydark-accent
        focus:outline-none focus-visible:ring-2 focus-visible:ring-skydark-accent focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-60
        cursor-pointer
      "
    >
      <Switch.Thumb
        className="
          pointer-events-none absolute left-1 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-skydark-surface shadow-sm
          transition-[transform] duration-200 ease-out
          data-[state=unchecked]:translate-x-0
          data-[state=checked]:translate-x-[20px]
        "
      />
    </Switch.Root>
  );
}
