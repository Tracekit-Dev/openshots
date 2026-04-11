import { useState, useEffect, useRef } from "react";
import Konva from "konva";

export interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Returns the screen-space bounding box of the selected Konva node.
 * Recalculates on an animation-frame loop while a node is selected,
 * so the popover tracks drag/resize in real time.
 */
export function useSelectionBounds(
  stageRef: React.RefObject<Konva.Stage | null>,
  selectedId: string | null,
): SelectionBounds | null {
  const [bounds, setBounds] = useState<SelectionBounds | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedId) {
      setBounds(null);
      return;
    }

    const calculate = () => {
      const stage = stageRef.current;
      if (!stage) return;

      const node = stage.findOne("#" + selectedId);
      if (!node) {
        setBounds(null);
        return;
      }

      // Get bounding rect in stage coordinates
      const stageRect = node.getClientRect({ relativeTo: stage });

      // Get the canvas element's position on screen
      const canvasEl = stage.container().querySelector("canvas");
      if (!canvasEl) return;
      const containerRect = canvasEl.getBoundingClientRect();

      // Stage scale factor
      const scaleX = stage.scaleX();
      const scaleY = stage.scaleY();

      setBounds({
        x: containerRect.left + stageRect.x * scaleX,
        y: containerRect.top + stageRect.y * scaleY,
        width: stageRect.width * scaleX,
        height: stageRect.height * scaleY,
      });
    };

    // Calculate immediately
    calculate();

    // Set up animation frame loop to track position during drag
    const tick = () => {
      calculate();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [stageRef, selectedId]);

  return bounds;
}
