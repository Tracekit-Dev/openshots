import { Layer, Arrow, Rect, Ellipse, Text, Circle, Group, Line, Shape, Transformer } from "react-konva";
import { useCanvasStore, type AnnotationShape, type SpeechBubbleAnnotation } from "../../stores/canvas.store";
import { useRef, useEffect, useState, useCallback } from "react";
import Konva from "konva";

/**
 * Renders all annotation shapes on the canvas with professional styling.
 * Supports: arrows, rectangles, ellipses, text, and emoji.
 */
export default function AnnotationLayer() {
  const annotations = useCanvasStore((s) => s.annotations);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const updateAnnotation = useCanvasStore((s) => s.updateAnnotation);
  const setSelectedId = useCanvasStore((s) => s.setSelectedId);
  const trRef = useRef<Konva.Transformer>(null);
  const selectedRef = useRef<Konva.Node>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

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
    } else if (shape.type === "speech-bubble" || shape.type === "spotlight") {
      updateAnnotation(shape.id, {
        x: node.x(),
        y: node.y(),
        width: Math.round(shape.width * scaleX),
        height: Math.round(shape.height * scaleY),
        rotation: node.rotation(),
      });
    } else if (shape.type === "text" || shape.type === "emoji") {
      // Scale fontSize proportionally so text/emoji doesn't snap back
      const newFontSize = Math.round(shape.fontSize * Math.max(Math.abs(scaleX), Math.abs(scaleY)));
      updateAnnotation(shape.id, {
        x: node.x(),
        y: node.y(),
        fontSize: newFontSize,
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

  // Inline text editing via double-click
  const handleTextDblClick = useCallback(
    (shape: AnnotationShape & { type: "text" }, node: Konva.Text) => {
      setEditingTextId(shape.id);
      node.hide();
      const layer = node.getLayer();
      layer?.batchDraw();

      const stage = node.getStage();
      if (!stage) return;

      const textPosition = node.absolutePosition();
      const stageBox = stage.container().getBoundingClientRect();
      const areaPosition = {
        x: stageBox.left + textPosition.x * stage.scaleX(),
        y: stageBox.top + textPosition.y * stage.scaleY(),
      };

      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);
      textarea.value = shape.text;
      textarea.style.position = "fixed";
      textarea.style.top = `${areaPosition.y}px`;
      textarea.style.left = `${areaPosition.x}px`;
      textarea.style.fontSize = `${shape.fontSize * stage.scaleX()}px`;
      textarea.style.fontFamily = shape.fontFamily;
      textarea.style.color = shape.fill;
      textarea.style.background = "rgba(0,0,0,0.8)";
      textarea.style.border = "1px solid rgba(255,255,255,0.2)";
      textarea.style.borderRadius = "4px";
      textarea.style.padding = "4px 6px";
      textarea.style.outline = "none";
      textarea.style.resize = "none";
      textarea.style.lineHeight = "1.2";
      textarea.style.zIndex = "10000";
      textarea.style.minWidth = "60px";
      textarea.style.minHeight = "30px";
      textarea.focus();
      textarea.select();

      const finishEdit = () => {
        const newText = textarea.value;
        if (newText && newText !== shape.text) {
          updateAnnotation(shape.id, { text: newText });
        }
        document.body.removeChild(textarea);
        node.show();
        layer?.batchDraw();
        setEditingTextId(null);
      };

      textarea.addEventListener("blur", finishEdit);
      textarea.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          textarea.blur();
        }
        if (e.key === "Escape") {
          textarea.value = shape.text;
          textarea.blur();
        }
      });
    },
    [updateAnnotation],
  );

  // Inline text editing for speech bubbles via double-click
  const handleBubbleDblClick = useCallback(
    (shape: SpeechBubbleAnnotation, node: Konva.Node) => {
      setEditingTextId(shape.id);
      node.hide();
      const layer = node.getLayer();
      layer?.batchDraw();

      const stage = node.getStage();
      if (!stage) return;

      const pos = node.absolutePosition();
      const stageBox = stage.container().getBoundingClientRect();
      const areaPosition = {
        x: stageBox.left + pos.x * stage.scaleX(),
        y: stageBox.top + pos.y * stage.scaleY(),
      };

      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);
      textarea.value = shape.text;
      textarea.style.position = "fixed";
      textarea.style.top = `${areaPosition.y}px`;
      textarea.style.left = `${areaPosition.x}px`;
      textarea.style.width = `${shape.width * stage.scaleX()}px`;
      textarea.style.height = `${shape.height * stage.scaleY()}px`;
      textarea.style.fontSize = `${shape.fontSize * stage.scaleX()}px`;
      textarea.style.fontFamily = shape.fontFamily;
      textarea.style.color = shape.textColor;
      textarea.style.background = "rgba(0,0,0,0.8)";
      textarea.style.border = "1px solid rgba(255,255,255,0.2)";
      textarea.style.borderRadius = "4px";
      textarea.style.padding = "4px 6px";
      textarea.style.outline = "none";
      textarea.style.resize = "none";
      textarea.style.lineHeight = "1.2";
      textarea.style.zIndex = "10000";
      textarea.style.textAlign = "center";
      textarea.focus();
      textarea.select();

      const finishEdit = () => {
        const newText = textarea.value;
        if (newText && newText !== shape.text) {
          updateAnnotation(shape.id, { text: newText });
        }
        document.body.removeChild(textarea);
        node.show();
        layer?.batchDraw();
        setEditingTextId(null);
      };

      textarea.addEventListener("blur", finishEdit);
      textarea.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          textarea.blur();
        }
        if (e.key === "Escape") {
          textarea.value = shape.text;
          textarea.blur();
        }
      });
    },
    [updateAnnotation],
  );

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
            dash={shape.dash}
            pointerLength={shape.strokeWidth * 4}
            pointerWidth={shape.strokeWidth * 3.5}
            lineCap="round"
            lineJoin="round"
            hitStrokeWidth={12}
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
            dash={shape.dash}
            hitStrokeWidth={10}
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
            dash={shape.dash}
            hitStrokeWidth={10}
          />
        );
      case "callout":
        return (
          <Group key={shape.id} {...common}>
            <Circle
              radius={18}
              fill={shape.fill}
            />
            <Text
              text={String(shape.number)}
              fontSize={14}
              fontFamily="-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif"
              fontStyle="500"
              fill={shape.textColor || "#ffffff"}
              align="center"
              verticalAlign="middle"
              width={36}
              height={36}
              offsetX={18}
              offsetY={18}
            />
          </Group>
        );
      case "text":
        return (
          <Text
            key={shape.id}
            {...common}
            text={shape.text}
            fontSize={shape.fontSize}
            fontFamily={shape.fontFamily}
            fontStyle="600"
            fill={shape.fill}
            padding={4}
            shadowEnabled={shape.shadowEnabled}
            shadowColor={shape.shadowColor}
            shadowBlur={shape.shadowBlur}
            shadowOffsetX={0}
            shadowOffsetY={0}
            visible={editingTextId !== shape.id}
            onDblClick={(e) => {
              const node = e.target as Konva.Text;
              handleTextDblClick(shape, node);
            }}
            onDblTap={(e) => {
              const node = e.target as Konva.Text;
              handleTextDblClick(shape, node);
            }}
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
      case "speech-bubble": {
        const getTailPoints = (dir: string, w: number, h: number, size: number): number[] => {
          const halfSize = size / 2;
          switch (dir) {
            case "bottom":
              return [w / 2 - halfSize, h, w / 2, h + size, w / 2 + halfSize, h];
            case "top":
              return [w / 2 - halfSize, 0, w / 2, -size, w / 2 + halfSize, 0];
            case "left":
              return [0, h / 2 - halfSize, -size, h / 2, 0, h / 2 + halfSize];
            case "right":
              return [w, h / 2 - halfSize, w + size, h / 2, w, h / 2 + halfSize];
            default:
              return [w / 2 - halfSize, h, w / 2, h + size, w / 2 + halfSize, h];
          }
        };
        return (
          <Group
            key={shape.id}
            {...common}
            visible={editingTextId !== shape.id}
            onDblClick={(e) => {
              const node = e.target.getParent();
              if (node) handleBubbleDblClick(shape, node);
            }}
            onDblTap={(e) => {
              const node = e.target.getParent();
              if (node) handleBubbleDblClick(shape, node);
            }}
          >
            <Rect
              width={shape.width}
              height={shape.height}
              fill={shape.fill}
              stroke={shape.stroke}
              strokeWidth={shape.strokeWidth}
              cornerRadius={shape.cornerRadius}
            />
            <Line
              points={getTailPoints(shape.tailDirection, shape.width, shape.height, shape.tailSize)}
              fill={shape.fill}
              stroke={shape.stroke}
              strokeWidth={shape.strokeWidth}
              closed
            />
            <Text
              text={shape.text}
              fontSize={shape.fontSize}
              fontFamily={shape.fontFamily}
              fill={shape.textColor}
              width={shape.width - 16}
              height={shape.height - 8}
              x={8}
              y={4}
              align="center"
              verticalAlign="middle"
              listening={false}
            />
          </Group>
        );
      }
      case "spotlight": {
        const canvasW = useCanvasStore.getState().canvasWidth;
        const canvasH = useCanvasStore.getState().canvasHeight;
        return (
          <Group
            key={shape.id}
            {...common}
          >
            <Shape
              sceneFunc={(context, konvaShape) => {
                const ctx = context._context;
                // Draw full-canvas overlay
                ctx.save();
                ctx.globalCompositeOperation = "source-over";
                ctx.fillStyle = shape.overlayColor;
                ctx.globalAlpha = shape.overlayOpacity;
                ctx.fillRect(-shape.x, -shape.y, canvasW, canvasH);
                ctx.restore();
                // Punch out the cutout
                ctx.save();
                ctx.globalCompositeOperation = "destination-out";
                ctx.globalAlpha = 1;
                if (shape.cornerRadius > 0) {
                  const r = shape.cornerRadius;
                  ctx.beginPath();
                  ctx.moveTo(r, 0);
                  ctx.lineTo(shape.width - r, 0);
                  ctx.arcTo(shape.width, 0, shape.width, r, r);
                  ctx.lineTo(shape.width, shape.height - r);
                  ctx.arcTo(shape.width, shape.height, shape.width - r, shape.height, r);
                  ctx.lineTo(r, shape.height);
                  ctx.arcTo(0, shape.height, 0, shape.height - r, r);
                  ctx.lineTo(0, shape.height - r);
                  ctx.arcTo(0, 0, r, 0, r);
                  ctx.closePath();
                  ctx.fill();
                } else {
                  ctx.fillRect(0, 0, shape.width, shape.height);
                }
                ctx.restore();
                context.fillStrokeShape(konvaShape);
              }}
              width={shape.width}
              height={shape.height}
              listening={false}
            />
            {/* Visible border around the cutout for selection */}
            <Rect
              width={shape.width}
              height={shape.height}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1}
              cornerRadius={shape.cornerRadius}
              dash={[4, 4]}
              hitStrokeWidth={10}
            />
          </Group>
        );
      }
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
              ? ["middle-left", "middle-right"]
              : ["top-left", "top-right", "bottom-left", "bottom-right"]
          }
        />
      )}
    </Layer>
  );
}
