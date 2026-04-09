import { useAppStore } from "../../stores/app.store";

export default function WaylandBanner() {
  const isWayland = useAppStore((s) => s.isWayland);

  if (!isWayland) return null;

  return (
    <div className="bg-amber-950/30 border-b border-amber-900/40 px-4 py-2 text-[13px] text-amber-300/80">
      <span className="font-medium">Wayland detected</span> — Global hotkeys
      are unavailable. Use the system tray icon to capture screenshots.
    </div>
  );
}
