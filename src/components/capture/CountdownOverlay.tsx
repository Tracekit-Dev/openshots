import { useEffect, useRef, useState } from "react";

interface CountdownOverlayProps {
  seconds: number;
  onComplete: () => void;
  onCancel?: () => void;
}

/**
 * Fullscreen countdown overlay displayed before a timed capture.
 * Shows a large centered number that decrements each second.
 * Escape key cancels the countdown.
 */
export default function CountdownOverlay({
  seconds,
  onComplete,
  onCancel,
}: CountdownOverlayProps) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onCancelRef = useRef(onCancel);

  // Keep refs current without re-triggering effects
  onCompleteRef.current = onComplete;
  onCancelRef.current = onCancel;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          // Defer onComplete to avoid setState during render
          queueMicrotask(() => onCompleteRef.current());
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Escape key cancels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (intervalRef.current) clearInterval(intervalRef.current);
        onCancelRef.current?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Progress for the ring animation (1 = full, 0 = done)
  const progress = remaining / seconds;
  const circumference = 2 * Math.PI * 54;
  const strokeOffset = circumference * (1 - progress);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative flex items-center justify-center">
        {/* Circular progress ring */}
        <svg
          width="160"
          height="160"
          className="absolute"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Background ring */}
          <circle
            cx="80"
            cy="80"
            r="54"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="3"
          />
          {/* Progress ring */}
          <circle
            cx="80"
            cy="80"
            r="54"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>

        {/* Countdown number */}
        <span className="text-[120px] font-light text-white leading-none select-none tabular-nums">
          {remaining}
        </span>
      </div>

      {/* Cancel hint */}
      <p className="absolute bottom-12 text-sm text-white/40">
        Press Esc to cancel
      </p>
    </div>
  );
}
