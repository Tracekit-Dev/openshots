import { Layer, Arrow, Rect, Ellipse, Text, Transformer } from "react-konva";
import { useCanvasStore, type AnnotationShape } from "../../stores/canvas.store";
import { useRef, useEffect } from "react";
import Konva from "konva";

/**
 * Renders all annotation shapes on the canvas.
 * Supports: arrows, rectangles, ellipses, text, and emoji.
 */
export default function AnnotationLayer() {
  const annotations = useCanvasStore((s) => s.annotations);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const updateAnnotation = useCanvasStore((s) => s.updateAnnotation);
  const setSelectedId = useCanvasStore((s) => s.setSelectedId);
  const trRef = useRef<Konva.Transformer>(null);
  const selectedRef = useRef<Konva.Node>(null);

  useEffect(() => {
    if (selectedId && trRef.current && selectedRef.current) {
      const isAnnotation = annotations.some((a) => a.id === selectedId);
      if (isAnnotation) {
        trRef.current.nodes([selectedRef.current]);
        trRef.current.getLayer()?.batchDraw();
      }
    }
  }, [selectedId, annotations]);

  const handleTransformEnd = (shape: AnnotationShape) => {
    const node = selectedRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    if (shape.type === "rectangle") {
      updateAnnotation(shape.id, {
        x: node.x(),
        y: node.y(),
        width: Math.round(shape.width * scaleX),
        height: Math.round(shape.height * scaleY),
        rotation: node.rotation(),
      });
    } else if (shape.type === "ellipse") {
      updateAnnotation(shape.id, {
        x: node.x(),
        y: node.y(),
        radiusX: Math.round(shape.radiusX * scaleX),
        radiusY: Math.round(shape.radiusY * scaleY),
        rotation: node.rotation(),
      });
    } else {
      updateAnnotation(shape.id, {
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
      });
    }
  };

  const commonDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    updateAnnotation(id, { x: e.target.x(), y: e.target.y() });
  };

  const renderShape = (shape: AnnotationShape) => {
    const isSelected = selectedId === shape.id;
    const refProp = isSelected ? { ref: selectedRef as React.RefObject<never> } : {};

    const common = {
      ...refProp,
      x: shape.x,
      y: shape.y,
      rotation: shape.rotation,
      draggable: true,
      onClick: () => setSelectedId(shape.id),
      onTap: () => setSelectedId(shape.id),
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => commonDragEnd(shape.id, e),
      onTransformEnd: () => handleTransformEnd(shape),
    };

    switch (shape.type) {
      case "arrow":
        return (
          <Arrow
            key={shape.id}
            {...common}
            points={shape.points}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            fill={shape.stroke}
            tension={shape.curvature}
            pointerLength={10}
            pointerWidth={10}
          />
        );
      case "rectangle":
        return (
          <Rect
            key={shape.id}
            {...common}
            width={shape.width}
            height={shape.height}
            fill={shape.fill}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            cornerRadius={shape.cornerRadius}
          />
        );
      case "ellipse":
        return (
          <Ellipse
            key={shape.id}
            {...common}
            radiusX={shape.radiusX}
            radiusY={shape.radiusY}
            fill={shape.fill}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
          />
        );
      case "text":
        return (
          <Text
            key={shape.id}
            {...common}
            text={shape.text}
            fontSize={shape.fontSize}
            fontFamily={shape.fontFamily}
            fill={shape.fill}
            shadowEnabled={shape.shadowEnabled}
            shadowColor={shape.shadowColor}
            shadowBlur={shape.shadowBlur}
          />
        );
      case "emoji":
        return (
          <Text
            key={shape.id}
            {...common}
            text={shape.emoji}
            fontSize={shape.fontSize}
          />
        );
    }
  };

  const selectedAnnotation = annotations.find((a) => a.id === selectedId);

  return (
    <Layer>
      {annotations.map(renderShape)}
      {selectedAnnotation && (
        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={
            selectedAnnotation.type === "arrow"
              ? []
              : ["top-left", "top-right", "bottom-left", "bottom-right"]
          }
        />
      )}
    </Layer>
  );
}
