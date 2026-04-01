import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import {
  Canvas,
  FilterMode,
  MipmapMode,
  Image as SkiaImage,
  useImage,
} from "@shopify/react-native-skia";
import { Image as ExpoImage } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export type MediaViewerItem = {
  id: string;
  uri: string;
  mediaType?: "image" | "video";
  name?: string;
  description?: string;
  pixelPerfect?: boolean;
};

export type MediaViewerProps = {
  visible: boolean;
  items: MediaViewerItem[];
  initialIndex?: number;
  onClose: () => void;
};

const MAX_SCALE = 4;
const PAN_EXTRA_MARGIN = 72;

const clamp = (value: number, min: number, max: number) => {
  "worklet";
  return Math.min(max, Math.max(min, value));
};

const maxOffsetForScale = (scaleValue: number, size: number) => {
  "worklet";
  return ((scaleValue - 1) * size) / 2 + PAN_EXTRA_MARGIN;
};

const clampValue = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const formatDuration = (seconds: number) => {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
};

type ZoomableSlideProps = {
  item: MediaViewerItem;
  width: number;
  height: number;
  uiVisible: boolean;
  onToggleUi: () => void;
  onZoomStateChange: (itemId: string, zoomed: boolean) => void;
};

function ZoomableSlide({
  item,
  width,
  height,
  uiVisible,
  onToggleUi,
  onZoomStateChange,
}: ZoomableSlideProps) {
  const skImage = useImage(item.pixelPerfect ? item.uri : null);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const pinchStartScale = useSharedValue(1);
  const pinchStartTranslateX = useSharedValue(0);
  const pinchStartTranslateY = useSharedValue(0);
  const pinchStartFocalX = useSharedValue(0);
  const pinchStartFocalY = useSharedValue(0);
  const zoomedRef = useRef(false);
  const [isPanEnabled, setIsPanEnabled] = useState(false);

  const emitZoom = (nextZoomed: boolean) => {
    if (zoomedRef.current === nextZoomed) return;
    zoomedRef.current = nextZoomed;
    setIsPanEnabled(nextZoomed);
    onZoomStateChange(item.id, nextZoomed);
  };

  useEffect(() => {
    return () => {
      if (zoomedRef.current) {
        onZoomStateChange(item.id, false);
      }
    };
  }, [item.id, onZoomStateChange]);

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onStart((event) => {
          // Lock gallery paging as soon as pinch starts.
          runOnJS(emitZoom)(true);
          pinchStartScale.value = savedScale.value;
          pinchStartTranslateX.value = savedTranslateX.value;
          pinchStartTranslateY.value = savedTranslateY.value;
          pinchStartFocalX.value = event.focalX;
          pinchStartFocalY.value = event.focalY;
        })
        .onUpdate((event) => {
          const nextScale = clamp(
            pinchStartScale.value * event.scale,
            1,
            MAX_SCALE,
          );
          const startScale = Math.max(0.0001, pinchStartScale.value);

          const anchorX = pinchStartFocalX.value - width / 2;
          const anchorY = pinchStartFocalY.value - height / 2;

          const nextTranslateX =
            anchorX -
            (nextScale / startScale) * (anchorX - pinchStartTranslateX.value);
          const nextTranslateY =
            anchorY -
            (nextScale / startScale) * (anchorY - pinchStartTranslateY.value);

          const maxX = maxOffsetForScale(nextScale, width);
          const maxY = maxOffsetForScale(nextScale, height);

          scale.value = nextScale;
          translateX.value = clamp(nextTranslateX, -maxX, maxX);
          translateY.value = clamp(nextTranslateY, -maxY, maxY);
        })
        .onEnd(() => {
          pinchStartFocalX.value = 0;
          pinchStartFocalY.value = 0;
          savedScale.value = scale.value;
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
          const zoomed = scale.value > 1.01;
          runOnJS(emitZoom)(zoomed);
          if (!zoomed) {
            translateX.value = withTiming(0);
            translateY.value = withTiming(0);
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
          }
        }),
    [
      height,
      pinchStartFocalX,
      pinchStartFocalY,
      pinchStartScale,
      pinchStartTranslateX,
      pinchStartTranslateY,
      savedScale,
      savedTranslateX,
      savedTranslateY,
      scale,
      translateX,
      translateY,
      width,
    ],
  );

  const zoomPan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isPanEnabled)
        .onUpdate((event) => {
          if (scale.value <= 1.01) {
            translateX.value = 0;
            translateY.value = 0;
            return;
          }

          const maxXWithMargin = maxOffsetForScale(scale.value, width);
          const maxYWithMargin = maxOffsetForScale(scale.value, height);

          translateX.value = clamp(
            savedTranslateX.value + event.translationX,
            -maxXWithMargin,
            maxXWithMargin,
          );
          translateY.value = clamp(
            savedTranslateY.value + event.translationY,
            -maxYWithMargin,
            maxYWithMargin,
          );
        })
        .onEnd(() => {
          if (scale.value <= 1.01) {
            translateX.value = withTiming(0);
            translateY.value = withTiming(0);
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
            return;
          }

          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        }),
    [
      height,
      isPanEnabled,
      savedTranslateX,
      savedTranslateY,
      scale,
      translateX,
      translateY,
      width,
    ],
  );

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onEnd((event) => {
          if (scale.value > 1.01) {
            scale.value = withTiming(1);
            savedScale.value = 1;
            translateX.value = withTiming(0);
            translateY.value = withTiming(0);
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
            runOnJS(emitZoom)(false);
            return;
          }

          const targetScale = 2;
          const currentScale = Math.max(0.0001, scale.value);
          const anchorX = event.x - width / 2;
          const anchorY = event.y - height / 2;
          const targetTranslateX =
            anchorX -
            (targetScale / currentScale) * (anchorX - translateX.value);
          const targetTranslateY =
            anchorY -
            (targetScale / currentScale) * (anchorY - translateY.value);
          const maxX = maxOffsetForScale(targetScale, width);
          const maxY = maxOffsetForScale(targetScale, height);
          const clampedX = clamp(targetTranslateX, -maxX, maxX);
          const clampedY = clamp(targetTranslateY, -maxY, maxY);

          scale.value = withTiming(targetScale);
          translateX.value = withTiming(clampedX);
          translateY.value = withTiming(clampedY);
          savedScale.value = targetScale;
          savedTranslateX.value = clampedX;
          savedTranslateY.value = clampedY;
          runOnJS(emitZoom)(true);
        }),
    [
      height,
      savedScale,
      savedTranslateX,
      savedTranslateY,
      scale,
      translateX,
      translateY,
      width,
    ],
  );

  const singleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(1)
        .onEnd(() => {
          runOnJS(onToggleUi)();
        }),
    [onToggleUi],
  );

  const composedGesture = useMemo(
    () =>
      Gesture.Simultaneous(
        pinch,
        zoomPan,
        Gesture.Exclusive(doubleTap, singleTap),
      ),
    [doubleTap, pinch, singleTap, zoomPan],
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <View style={[styles.slide, { width, height }]}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.zoomLayer, animatedStyle]}>
          {item.pixelPerfect ? (
            skImage ? (
              <Canvas style={styles.canvas}>
                <SkiaImage
                  image={skImage}
                  x={0}
                  y={0}
                  width={width}
                  height={height}
                  fit="contain"
                  sampling={{
                    filter: FilterMode.Nearest,
                    mipmap: MipmapMode.None,
                  }}
                />
              </Canvas>
            ) : (
              <View style={styles.pixelPerfectLoading} />
            )
          ) : (
            <ExpoImage
              source={{ uri: item.uri }}
              style={styles.image}
              contentFit="contain"
              allowDownscaling={!item.pixelPerfect}
              transition={item.pixelPerfect ? 0 : undefined}
            />
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

type ActiveVideoUiState = {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
};

type ActiveVideoActions = {
  seekBy: (seconds: number) => void;
  togglePlayback: () => void;
  seekTo: (seconds: number) => void;
  setScrubbing: (scrubbing: boolean) => void;
};

type VideoSlideProps = {
  item: MediaViewerItem;
  width: number;
  height: number;
  active: boolean;
  visible: boolean;
  canAutoPlay: boolean;
  uiVisible: boolean;
  onToggleUi: () => void;
  onZoomStateChange: (itemId: string, zoomed: boolean) => void;
  onScrubbingChange: (scrubbing: boolean) => void;
  onVideoUiStateChange: (state: ActiveVideoUiState | null) => void;
  onVideoActionsChange: (actions: ActiveVideoActions | null) => void;
};

function VideoSlide({
  item,
  width,
  height,
  active,
  visible,
  canAutoPlay,
  uiVisible,
  onToggleUi,
  onZoomStateChange,
  onScrubbingChange,
  onVideoUiStateChange,
  onVideoActionsChange,
}: VideoSlideProps) {
  const player = useVideoPlayer(item.uri, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.timeUpdateEventInterval = 0.25;
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const reportedRef = useRef(false);

  const safePause = () => {
    try {
      player.pause();
    } catch {
      // Ignore race conditions where native player was already released.
    }
  };

  useEffect(() => {
    onZoomStateChange(item.id, false);
    return () => {
      onScrubbingChange(false);
      onZoomStateChange(item.id, false);
    };
  }, [item.id, onScrubbingChange, onZoomStateChange]);

  useEffect(() => {
    if (!visible || !active) {
      setIsScrubbing(false);
      onScrubbingChange(false);
    }
  }, [active, onScrubbingChange, visible]);

  useEffect(() => {
    setCurrentTime(player.currentTime ?? 0);
    setDuration(player.duration ?? 0);
    setIsPlaying(player.playing);

    const timeSubscription = player.addListener("timeUpdate", (payload) => {
      if (!isScrubbing) {
        setCurrentTime(payload.currentTime);
      }
      if (Number.isFinite(player.duration) && player.duration > 0) {
        setDuration(player.duration);
      }
    });

    const playingSubscription = player.addListener(
      "playingChange",
      (payload) => {
        setIsPlaying(payload.isPlaying);
      },
    );

    const sourceSubscription = player.addListener("sourceLoad", (payload) => {
      setDuration(payload.duration);
    });

    const playToEndSubscription = player.addListener("playToEnd", () => {
      setHasEnded(true);
      setIsPlaying(false);
    });

    return () => {
      timeSubscription.remove();
      playingSubscription.remove();
      sourceSubscription.remove();
      playToEndSubscription.remove();
    };
  }, [isScrubbing, player]);

  useEffect(() => {
    if (!visible || !active) {
      safePause();
      return;
    }

    if (!canAutoPlay) return;

    setHasEnded(false);
    player.play();
  }, [active, canAutoPlay, player, visible]);

  useEffect(() => {
    if (!active || !visible) {
      if (reportedRef.current) {
        onVideoUiStateChange(null);
        reportedRef.current = false;
      }
      return;
    }

    reportedRef.current = true;
    onVideoUiStateChange({
      currentTime,
      duration,
      isPlaying,
    });
  }, [active, currentTime, duration, isPlaying, onVideoUiStateChange, visible]);

  const seekBy = (seconds: number) => {
    const safeDuration =
      Number.isFinite(duration) && duration > 0 ? duration : 0;
    const next = clampValue(player.currentTime + seconds, 0, safeDuration || 0);
    player.currentTime = next;
    setCurrentTime(next);
    setHasEnded(false);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      player.pause();
      return;
    }

    if (hasEnded) {
      player.replay();
      setCurrentTime(0);
      setHasEnded(false);
      return;
    }

    player.play();
  };

  const seekTo = (seconds: number) => {
    const safeDuration =
      Number.isFinite(duration) && duration > 0 ? duration : 0;
    const next = clampValue(seconds, 0, safeDuration || 0);
    player.currentTime = next;
    setCurrentTime(next);
    setHasEnded(false);
  };

  useEffect(() => {
    if (!active || !visible) {
      if (reportedRef.current) {
        onVideoActionsChange(null);
      }
      return;
    }

    reportedRef.current = true;
    onVideoActionsChange({
      seekBy,
      togglePlayback,
      seekTo,
      setScrubbing: (scrubbing: boolean) => {
        setIsScrubbing(scrubbing);
        onScrubbingChange(scrubbing);
      },
    });

    return undefined;
  }, [
    active,
    onScrubbingChange,
    onVideoActionsChange,
    seekBy,
    togglePlayback,
    visible,
  ]);

  return (
    <View style={[styles.slide, { width, height }]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={false}
        allowsFullscreen
      />

      <Pressable style={styles.videoTapToShow} onPress={onToggleUi} />
    </View>
  );
}

export default function MediaViewer({
  visible,
  items,
  initialIndex = 0,
  onClose,
}: MediaViewerProps) {
  const { width, height } = useWindowDimensions();
  const flatListRef = useRef<FlatList<MediaViewerItem> | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomedById, setZoomedById] = useState<Record<string, boolean>>({});
  const [videoScrubbing, setVideoScrubbing] = useState(false);
  const [currentIndexReady, setCurrentIndexReady] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [activeVideoUiState, setActiveVideoUiState] =
    useState<ActiveVideoUiState | null>(null);
  const videoActionsRef = useRef<ActiveVideoActions | null>(null);

  const dismissTranslateY = useSharedValue(0);
  const backdropOpacity = useSharedValue(1);

  const safeInitialIndex = useMemo(() => {
    if (items.length === 0) return 0;
    return Math.max(0, Math.min(initialIndex, items.length - 1));
  }, [initialIndex, items.length]);

  const currentItem = items[currentIndex];
  const isAnyZoomed = useMemo(
    () => Object.values(zoomedById).some(Boolean),
    [zoomedById],
  );

  useEffect(() => {
    if (!visible) return;

    setZoomedById({});
    setVideoScrubbing(false);
    setUiVisible(true);
    setActiveVideoUiState(null);
    videoActionsRef.current = null;
    setCurrentIndexReady(false);
    setCurrentIndex(safeInitialIndex);
    dismissTranslateY.value = 0;
    backdropOpacity.value = 1;

    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({
        index: safeInitialIndex,
        animated: false,
      });
      setCurrentIndexReady(true);
    });
  }, [backdropOpacity, dismissTranslateY, safeInitialIndex, visible]);

  useEffect(() => {
    if (visible) return;
    setCurrentIndexReady(false);
    setUiVisible(true);
    setActiveVideoUiState(null);
    videoActionsRef.current = null;
    setVideoScrubbing(false);
  }, [visible]);

  const toggleUiVisibility = () => {
    setUiVisible((prev) => !prev);
  };

  const updateZoomState = (itemId: string, zoomed: boolean) => {
    setZoomedById((prev) => {
      if ((prev[itemId] ?? false) === zoomed) return prev;
      return { ...prev, [itemId]: zoomed };
    });
  };

  const dismissGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(visible && !isAnyZoomed && !videoScrubbing)
        .activeOffsetY([-16, 16])
        .failOffsetX([-16, 16])
        .onUpdate((event) => {
          dismissTranslateY.value = event.translationY;
          const progress = Math.min(Math.abs(event.translationY) / 320, 1);
          backdropOpacity.value = 1 - progress * 0.65;
        })
        .onEnd((event) => {
          const shouldClose =
            Math.abs(event.translationY) > 140 ||
            Math.abs(event.velocityY) > 1200;

          if (shouldClose) {
            backdropOpacity.value = withTiming(
              0,
              { duration: 180 },
              (finished) => {
                if (finished) {
                  runOnJS(onClose)();
                }
              },
            );
            return;
          }

          dismissTranslateY.value = withTiming(0);
          backdropOpacity.value = withTiming(1);
        }),
    [
      backdropOpacity,
      dismissTranslateY,
      isAnyZoomed,
      onClose,
      videoScrubbing,
      visible,
    ],
  );

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: backdropOpacity.value,
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: dismissTranslateY.value }],
      opacity: backdropOpacity.value,
    };
  });

  if (items.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />

        <GestureDetector gesture={dismissGesture}>
          <Animated.View style={[styles.content, contentStyle]}>
            <FlatList
              ref={flatListRef}
              data={items}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEnabled={!isAnyZoomed && !videoScrubbing}
              initialScrollIndex={safeInitialIndex}
              getItemLayout={(_data, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              onMomentumScrollEnd={(event) => {
                if (isAnyZoomed) return;
                const nextIndex = Math.round(
                  event.nativeEvent.contentOffset.x / width,
                );
                setCurrentIndex(
                  Math.max(0, Math.min(nextIndex, items.length - 1)),
                );
              }}
              renderItem={({ item, index }) =>
                item.mediaType === "video" ? (
                  <VideoSlide
                    item={item}
                    width={width}
                    height={height}
                    active={index === currentIndex}
                    visible={visible}
                    canAutoPlay={currentIndexReady}
                    uiVisible={uiVisible}
                    onToggleUi={toggleUiVisibility}
                    onZoomStateChange={updateZoomState}
                    onScrubbingChange={setVideoScrubbing}
                    onVideoUiStateChange={setActiveVideoUiState}
                    onVideoActionsChange={(actions) => {
                      videoActionsRef.current = actions;
                    }}
                  />
                ) : (
                  <ZoomableSlide
                    item={item}
                    width={width}
                    height={height}
                    uiVisible={uiVisible}
                    onToggleUi={toggleUiVisibility}
                    onZoomStateChange={updateZoomState}
                  />
                )
              }
            />

            {uiVisible && (
              <Pressable style={styles.closeArea} onPress={onClose}>
                <Text style={styles.closeText}>閉じる</Text>
              </Pressable>
            )}

            {uiVisible ? (
              <View style={styles.footer}>
                <Text style={styles.counterText}>
                  {currentIndex + 1} / {items.length}
                </Text>
                {currentItem?.mediaType === "video" ? (
                  <Text style={styles.mediaTypeText}>動画</Text>
                ) : null}
                {currentItem?.name ? (
                  <Text numberOfLines={1} style={styles.nameText}>
                    {currentItem.name}
                  </Text>
                ) : null}
                {currentItem?.description ? (
                  <Text numberOfLines={3} style={styles.descriptionText}>
                    {currentItem.description}
                  </Text>
                ) : null}

                {currentItem?.mediaType === "video" && activeVideoUiState ? (
                  <View style={styles.videoControlsInFooter}>
                    <Slider
                      style={styles.videoSeekBar}
                      minimumValue={0}
                      maximumValue={
                        activeVideoUiState.duration > 0
                          ? activeVideoUiState.duration
                          : 1
                      }
                      value={activeVideoUiState.currentTime}
                      minimumTrackTintColor="#f2f2f2"
                      maximumTrackTintColor="rgba(255,255,255,0.36)"
                      thumbTintColor="#ffffff"
                      onSlidingStart={() => {
                        videoActionsRef.current?.setScrubbing(true);
                      }}
                      onSlidingComplete={(value) => {
                        videoActionsRef.current?.seekTo(value);
                        videoActionsRef.current?.setScrubbing(false);
                      }}
                    />

                    <View style={styles.videoControlRow}>
                      <Pressable
                        style={styles.seekButton}
                        onPress={() => {
                          videoActionsRef.current?.seekBy(-3);
                        }}
                      >
                        <Text style={styles.seekButtonText}>-3s</Text>
                      </Pressable>

                      <Pressable
                        style={styles.playButton}
                        onPress={() => {
                          videoActionsRef.current?.togglePlayback();
                        }}
                      >
                        <Ionicons
                          name={activeVideoUiState.isPlaying ? "pause" : "play"}
                          size={18}
                          color="#fff"
                        />
                      </Pressable>

                      <Pressable
                        style={styles.seekButton}
                        onPress={() => {
                          videoActionsRef.current?.seekBy(3);
                        }}
                      >
                        <Text style={styles.seekButtonText}>+3s</Text>
                      </Pressable>
                    </View>

                    <Text style={styles.videoTimeText}>
                      {formatDuration(activeVideoUiState.currentTime)} /{" "}
                      {formatDuration(activeVideoUiState.duration)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.96)",
  },
  content: {
    flex: 1,
  },
  slide: {
    alignItems: "center",
    justifyContent: "center",
  },
  zoomLayer: {
    width: "100%",
    height: "100%",
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  videoTapToShow: {
    ...StyleSheet.absoluteFillObject,
  },
  videoControlsInFooter: {
    marginTop: 6,
  },
  videoSeekBar: {
    width: "100%",
    height: 28,
  },
  videoControlRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  seekButton: {
    minWidth: 56,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  seekButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  videoTimeText: {
    marginTop: 6,
    textAlign: "center",
    color: "#d9d9d9",
    fontSize: 12,
  },
  pixelPerfectLoading: {
    width: "100%",
    height: "100%",
  },
  closeArea: {
    position: "absolute",
    top: 44,
    right: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  closeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  footer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 32,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.58)",
    gap: 4,
  },
  counterText: {
    color: "#ddd",
    fontSize: 12,
  },
  mediaTypeText: {
    color: "#9fd3ff",
    fontSize: 12,
    fontWeight: "700",
  },
  nameText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  descriptionText: {
    color: "#d8d8d8",
    fontSize: 13,
    lineHeight: 18,
  },
});
