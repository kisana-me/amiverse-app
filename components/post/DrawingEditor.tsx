import {
  AlphaType,
  Canvas,
  ColorType,
  FilterMode,
  Group,
  ImageFormat,
  MipmapMode,
  Skia,
  Image as SkiaImage,
} from "@shopify/react-native-skia";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type TextInputChangeEventData,
} from "react-native";

export type DrawingDraft = {
  packed: string;
  name: string;
  description: string;
  previewPngBase64?: string;
};

type Tool = "pen" | "eraser" | "hand";
type BrushShape = "square" | "circle";

type EditorTouch = {
  locationX: number;
  locationY: number;
  pageX: number;
  pageY: number;
};

type DrawingEditorProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (draft: DrawingDraft) => void;
  initialData?: string;
  initialName?: string;
  initialDescription?: string;
};

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 120;
const MIN_SCALE = 0.5;
const MAX_SCALE = 10;
const MAX_HISTORY = 50;
const BYTES_PER_ROW = CANVAS_WIDTH * 4;
const PERF_ENABLED = __DEV__;
const PERF_LOG_INTERVAL_MS = 600;

const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_LOOKUP: number[] = (() => {
  const table = new Array<number>(256).fill(-1);
  for (let i = 0; i < BASE64_CHARS.length; i += 1) {
    table[BASE64_CHARS.charCodeAt(i)] = i;
  }
  return table;
})();

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const nowMs = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

const encodeBase64 = (bytes: Uint8Array): string => {
  let output = "";
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;

    const triplet = (b0 << 16) | (b1 << 8) | b2;
    output += BASE64_CHARS[(triplet >> 18) & 63];
    output += BASE64_CHARS[(triplet >> 12) & 63];
    output += i + 1 < bytes.length ? BASE64_CHARS[(triplet >> 6) & 63] : "=";
    output += i + 2 < bytes.length ? BASE64_CHARS[triplet & 63] : "=";

    i += 3;
  }
  return output;
};

const decodeBase64 = (encoded: string): Uint8Array | null => {
  const clean = encoded.replace(/\s/g, "");
  if (!clean.length || clean.length % 4 !== 0) {
    return null;
  }

  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  const outputLength = (clean.length / 4) * 3 - padding;
  const output = new Uint8Array(outputLength);

  let outIndex = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = clean.charCodeAt(i);
    const c1 = clean.charCodeAt(i + 1);
    const c2 = clean.charCodeAt(i + 2);
    const c3 = clean.charCodeAt(i + 3);

    const v0 = BASE64_LOOKUP[c0];
    const v1 = BASE64_LOOKUP[c1];
    const v2 = c2 === 61 ? 0 : BASE64_LOOKUP[c2];
    const v3 = c3 === 61 ? 0 : BASE64_LOOKUP[c3];

    if (v0 < 0 || v1 < 0 || (c2 !== 61 && v2 < 0) || (c3 !== 61 && v3 < 0)) {
      return null;
    }

    const group = (v0 << 18) | (v1 << 12) | (v2 << 6) | v3;
    if (outIndex < outputLength) output[outIndex++] = (group >> 16) & 255;
    if (outIndex < outputLength) output[outIndex++] = (group >> 8) & 255;
    if (outIndex < outputLength) output[outIndex++] = group & 255;
  }

  return output;
};

const bitmapToPacked = (bitmap: Uint8Array): string => {
  const packedLength = Math.ceil((CANVAS_WIDTH * CANVAS_HEIGHT) / 8);
  const packed = new Uint8Array(packedLength);

  for (let i = 0; i < CANVAS_WIDTH * CANVAS_HEIGHT; i += 1) {
    if (bitmap[i] === 1) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = 7 - (i % 8);
      packed[byteIndex] |= 1 << bitIndex;
    }
  }

  return encodeBase64(packed);
};

const packedToBitmap = (packed?: string): Uint8Array => {
  const bitmap = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT);
  bitmap.fill(1);

  if (!packed) {
    return bitmap;
  }

  const decoded = decodeBase64(packed);
  if (!decoded) {
    return bitmap;
  }

  const maxPixels = CANVAS_WIDTH * CANVAS_HEIGHT;
  for (let i = 0; i < maxPixels; i += 1) {
    const byteIndex = Math.floor(i / 8);
    if (byteIndex >= decoded.length) {
      break;
    }
    const bitIndex = 7 - (i % 8);
    bitmap[i] = (decoded[byteIndex] >> bitIndex) & 1;
  }

  return bitmap;
};

const createSkImageFromBitmap = (bitmap: Uint8Array) => {
  const pixels = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT * 4);
  for (let i = 0; i < bitmap.length; i += 1) {
    const color = bitmap[i] ? 255 : 0;
    const offset = i * 4;
    pixels[offset] = color;
    pixels[offset + 1] = color;
    pixels[offset + 2] = color;
    pixels[offset + 3] = 255;
  }

  return Skia.Image.MakeImage(
    {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      alphaType: AlphaType.Unpremul,
      colorType: ColorType.RGBA_8888,
    },
    Skia.Data.fromBytes(pixels),
    BYTES_PER_ROW,
  );
};

export default function DrawingEditor({
  visible,
  onClose,
  onSave,
  initialData,
  initialName = "",
  initialDescription = "",
}: DrawingEditorProps) {
  const [tool, setTool] = useState<Tool>("pen");
  const [brushSize, setBrushSize] = useState(1);
  const [brushShape, setBrushShape] = useState<BrushShape>("circle");
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState({ scale: 1, panX: 0, panY: 0 });
  const [skImage, setSkImage] = useState(() =>
    createSkImageFromBitmap(
      new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT).fill(1),
    ),
  );

  const bitmapRef = useRef<Uint8Array>(
    new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT).fill(1),
  );
  const historyRef = useRef<Uint8Array[]>([]);
  const didCenterRef = useRef(false);

  const interactionRef = useRef({
    isDrawing: false,
    hasDrawn: false,
    isPanning: false,
    isPinching: false,
    lastX: 0,
    lastY: 0,
    lastTouchX: 0,
    lastTouchY: 0,
    pinchStartDist: 0,
    pinchStartScale: 1,
    pinchCenterWorldX: 0,
    pinchCenterWorldY: 0,
  });

  const perfRef = useRef({
    strokeStartAt: 0,
    lastLogAt: 0,
    moveCount: 0,
    lineCallCount: 0,
    linePointCount: 0,
    lineMsTotal: 0,
    imageBuildCount: 0,
    imageBuildMsTotal: 0,
    imageBuildReason: "",
  });

  const resetPerfStroke = () => {
    perfRef.current.strokeStartAt = nowMs();
    perfRef.current.lastLogAt = 0;
    perfRef.current.moveCount = 0;
    perfRef.current.lineCallCount = 0;
    perfRef.current.linePointCount = 0;
    perfRef.current.lineMsTotal = 0;
    perfRef.current.imageBuildCount = 0;
    perfRef.current.imageBuildMsTotal = 0;
    perfRef.current.imageBuildReason = "";
  };

  const notifyBitmapChanged = (reason = "unknown") => {
    const t0 = PERF_ENABLED ? nowMs() : 0;
    setSkImage(createSkImageFromBitmap(bitmapRef.current));

    if (PERF_ENABLED) {
      const dt = nowMs() - t0;
      perfRef.current.imageBuildCount += 1;
      perfRef.current.imageBuildMsTotal += dt;
      perfRef.current.imageBuildReason = reason;
    }
  };

  const cloneBitmap = () => new Uint8Array(bitmapRef.current);

  const saveHistory = () => {
    const next = historyRef.current.slice(0, historyIndex + 1);
    next.push(cloneBitmap());
    if (next.length > MAX_HISTORY) {
      next.shift();
    }
    historyRef.current = next;
    setHistoryIndex(next.length - 1);
  };

  const restoreFromHistory = (index: number) => {
    const snapshot = historyRef.current[index];
    if (!snapshot) {
      return;
    }
    bitmapRef.current = new Uint8Array(snapshot);
    setHistoryIndex(index);
    notifyBitmapChanged("restore-history");
  };

  const undo = () => {
    if (historyIndex <= 0) {
      return;
    }
    restoreFromHistory(historyIndex - 1);
  };

  const redo = () => {
    if (historyIndex >= historyRef.current.length - 1) {
      return;
    }
    restoreFromHistory(historyIndex + 1);
  };

  const centerCanvas = (width: number, height: number) => {
    if (width <= 0 || height <= 0) {
      return;
    }
    const margin = 20;
    const scaleW = (width - margin) / CANVAS_WIDTH;
    const scaleH = (height - margin) / CANVAS_HEIGHT;
    const nextScale = clamp(Math.min(scaleW, scaleH, 2), MIN_SCALE, MAX_SCALE);

    setTransform({
      scale: nextScale,
      panX: (width - CANVAS_WIDTH * nextScale) / 2,
      panY: (height - CANVAS_HEIGHT * nextScale) / 2,
    });
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    bitmapRef.current = packedToBitmap(initialData);
    historyRef.current = [cloneBitmap()];
    setHistoryIndex(0);
    setTool("pen");
    setBrushSize(1);
    setBrushShape("circle");
    setName(initialName);
    setDescription(initialDescription);
    notifyBitmapChanged("initialize");
    didCenterRef.current = false;

    if (viewport.width > 0 && viewport.height > 0) {
      centerCanvas(viewport.width, viewport.height);
      didCenterRef.current = true;
    }
  }, [
    visible,
    initialData,
    initialName,
    initialDescription,
    viewport.width,
    viewport.height,
  ]);

  const setPixel = (x: number, y: number, isWhite: boolean) => {
    if (x < 0 || y < 0 || x >= CANVAS_WIDTH || y >= CANVAS_HEIGHT) {
      return;
    }
    bitmapRef.current[y * CANVAS_WIDTH + x] = isWhite ? 1 : 0;
  };

  const drawPoint = (
    cx: number,
    cy: number,
    size: number,
    shape: BrushShape,
    paintWhite: boolean,
  ) => {
    const startX = Math.ceil(cx - size / 2);
    const startY = Math.ceil(cy - size / 2);

    if (shape === "square" || size <= 2) {
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          setPixel(startX + x, startY + y, paintWhite);
        }
      }
      return;
    }

    const radiusSq = (size / 2) * (size / 2);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = x - size / 2 + 0.5;
        const dy = y - size / 2 + 0.5;
        if (dx * dx + dy * dy <= radiusSq) {
          setPixel(startX + x, startY + y, paintWhite);
        }
      }
    }
  };

  const plotLine = (x0: number, y0: number, x1: number, y1: number) => {
    let sx0 = Math.floor(x0);
    let sy0 = Math.floor(y0);
    const sx1 = Math.floor(x1);
    const sy1 = Math.floor(y1);

    const dx = Math.abs(sx1 - sx0);
    const dy = Math.abs(sy1 - sy0);
    const stepX = sx0 < sx1 ? 1 : -1;
    const stepY = sy0 < sy1 ? 1 : -1;
    let err = dx - dy;
    let points = 0;

    const paintWhite = tool === "eraser";

    while (true) {
      drawPoint(sx0, sy0, brushSize, brushShape, paintWhite);
      points += 1;

      if (sx0 === sx1 && sy0 === sy1) {
        break;
      }

      const e2 = err * 2;
      if (e2 > -dy) {
        err -= dy;
        sx0 += stepX;
      }
      if (e2 < dx) {
        err += dx;
        sy0 += stepY;
      }
    }

    return points;
  };

  const screenToWorld = (x: number, y: number) => ({
    x: (x - transform.panX) / transform.scale,
    y: (y - transform.panY) / transform.scale,
  });

  const applyZoom = (delta: number, anchorX?: number, anchorY?: number) => {
    const oldScale = transform.scale;
    const newScale = clamp(oldScale + delta, MIN_SCALE, MAX_SCALE);
    const centerX = anchorX ?? viewport.width / 2;
    const centerY = anchorY ?? viewport.height / 2;

    const worldX = (centerX - transform.panX) / oldScale;
    const worldY = (centerY - transform.panY) / oldScale;

    setTransform({
      scale: newScale,
      panX: centerX - worldX * newScale,
      panY: centerY - worldY * newScale,
    });
  };

  const endCurrentStroke = () => {
    const interaction = interactionRef.current;
    if (interaction.isDrawing) {
      if (!interaction.hasDrawn) {
        const t0 = PERF_ENABLED ? nowMs() : 0;
        const points = plotLine(
          interaction.lastX,
          interaction.lastY,
          interaction.lastX,
          interaction.lastY,
        );
        if (PERF_ENABLED) {
          perfRef.current.lineCallCount += 1;
          perfRef.current.linePointCount += points;
          perfRef.current.lineMsTotal += nowMs() - t0;
        }
      }
      saveHistory();
      notifyBitmapChanged("stroke-end");

      if (PERF_ENABLED) {
        const elapsed = Math.max(1, nowMs() - perfRef.current.strokeStartAt);
        const moves = Math.max(1, perfRef.current.moveCount);
        console.log(
          `[DrawingEditor][stroke] duration=${elapsed.toFixed(1)}ms moves=${perfRef.current.moveCount} lineCalls=${perfRef.current.lineCallCount} points=${perfRef.current.linePointCount} lineAvg=${(perfRef.current.lineMsTotal / Math.max(1, perfRef.current.lineCallCount)).toFixed(3)}ms moveAvg=${(elapsed / moves).toFixed(3)}ms imageBuilds=${perfRef.current.imageBuildCount} imageAvg=${(perfRef.current.imageBuildMsTotal / Math.max(1, perfRef.current.imageBuildCount)).toFixed(3)}ms lastReason=${perfRef.current.imageBuildReason}`,
        );
      }
    }

    interaction.isDrawing = false;
    interaction.hasDrawn = false;
  };

  const beginPinch = (a: EditorTouch, b: EditorTouch) => {
    endCurrentStroke();
    const interaction = interactionRef.current;
    interaction.isPinching = true;
    interaction.isPanning = false;
    interaction.isDrawing = false;

    const dx = a.pageX - b.pageX;
    const dy = a.pageY - b.pageY;
    const centerX = (a.locationX + b.locationX) / 2;
    const centerY = (a.locationY + b.locationY) / 2;

    interaction.pinchStartDist = Math.hypot(dx, dy);
    interaction.pinchStartScale = transform.scale;
    const world = screenToWorld(centerX, centerY);
    interaction.pinchCenterWorldX = world.x;
    interaction.pinchCenterWorldY = world.y;
  };

  const handleTouchStart = (e: GestureResponderEvent) => {
    const touches = e.nativeEvent.touches;
    const interaction = interactionRef.current;

    if (touches.length === 2) {
      beginPinch(touches[0], touches[1]);
      return;
    }

    if (touches.length !== 1 || interaction.isPinching) {
      return;
    }

    const touch = touches[0];
    if (tool === "hand") {
      interaction.isPanning = true;
      interaction.lastTouchX = touch.locationX;
      interaction.lastTouchY = touch.locationY;
      return;
    }

    const pos = screenToWorld(touch.locationX, touch.locationY);
    interaction.isDrawing = true;
    interaction.hasDrawn = false;
    interaction.lastX = pos.x;
    interaction.lastY = pos.y;
    if (PERF_ENABLED) {
      resetPerfStroke();
    }
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    const touches = e.nativeEvent.touches;
    const interaction = interactionRef.current;

    if (interaction.isPinching) {
      if (touches.length < 2) {
        interaction.isPinching = false;
        return;
      }

      const a = touches[0];
      const b = touches[1];
      const currentDist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
      if (interaction.pinchStartDist <= 0) {
        return;
      }

      const scaleRatio = currentDist / interaction.pinchStartDist;
      const nextScale = clamp(
        interaction.pinchStartScale * scaleRatio,
        MIN_SCALE,
        MAX_SCALE,
      );

      const centerX = (a.locationX + b.locationX) / 2;
      const centerY = (a.locationY + b.locationY) / 2;

      setTransform({
        scale: nextScale,
        panX: centerX - interaction.pinchCenterWorldX * nextScale,
        panY: centerY - interaction.pinchCenterWorldY * nextScale,
      });
      return;
    }

    if (touches.length !== 1) {
      return;
    }

    const touch = touches[0];
    if (interaction.isPanning) {
      const dx = touch.locationX - interaction.lastTouchX;
      const dy = touch.locationY - interaction.lastTouchY;
      interaction.lastTouchX = touch.locationX;
      interaction.lastTouchY = touch.locationY;

      setTransform((prev) => ({
        ...prev,
        panX: prev.panX + dx,
        panY: prev.panY + dy,
      }));
      return;
    }

    if (interaction.isDrawing) {
      const moveStart = PERF_ENABLED ? nowMs() : 0;
      const pos = screenToWorld(touch.locationX, touch.locationY);
      const lineStart = PERF_ENABLED ? nowMs() : 0;
      const points = plotLine(
        interaction.lastX,
        interaction.lastY,
        pos.x,
        pos.y,
      );
      if (PERF_ENABLED) {
        perfRef.current.lineCallCount += 1;
        perfRef.current.linePointCount += points;
        perfRef.current.lineMsTotal += nowMs() - lineStart;
      }
      interaction.lastX = pos.x;
      interaction.lastY = pos.y;
      interaction.hasDrawn = true;
      notifyBitmapChanged("move-draw");

      if (PERF_ENABLED) {
        perfRef.current.moveCount += 1;
        const now = nowMs();
        if (perfRef.current.lastLogAt === 0) {
          perfRef.current.lastLogAt = now;
        }
        if (now - perfRef.current.lastLogAt >= PERF_LOG_INTERVAL_MS) {
          const elapsed = Math.max(1, now - perfRef.current.strokeStartAt);
          console.log(
            `[DrawingEditor][move] elapsed=${elapsed.toFixed(1)}ms moves=${perfRef.current.moveCount} lineCalls=${perfRef.current.lineCallCount} points=${perfRef.current.linePointCount} lineTotal=${perfRef.current.lineMsTotal.toFixed(1)}ms imageTotal=${perfRef.current.imageBuildMsTotal.toFixed(1)}ms moveLoop=${(now - moveStart).toFixed(3)}ms`,
          );
          perfRef.current.lastLogAt = now;
        }
      }
    }
  };

  const handleTouchEnd = (e: GestureResponderEvent) => {
    const touches = e.nativeEvent.touches;
    const interaction = interactionRef.current;

    if (touches.length === 0) {
      endCurrentStroke();
      interaction.isPanning = false;
      interaction.isPinching = false;
      return;
    }

    if (touches.length === 1 && interaction.isPinching) {
      interaction.isPinching = false;
      const touch = touches[0];
      if (tool === "hand") {
        interaction.isPanning = true;
        interaction.lastTouchX = touch.locationX;
        interaction.lastTouchY = touch.locationY;
      }
    }
  };

  const clearCanvas = () => {
    Alert.alert("全消去", "キャンバスを全て消去しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "消去",
        style: "destructive",
        onPress: () => {
          bitmapRef.current.fill(1);
          saveHistory();
          notifyBitmapChanged("clear");
        },
      },
    ]);
  };

  const handleSave = () => {
    const packed = bitmapToPacked(bitmapRef.current);
    const image = createSkImageFromBitmap(bitmapRef.current);
    const previewPngBase64 = image?.encodeToBase64(ImageFormat.PNG);
    onSave({
      packed,
      name,
      description,
      previewPngBase64,
    });
  };

  const handleViewportLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setViewport({ width, height });
    if (!didCenterRef.current) {
      centerCanvas(width, height);
      didCenterRef.current = true;
    }
  };

  const onNameChange = (e: NativeSyntheticEvent<TextInputChangeEventData>) => {
    setName(e.nativeEvent.text);
  };

  const onDescriptionChange = (
    e: NativeSyntheticEvent<TextInputChangeEventData>,
  ) => {
    setDescription(e.nativeEvent.text);
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Drawing Editor</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>完了</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputsRow}>
            <TextInput
              placeholder="タイトル (任意)"
              placeholderTextColor="#8a8a8a"
              value={name}
              onChange={onNameChange}
              style={styles.input}
            />
            <TextInput
              placeholder="説明 (任意)"
              placeholderTextColor="#8a8a8a"
              value={description}
              onChange={onDescriptionChange}
              style={styles.input}
            />
          </View>

          <View style={styles.mainArea}>
            <View
              style={styles.viewport}
              onLayout={handleViewportLayout}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <View style={styles.checkerboard} />
              <Canvas style={StyleSheet.absoluteFill}>
                <Group
                  transform={[
                    { translateX: transform.panX },
                    { translateY: transform.panY },
                    { scale: transform.scale },
                  ]}
                >
                  {skImage ? (
                    <SkiaImage
                      image={skImage}
                      x={0}
                      y={0}
                      width={CANVAS_WIDTH}
                      height={CANVAS_HEIGHT}
                      sampling={{
                        filter: FilterMode.Nearest,
                        mipmap: MipmapMode.None,
                      }}
                    />
                  ) : null}
                </Group>
              </Canvas>

              <View style={styles.zoomControls}>
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={() => applyZoom(0.5)}
                >
                  <Text style={styles.zoomButtonText}>+</Text>
                </TouchableOpacity>
                <Text style={styles.zoomText}>
                  {Math.round(transform.scale * 100)}%
                </Text>
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={() => applyZoom(-0.5)}
                >
                  <Text style={styles.zoomButtonText}>-</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.toolbar}>
              <View style={styles.toolRow}>
                <TouchableOpacity
                  onPress={() => setTool("pen")}
                  style={[
                    styles.toolButton,
                    tool === "pen" && styles.toolButtonActive,
                  ]}
                >
                  <Text style={styles.toolButtonText}>ペン</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTool("eraser")}
                  style={[
                    styles.toolButton,
                    tool === "eraser" && styles.toolButtonActive,
                  ]}
                >
                  <Text style={styles.toolButtonText}>消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTool("hand")}
                  style={[
                    styles.toolButton,
                    tool === "hand" && styles.toolButtonActive,
                  ]}
                >
                  <Text style={styles.toolButtonText}>手</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.toolRow}>
                <TouchableOpacity
                  onPress={undo}
                  disabled={historyIndex <= 0}
                  style={[
                    styles.toolButton,
                    historyIndex <= 0 && styles.toolButtonDisabled,
                  ]}
                >
                  <Text style={styles.toolButtonText}>戻</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={redo}
                  disabled={historyIndex >= historyRef.current.length - 1}
                  style={[
                    styles.toolButton,
                    historyIndex >= historyRef.current.length - 1 &&
                      styles.toolButtonDisabled,
                  ]}
                >
                  <Text style={styles.toolButtonText}>進</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.toolRow}>
                <TouchableOpacity
                  onPress={() =>
                    setBrushShape((prev) =>
                      prev === "square" ? "circle" : "square",
                    )
                  }
                  style={styles.toolButton}
                >
                  <Text style={styles.toolButtonText}>
                    {brushShape === "square" ? "■" : "●"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.brushSection}>
                <Text style={styles.brushLabel}>サイズ {brushSize}px</Text>
                <View style={styles.sizeRow}>
                  <TouchableOpacity
                    onPress={() =>
                      setBrushSize((prev) => clamp(prev - 1, 1, 10))
                    }
                    style={styles.sizeButton}
                  >
                    <Text style={styles.sizeButtonText}>-</Text>
                  </TouchableOpacity>
                  <View
                    style={[
                      styles.brushPreview,
                      {
                        width: brushSize,
                        height: brushSize,
                        borderRadius:
                          brushShape === "circle" && brushSize > 2
                            ? brushSize / 2
                            : 0,
                        backgroundColor: tool === "eraser" ? "#fff" : "#000",
                      },
                    ]}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setBrushSize((prev) => clamp(prev + 1, 1, 10))
                    }
                    style={styles.sizeButton}
                  >
                    <Text style={styles.sizeButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                onPress={clearCanvas}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>全消去</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    padding: 10,
  },
  sheet: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#303030",
  },
  header: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#303030",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#282828",
  },
  cancelButtonText: {
    color: "#ddd",
    fontWeight: "600",
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#2b6fff",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  inputsRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    backgroundColor: "#1e1e1e",
    color: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#3a3a3a",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  mainArea: {
    flex: 1,
    flexDirection: "column",
  },
  viewport: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#1a1a1a",
  },
  checkerboard: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1a1a1a",
  },
  zoomControls: {
    position: "absolute",
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(17,17,17,0.92)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#434343",
    borderRadius: 10,
    padding: 6,
    alignItems: "center",
    gap: 6,
  },
  zoomButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#292929",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomButtonText: {
    color: "#eee",
    fontSize: 17,
    fontWeight: "700",
  },
  zoomText: {
    color: "#77adff",
    fontSize: 12,
    fontWeight: "700",
    minWidth: 44,
    textAlign: "center",
  },
  toolbar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#303030",
    backgroundColor: "#171717",
    padding: 8,
    gap: 8,
  },
  toolRow: {
    flexDirection: "row",
    gap: 8,
  },
  toolButton: {
    width: 44,
    height: 40,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#3d3d3d",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#242424",
  },
  toolButtonActive: {
    backgroundColor: "#2b6fff",
    borderColor: "#2b6fff",
  },
  toolButtonDisabled: {
    opacity: 0.45,
  },
  toolButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  brushSection: {
    gap: 6,
    paddingTop: 2,
  },
  brushLabel: {
    color: "#b8b8b8",
    fontSize: 12,
    fontWeight: "600",
  },
  sizeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sizeButton: {
    width: 36,
    height: 32,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#3d3d3d",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#242424",
  },
  sizeButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  brushPreview: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#7a7a7a",
  },
  clearButton: {
    marginTop: 2,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#8f2f2f",
    backgroundColor: "rgba(180,45,45,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  clearButtonText: {
    color: "#ff8484",
    fontWeight: "700",
  },
});
