"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { setTheme } from "@/lib/actions";

const OPTIONS = [
  { value: "light", icon: Sun, label: "Clair" },
  { value: "system", icon: Monitor, label: "Système" },
  { value: "dark", icon: Moon, label: "Sombre" },
] as const;

export function ThemeToggle({ current }: { current: "system" | "light" | "dark" }) {
  return (
    <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Thème">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={current === value}
          onClick={() => setTheme(value)}
          className={`flex-1 rounded-md p-1.5 ${current === value ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"}`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
