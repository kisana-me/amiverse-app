import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

export type DrawingDraft = {
  packed: string;
  name: string;
  description: string;
  previewUri?: string;
};

type DrawingEditorProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (draft: DrawingDraft) => void;
  initialData?: string;
  initialName?: string;
  initialDescription?: string;
};

const W = 320;
const H = 120;
const BYTE_LEN = Math.ceil((W * H) / 8);
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const MIN_SCALE = 1;
const MAX_SCALE = 10;
const MAX_STROKE_JUMP = 24;

function encodeBase64(bytes: Uint8Array) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const n = (a << 16) | (b << 8) | c;

    out += B64[(n >> 18) & 63];
    out += B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? B64[n & 63] : "=";
  }
  return out;
}

function decodeBase64(input: string) {
  const clean = input.replace(/[^A-Za-z0-9+/=]/g, "");
  const out: number[] = [];

  for (let i = 0; i < clean.length; i += 4) {
    const c1 = B64.indexOf(clean[i] || "A");
    const c2 = B64.indexOf(clean[i + 1] || "A");
    const c3ch = clean[i + 2] || "=";
    const c4ch = clean[i + 3] || "=";
    const c3 = c3ch === "=" ? -1 : B64.indexOf(c3ch);
    const c4 = c4ch === "=" ? -1 : B64.indexOf(c4ch);

    const n =
      ((c1 & 63) << 18) |
      ((c2 & 63) << 12) |
      (((c3 < 0 ? 0 : c3) & 63) << 6) |
      ((c4 < 0 ? 0 : c4) & 63);

    out.push((n >> 16) & 255);
    if (c3 >= 0) out.push((n >> 8) & 255);
    if (c4 >= 0) out.push(n & 255);
  }

  return new Uint8Array(out);
}

export default function DrawingEditor({
  visible,
  onClose,
  onSave,
  initialData,
  initialName,
  initialDescription,
}: DrawingEditorProps) {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "icon");
  const tintColor = useThemeColor({}, "tint");

  const [name, setName] = useState(initialName ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [tool, setTool] = useState<"pen" | "eraser" | "hand">("pen");
  const [shape, setShape] = useState<"square" | "circle">("circle");
  const [size, setSize] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [viewTick, setViewTick] = useState(0);
  const [bitmapTick, setBitmapTick] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(0);

  const bitmapRef = useRef(new Uint8Array(BYTE_LEN));
  const historyRef = useRef<Uint8Array[]>([]);
  const rafRef = useRef<number | null>(null);

  const viewportElRef = useRef<View | null>(null);
  const viewportRef = useRef({ width: 0, height: 0 });
  const viewportPageRef = useRef({ x: 0, y: 0 });
  const pendingRenderRef = useRef({ view: false, bitmap: false });
  const gestureRef = useRef({
    scale: 1,
    panX: 0,
    panY: 0,
    drawing: false,
    panning: false,
    pinching: false,
    touched: false,
    pinchDist: 0,
    pinchScale: 1,
    pinchWorldX: 0,
    pinchWorldY: 0,
    lastX: 0,
    lastY: 0,
    lastTouchX: 0,
    lastTouchY: 0,
    activeTouchId: null as number | null,
    points: [] as { x: number; y: number }[],
  });

  const refreshViewportOrigin = () => {
    if (!viewportElRef.current) return;
    viewportElRef.current.measureInWindow((x, y) => {
      viewportPageRef.current.x = x;
      viewportPageRef.current.y = y;
    });
  };

  const requestRender = ({
    view = false,
    bitmap = false,
    stroke = false,
  }: {
    view?: boolean;
    bitmap?: boolean;
    stroke?: boolean;
  }) => {
    pendingRenderRef.current.view = pendingRenderRef.current.view || view;
    pendingRenderRef.current.bitmap = pendingRenderRef.current.bitmap || bitmap;

    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const pending = pendingRenderRef.current;
      pendingRenderRef.current = { view: false, bitmap: false };

      if (pending.view) {
        setZoom(gestureRef.current.scale);
        setViewTick((v) => v + 1);
      }

      if (pending.bitmap) {
        setBitmapTick((v) => v + 1);
      }
    });
  };

  const clearBitmap = () => {
    // white background: bit=1 means white
    bitmapRef.current = new Uint8Array(BYTE_LEN).fill(255);
  };

  const setPixel = (x: number, y: number, black: boolean) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = y * W + x;
    const bi = Math.floor(i / 8);
    const bit = 7 - (i % 8);
    const mask = 1 << bit;
    if (black) {
      bitmapRef.current[bi] &= ~mask;
    } else {
      bitmapRef.current[bi] |= mask;
    }
  };

  const isWhite = (x: number, y: number) => {
    const i = y * W + x;
    const bi = Math.floor(i / 8);
    const bit = 7 - (i % 8);
    return ((bitmapRef.current[bi] >> bit) & 1) === 1;
  };

  const drawPoint = (cx: number, cy: number) => {
    const left = Math.ceil(cx - size / 2);
    const top = Math.ceil(cy - size / 2);

    if (shape === "square" || size <= 2) {
      for (let dy = 0; dy < size; dy++) {
        for (let dx = 0; dx < size; dx++) {
          setPixel(left + dx, top + dy, tool === "pen");
        }
      }
      return;
    }

    const r2 = (size / 2) * (size / 2);
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const ox = dx - size / 2 + 0.5;
        const oy = dy - size / 2 + 0.5;
        if (ox * ox + oy * oy <= r2) {
          setPixel(left + dx, top + dy, tool === "pen");
        }
      }
    }
  };

  const drawLine = (
    x0raw: number,
    y0raw: number,
    x1raw: number,
    y1raw: number,
  ) => {
    let x0 = Math.floor(x0raw);
    let y0 = Math.floor(y0raw);
    const x1 = Math.floor(x1raw);
    const y1 = Math.floor(y1raw);

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      drawPoint(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = err * 2;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  };

  const drawQuadCurve = (
    x0: number,
    y0: number,
    cx: number,
    cy: number,
    x1: number,
    y1: number,
  ) => {
    const dist = Math.hypot(x0 - cx, y0 - cy) + Math.hypot(cx - x1, cy - y1);
    const steps = Math.max(1, Math.ceil(dist / 2));

    let lx = x0;
    let ly = y0;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const nx = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
      const ny = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
      drawLine(lx, ly, nx, ny);
      lx = nx;
      ly = ny;
    }
  };

  const saveHistory = () => {
    const copy = new Uint8Array(bitmapRef.current);
    const next = historyRef.current.slice(0, historyIndex + 1);
    next.push(copy);
    if (next.length > 50) next.shift();
    historyRef.current = next;
    setHistoryIndex(next.length - 1);
  };

  const restoreHistory = (idx: number) => {
    const snap = historyRef.current[idx];
    if (!snap) return;
    bitmapRef.current = new Uint8Array(snap);
    setHistoryIndex(idx);
    requestRender({ bitmap: true });
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    restoreHistory(historyIndex - 1);
  };

  const redo = () => {
    if (historyIndex >= historyRef.current.length - 1) return;
    restoreHistory(historyIndex + 1);
  };

  const worldFromLocal = (localX: number, localY: number) => {
    const s = gestureRef.current.scale;
    return {
      x: (localX - gestureRef.current.panX) / s,
      y: (localY - gestureRef.current.panY) / s,
    };
  };

  const centerCanvas = () => {
    const vw = viewportRef.current.width;
    const vh = viewportRef.current.height;
    if (!vw || !vh) return;

    let nextScale = Math.min((vw - 20) / W, (vh - 20) / H, 3);
    if (nextScale < MIN_SCALE) nextScale = MIN_SCALE;

    gestureRef.current.scale = nextScale;
    gestureRef.current.panX = (vw - W * nextScale) / 2;
    gestureRef.current.panY = (vh - H * nextScale) / 2;
    requestRender({ view: true });
  };

  const applyZoom = (delta: number, x?: number, y?: number) => {
    const oldScale = gestureRef.current.scale;
    let newScale = oldScale + delta;
    newScale = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE));

    const fx = x ?? viewportRef.current.width / 2;
    const fy = y ?? viewportRef.current.height / 2;

    const worldX = (fx - gestureRef.current.panX) / oldScale;
    const worldY = (fy - gestureRef.current.panY) / oldScale;

    gestureRef.current.scale = newScale;
    gestureRef.current.panX = fx - worldX * newScale;
    gestureRef.current.panY = fy - worldY * newScale;
    requestRender({ view: true });
  };

  const decodePacked = (packed?: string) => {
    clearBitmap();
    if (!packed) return;
    try {
      const decoded = decodeBase64(packed);
      const next = new Uint8Array(BYTE_LEN);
      next.set(decoded.slice(0, BYTE_LEN));
      bitmapRef.current = next;
    } catch (error) {
      console.error("decode failed", error);
      clearBitmap();
    }
  };

  const onTouchStart = (event: any) => {
    refreshViewportOrigin();
    const touches = event.nativeEvent.touches ?? [];
    const changedTouches = event.nativeEvent.changedTouches ?? [];
    if (touches.length === 0) return;

    if (tool === "hand" && touches.length >= 2) {
      const a = touches[0];
      const b = touches[1];
      gestureRef.current.pinching = true;
      gestureRef.current.drawing = false;
      gestureRef.current.panning = false;
      gestureRef.current.pinchDist = Math.hypot(
        a.locationX - b.locationX,
        a.locationY - b.locationY,
      );
      gestureRef.current.pinchScale = gestureRef.current.scale;

      const cx = (a.locationX + b.locationX) / 2;
      const cy = (a.locationY + b.locationY) / 2;
      const world = worldFromLocal(cx, cy);
      gestureRef.current.pinchWorldX = world.x;
      gestureRef.current.pinchWorldY = world.y;
      return;
    }

    const t = changedTouches[0] ?? touches[0];

    if (tool === "hand") {
      gestureRef.current.panning = true;
      gestureRef.current.lastTouchX = t.locationX;
      gestureRef.current.lastTouchY = t.locationY;
      gestureRef.current.activeTouchId = null;
      return;
    }

    if (touches.length > 1) return;

    gestureRef.current.drawing = true;
    gestureRef.current.touched = false;
    gestureRef.current.activeTouchId = t.identifier ?? null;
    const world = worldFromLocal(t.locationX, t.locationY);
    gestureRef.current.lastX = world.x;
    gestureRef.current.lastY = world.y;
    gestureRef.current.points = [{ x: world.x, y: world.y }];
  };

  const onTouchMove = (event: any) => {
    const touches = event.nativeEvent.touches ?? [];
    if (touches.length === 0) return;

    if (tool === "hand" && gestureRef.current.pinching && touches.length >= 2) {
      const a = touches[0];
      const b = touches[1];
      const dist = Math.hypot(
        a.locationX - b.locationX,
        a.locationY - b.locationY,
      );
      const ratio = dist / Math.max(1, gestureRef.current.pinchDist);
      let nextScale = gestureRef.current.pinchScale * ratio;
      nextScale = Math.max(MIN_SCALE, Math.min(nextScale, MAX_SCALE));

      const cx = (a.locationX + b.locationX) / 2;
      const cy = (a.locationY + b.locationY) / 2;

      gestureRef.current.scale = nextScale;
      gestureRef.current.panX = cx - gestureRef.current.pinchWorldX * nextScale;
      gestureRef.current.panY = cy - gestureRef.current.pinchWorldY * nextScale;
      requestRender({ view: true });
      return;
    }

    const t =
      gestureRef.current.activeTouchId === null
        ? touches[0]
        : touches.find(
            (touch: any) =>
              touch.identifier === gestureRef.current.activeTouchId,
          );

    if (!t) return;

    if (gestureRef.current.panning) {
      const dx = t.locationX - gestureRef.current.lastTouchX;
      const dy = t.locationY - gestureRef.current.lastTouchY;
      gestureRef.current.panX += dx;
      gestureRef.current.panY += dy;
      gestureRef.current.lastTouchX = t.locationX;
      gestureRef.current.lastTouchY = t.locationY;
      requestRender({ view: true });
      return;
    }

    if (gestureRef.current.drawing) {
      if (touches.length > 1) return;

      const world = worldFromLocal(t.locationX, t.locationY);
      const pts = gestureRef.current.points;

      // Ignore zero-distance moves
      const lastPt = pts[pts.length - 1];
      if (lastPt && lastPt.x === world.x && lastPt.y === world.y) {
        return;
      }

      pts.push({ x: world.x, y: world.y });

      if (pts.length >= 3) {
        const p0 = pts[pts.length - 3];
        const p1 = pts[pts.length - 2];
        const p2 = pts[pts.length - 1];

        const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

        let startX = pts.length === 3 ? p0.x : mid1.x;
        let startY = pts.length === 3 ? p0.y : mid1.y;

        drawQuadCurve(startX, startY, p1.x, p1.y, mid2.x, mid2.y);

        gestureRef.current.touched = true;
        requestRender({ bitmap: true });
      }
    }
  };

  const onTouchEnd = () => {
    const g = gestureRef.current;

    if (gestureRef.current.drawing) {
      const pts = g.points;
      if (pts.length === 1) {
        drawPoint(pts[0].x, pts[0].y);
      } else if (pts.length === 2) {
        drawLine(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
      } else if (pts.length >= 3) {
        const p1 = pts[pts.length - 2];
        const p2 = pts[pts.length - 1];
        const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        drawLine(mid2.x, mid2.y, p2.x, p2.y);
      }

      saveHistory();
      requestRender({ bitmap: true });
    }

    g.drawing = false;
    g.panning = false;
    g.pinching = false;
    g.activeTouchId = null;
    g.points = [];
  };

  const onClear = () => {
    Alert.alert("全消去", "全消去しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "全消去",
        style: "destructive",
        onPress: () => {
          clearBitmap();
          saveHistory();
          requestRender({ bitmap: true });
        },
      },
    ]);
  };

  const onDone = () => {
    onSave({
      packed: encodeBase64(bitmapRef.current),
      name,
      description,
    });
    onClose();
  };

  useEffect(() => {
    if (!visible) return;

    setName(initialName ?? "");
    setDescription(initialDescription ?? "");
    decodePacked(initialData);

    historyRef.current = [new Uint8Array(bitmapRef.current)];
    setHistoryIndex(0);

    gestureRef.current.scale = 1;
    gestureRef.current.panX = 0;
    gestureRef.current.panY = 0;
    requestRender({ view: true, bitmap: true });

    const id = requestAnimationFrame(() => {
      refreshViewportOrigin();
      centerCanvas();
    });

    return () => cancelAnimationFrame(id);
  }, [visible, initialData, initialName, initialDescription]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const pathData = useMemo(() => {
    const parts: string[] = [];

    for (let y = 0; y < H; y++) {
      let start = -1;
      for (let x = 0; x < W; x++) {
        const black = !isWhite(x, y);

        if (black && start < 0) start = x;

        if ((!black || x === W - 1) && start >= 0) {
          const end = black && x === W - 1 ? x : x - 1;
          const width = end - start + 1;
          parts.push(`M${start} ${y}h${width}v1h-${width}z`);
          start = -1;
        }
      }
    }

    return parts.join("");
  }, [bitmapTick]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor }]}
          onPress={() => undefined}
        >
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <ThemedText style={styles.title}>Drawing Editor</ThemedText>
            <View style={styles.headerActions}>
              <Pressable
                style={[styles.actionBtn, { borderColor }]}
                onPress={onClose}
              >
                <ThemedText>キャンセル</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.actionBtn,
                  { borderColor: tintColor, backgroundColor: tintColor },
                ]}
                onPress={onDone}
              >
                <ThemedText style={styles.actionPrimaryText}>完了</ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={styles.metaRow}>
            <TextInput
              placeholder="タイトル (任意)"
              placeholderTextColor="#888"
              value={name}
              onChangeText={setName}
              style={[styles.input, { borderColor, color: textColor }]}
            />
            <TextInput
              placeholder="説明 (任意)"
              placeholderTextColor="#888"
              value={description}
              onChangeText={setDescription}
              style={[styles.input, { borderColor, color: textColor }]}
            />
          </View>

          <View style={styles.main}>
            <View
              ref={viewportElRef}
              style={styles.viewport}
              onLayout={(e) => {
                viewportRef.current = {
                  width: e.nativeEvent.layout.width,
                  height: e.nativeEvent.layout.height,
                };
                refreshViewportOrigin();
                centerCanvas();
              }}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={onTouchStart}
              onResponderMove={onTouchMove}
              onResponderRelease={onTouchEnd}
              onResponderTerminate={onTouchEnd}
            >
              <View
                pointerEvents="none"
                style={[
                  styles.canvas,
                  {
                    transformOrigin: "top left",
                    transform: [
                      { translateX: gestureRef.current.panX },
                      { translateY: gestureRef.current.panY },
                      { scale: gestureRef.current.scale },
                    ],
                  },
                ]}
              >
                <Svg pointerEvents="none" width={W} height={H}>
                  <Path d={pathData} fill="#000" />
                </Svg>
              </View>

              <View style={styles.zoomBox}>
                <Pressable
                  style={styles.zoomBtn}
                  onPress={() => applyZoom(0.5)}
                >
                  <ThemedText style={styles.zoomText}>+</ThemedText>
                </Pressable>
                <ThemedText style={styles.zoomPercent}>
                  {Math.round(zoom * 100)}%
                </ThemedText>
                <Pressable
                  style={styles.zoomBtn}
                  onPress={() => applyZoom(-0.5)}
                >
                  <ThemedText style={styles.zoomText}>-</ThemedText>
                </Pressable>
              </View>
            </View>

            <View style={[styles.bottomBar, { borderTopColor: borderColor }]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.bottomBarContent}
              >
                <ToolButton
                  label="ペン"
                  active={tool === "pen"}
                  onPress={() => setTool("pen")}
                />
                <ToolButton
                  label="消しゴム"
                  active={tool === "eraser"}
                  onPress={() => setTool("eraser")}
                />
                <ToolButton
                  label="移動"
                  active={tool === "hand"}
                  onPress={() => setTool("hand")}
                />

                <ToolButton
                  label="Undo"
                  active={false}
                  disabled={historyIndex <= 0}
                  onPress={undo}
                />
                <ToolButton
                  label="Redo"
                  active={false}
                  disabled={historyIndex >= historyRef.current.length - 1}
                  onPress={redo}
                />

                <ToolButton
                  label={shape === "square" ? "四角" : "丸"}
                  active={false}
                  onPress={() =>
                    setShape((prev) =>
                      prev === "square" ? "circle" : "square",
                    )
                  }
                />

                <View style={styles.inlineRow}>
                  <ThemedText style={styles.brushLabel}>{size}px</ThemedText>
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => setSize(value)}
                      style={[
                        styles.brushChip,
                        {
                          borderColor: size === value ? tintColor : borderColor,
                          backgroundColor:
                            size === value ? tintColor : "transparent",
                        },
                      ]}
                    >
                      <ThemedText
                        style={{ color: size === value ? "#fff" : textColor }}
                      >
                        {value}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>

                <Pressable style={styles.clearBtn} onPress={onClear}>
                  <ThemedText style={styles.clearText}>全消去</ThemedText>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ToolButton({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.toolBtn,
        active && styles.toolBtnActive,
        disabled && styles.toolBtnDisabled,
      ]}
    >
      <ThemedText style={active ? styles.toolBtnTextActive : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    padding: 8,
  },
  card: {
    width: "100%",
    height: "95%",
    borderRadius: 12,
    overflow: "hidden",
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionPrimaryText: {
    color: "#fff",
    fontWeight: "700",
  },
  metaRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  main: {
    flex: 1,
    flexDirection: "column",
    paddingTop: 8,
  },
  viewport: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  canvas: {
    position: "absolute",
    left: 0,
    top: 0,
    width: W,
    height: H,
    backgroundColor: "#fff",
  },
  zoomBox: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    gap: 6,
  },
  zoomBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  zoomText: {
    color: "#fff",
    fontWeight: "700",
  },
  zoomPercent: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 68,
  },
  bottomBarContent: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: "center",
    gap: 8,
  },
  toolBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#666",
    borderRadius: 8,
    backgroundColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  toolBtnActive: {
    backgroundColor: "#1d7ef5",
    borderColor: "#1d7ef5",
  },
  toolBtnDisabled: {
    opacity: 0.4,
  },
  toolBtnTextActive: {
    color: "#fff",
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  brushLabel: {
    fontSize: 12,
    opacity: 0.8,
  },
  brushChip: {
    minWidth: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 3,
    alignItems: "center",
  },
  clearBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d93838",
    borderRadius: 8,
    backgroundColor: "rgba(217,56,56,0.15)",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  clearText: {
    color: "#d93838",
    fontWeight: "700",
  },
});
