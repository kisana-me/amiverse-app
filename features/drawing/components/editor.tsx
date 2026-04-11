import {
  Canvas,
  FilterMode,
  Group,
  ImageFormat,
  MipmapMode,
  Image as SkiaImage,
} from "@shopify/react-native-skia";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { DRAWING_HEIGHT, DRAWING_WIDTH } from "../constants";
import { bitmapToPacked, packedToBitmap } from "../lib/packed_codec";
import { createSkImageFromBitmap } from "../lib/skia_image";
import { DrawingEditorProps } from "../types";

type Tool = "pen" | "eraser" | "hand";
type BrushShape = "square" | "circle";

type EditorTouch = {
  locationX: number;
  locationY: number;
  pageX: number;
  pageY: number;
};

const CANVAS_WIDTH = DRAWING_WIDTH;
const CANVAS_HEIGHT = DRAWING_HEIGHT;
const MIN_SCALE = 0.5;
const MAX_SCALE = 10;
const MAX_HISTORY = 50;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

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
  const [confirmDiscardVisible, setConfirmDiscardVisible] = useState(false);
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
    strokeStartBitmap: null as Uint8Array | null,
  });

  const notifyBitmapChanged = () => {
    setSkImage(createSkImageFromBitmap(bitmapRef.current));
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
    notifyBitmapChanged();
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
    setConfirmDiscardVisible(false);
    notifyBitmapChanged();
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

  const endCurrentStroke = (options?: {
    commitTap?: boolean;
    discardStroke?: boolean;
  }) => {
    const interaction = interactionRef.current;
    if (interaction.isDrawing) {
      const shouldCommitTap = options?.commitTap ?? true;
      const shouldDiscardStroke = options?.discardStroke ?? false;
      let didMutate = false;

      if (!interaction.hasDrawn && shouldCommitTap) {
        plotLine(
          interaction.lastX,
          interaction.lastY,
          interaction.lastX,
          interaction.lastY,
        );
        didMutate = true;
      }

      if (shouldDiscardStroke) {
        const snapshot = interaction.strokeStartBitmap;
        if (snapshot) {
          bitmapRef.current = new Uint8Array(snapshot);
        }
        if (interaction.hasDrawn || didMutate) {
          notifyBitmapChanged();
        }
      } else if (interaction.hasDrawn || didMutate) {
        saveHistory();
        notifyBitmapChanged();
      }
    }

    interaction.isDrawing = false;
    interaction.hasDrawn = false;
    interaction.strokeStartBitmap = null;
  };

  const beginPinch = (a: EditorTouch, b: EditorTouch) => {
    endCurrentStroke({ commitTap: false, discardStroke: true });
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
      interaction.strokeStartBitmap = null;
      return;
    }

    const pos = screenToWorld(touch.locationX, touch.locationY);
    interaction.isDrawing = true;
    interaction.hasDrawn = false;
    interaction.lastX = pos.x;
    interaction.lastY = pos.y;
    interaction.strokeStartBitmap = cloneBitmap();
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    const touches = e.nativeEvent.touches;
    const interaction = interactionRef.current;

    if (touches.length >= 2 && !interaction.isPinching) {
      beginPinch(touches[0], touches[1]);
    }

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
      const pos = screenToWorld(touch.locationX, touch.locationY);
      plotLine(interaction.lastX, interaction.lastY, pos.x, pos.y);
      interaction.lastX = pos.x;
      interaction.lastY = pos.y;
      interaction.hasDrawn = true;
      notifyBitmapChanged();
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
          notifyBitmapChanged();
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

  const closeDiscardConfirm = () => {
    setConfirmDiscardVisible(false);
  };

  const handleCancelPress = () => {
    setConfirmDiscardVisible(true);
  };

  const handleDiscardAndClose = () => {
    setConfirmDiscardVisible(false);
    onClose();
  };

  const handleModalRequestClose = () => {
    if (confirmDiscardVisible) {
      setConfirmDiscardVisible(false);
      return;
    }
    setConfirmDiscardVisible(true);
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={false}
      onRequestClose={handleModalRequestClose}
    >
      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "bottom", "left", "right"]}
      >
        <View style={styles.screen}>
          <View style={styles.header}>
            <Text style={styles.title}>Drawing Editor</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleCancelPress}
                style={styles.cancelButton}
              >
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
              <ScrollView
                horizontal
                style={styles.primaryToolsScroller}
                contentContainerStyle={styles.primaryToolsRow}
                showsHorizontalScrollIndicator={false}
              >
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
              </ScrollView>

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

          <Modal
            visible={confirmDiscardVisible}
            transparent
            animationType="fade"
            onRequestClose={closeDiscardConfirm}
          >
            <View style={styles.confirmBackdrop}>
              <View style={styles.confirmCard}>
                <Text style={styles.confirmTitle}>変更を破棄しますか？</Text>
                <Text style={styles.confirmMessage}>
                  保存していないお絵描き内容は失われます。
                </Text>
                <View style={styles.confirmActions}>
                  <TouchableOpacity
                    onPress={closeDiscardConfirm}
                    style={styles.confirmKeepButton}
                  >
                    <Text style={styles.confirmKeepText}>編集を続ける</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDiscardAndClose}
                    style={styles.confirmDiscardButton}
                  >
                    <Text style={styles.confirmDiscardText}>
                      破棄して閉じる
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#111",
  },
  screen: {
    flex: 1,
    backgroundColor: "#111",
  },
  header: {
    paddingHorizontal: 12,
    paddingTop: 8,
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
  primaryToolsScroller: {
    maxHeight: 40,
  },
  primaryToolsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 8,
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
  confirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.56)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    backgroundColor: "#191919",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#3a3a3a",
  },
  confirmTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  confirmMessage: {
    color: "#cbcbcb",
    fontSize: 13,
    lineHeight: 19,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  confirmKeepButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#2c2c2c",
  },
  confirmKeepText: {
    color: "#ddd",
    fontWeight: "600",
  },
  confirmDiscardButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#862f2f",
  },
  confirmDiscardText: {
    color: "#fff",
    fontWeight: "700",
  },
});
