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
  const prevBoundsRef = useRef<string>("");

  useEffect(() => {
    if (!selectedId) {
      setBounds(null);
      prevBoundsRef.current = "";
      return;
    }

    const calculate = () => {
      const stage = stageRef.current;
      if (!stage) return;

      const node = stage.findOne("#" + selectedId);
      if (!node) {
        if (prevBoundsRef.current !== "null") {
          setBounds(null);
          prevBoundsRef.current = "null";
        }
        return;
      }

      const stageRect = node.getClientRect({ relativeTo: stage });
      const canvasEl = stage.container().querySelector("canvas");
      if (!canvasEl) return;
      const containerRect = canvasEl.getBoundingClientRect();

      const scaleX = stage.scaleX();
      const scaleY = stage.scaleY();

      const newX = Math.round(containerRect.left + stageRect.x * scaleX);
      const newY = Math.round(containerRect.top + stageRect.y * scaleY);
      const newW = Math.round(stageRect.width * scaleX);
      const newH = Math.round(stageRect.height * scaleY);

      const key = `${newX},${newY},${newW},${newH}`;
      if (key !== prevBoundsRef.current) {
        prevBoundsRef.current = key;
        setBounds({ x: newX, y: newY, width: newW, height: newH });
      }
    };

    calculate();

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
