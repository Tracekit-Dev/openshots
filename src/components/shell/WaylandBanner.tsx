import { useAppStore } from "../../stores/app.store";

/**
 * Informational banner shown on Linux Wayland sessions.
 * Explains that global hotkeys are unavailable and directs
 * the user to use the system tray instead.
 */
export default function WaylandBanner() {
  const isWayland = useAppStore((s) => s.isWayland);

  if (!isWayland) return null;

  return (
    <div className="bg-amber-900/30 border-b border-amber-800/40 px-4 py-2.5 text-xs text-amber-200">
      <span className="font-medium">Wayland detected</span> — Global hotkeys
      are unavailable. Use the system tray icon to capture screenshots.
    </div>
  );
}
