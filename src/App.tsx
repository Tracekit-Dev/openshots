import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "./stores/app.store";

interface PlatformFlags {
  is_wayland: boolean;
}

export default function App() {
  const setWayland = useAppStore((s) => s.setWayland);

  useEffect(() => {
    const unlisten = listen<PlatformFlags>("platform:flags", (event) => {
      setWayland(event.payload.is_wayland);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setWayland]);

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100">
      <main className="flex-1 flex items-center justify-center">
        <p className="text-neutral-500 text-sm">Canvas area — Phase 2</p>
      </main>
    </div>
  );
}
