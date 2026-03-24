import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  DRAWING_HEIGHT,
  DRAWING_WIDTH,
  DrawingDraft,
  DrawingEditor,
  DrawingViewer,
} from "@/features/drawing";
import { useFeeds } from "@/providers/FeedsProvider";
import { usePosts } from "@/providers/PostsProvider";
import { useToast } from "@/providers/ToastProvider";
import { useColors } from "@/providers/UIProvider";
import { PostType } from "@/types/post";
import { buildPostFormData } from "./actions/build-post-form-data";
import { pickMedia } from "./actions/pick-media";
import { submitPost } from "./actions/submit-post";

export type PostFormProps = {
  replyPost?: PostType;
  quotePost?: PostType;
  onSuccess?: () => void;
  redirectToCurrentFeed?: boolean;
};

export default function PostForm({
  replyPost,
  quotePost,
  onSuccess,
  redirectToCurrentFeed = true,
}: PostFormProps) {
  const { prependFeedItem } = useFeeds();
  const { addPosts } = usePosts();
  const { addToast } = useToast();

  const backgroundColor = useColors().background_color;
  const borderColor = useColors().border_color;
  const textColor = useColors().font_color;
  const tintColor = useColors().link_color;

  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState("opened");
  const [mediaFiles, setMediaFiles] = useState<ImagePicker.ImagePickerAsset[]>(
    [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [drawingData, setDrawingData] = useState<DrawingDraft | null>(null);

  const canSubmit = useMemo(() => {
    return Boolean(content.trim() || mediaFiles.length > 0 || drawingData);
  }, [content, mediaFiles.length, drawingData]);

  const handleDrawingSave = (draft: DrawingDraft) => {
    setDrawingData(draft);
    setIsDrawingOpen(false);
  };

  const handleRemoveDrawing = () => {
    setDrawingData(null);
  };

  const handlePickMedia = async () => {
    if (isSubmitting) return;

    const nextMediaFiles = await pickMedia({
      existingFiles: mediaFiles,
      onLimitReached: () => {
        addToast({ message: "エラー", detail: "画像・動画は最大8個までです" });
      },
    });

    setMediaFiles(nextMediaFiles);
  };

  const removeFile = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);

    const formData = buildPostFormData({
      content,
      visibility,
      mediaFiles,
      drawingData,
      replyAid: replyPost?.aid,
      quoteAid: quotePost?.aid,
    });

    try {
      const newPost = await submitPost(formData);

      if (newPost?.aid) {
        addPosts([newPost]);
        prependFeedItem("current", { type: "post", post_aid: newPost.aid });
      }

      addToast({ message: "投稿しました" });
      setContent("");
      setMediaFiles([]);
      setDrawingData(null);
      onSuccess?.();

      if (redirectToCurrentFeed) {
        router.push("/");
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage =
        error?.response?.data?.errors?.join?.(", ") || "投稿に失敗しました";
      addToast({ message: "エラー", detail: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetPost = replyPost ?? quotePost;
  const targetLabel = replyPost ? "返信先" : quotePost ? "引用元" : null;
  return (
    <View style={styles.container}>
      {targetPost && targetLabel ? (
        <View style={[styles.targetCard, { borderColor }]}>
          <ThemedText style={styles.targetLabel}>{targetLabel}</ThemedText>
          <ThemedText numberOfLines={1} style={styles.targetMeta}>
            @{targetPost.account.name_id}
          </ThemedText>
          <ThemedText numberOfLines={3} style={styles.targetContent}>
            {targetPost.content || "(本文なし)"}
          </ThemedText>
        </View>
      ) : null}

      <TextInput
        style={[
          styles.textarea,
          { borderColor, color: textColor, backgroundColor },
        ]}
        placeholder="いまどうしてる？"
        placeholderTextColor="#888"
        multiline
        value={content}
        onChangeText={setContent}
        editable={!isSubmitting}
      />

      {mediaFiles.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.mediaPreviewRow}>
            {mediaFiles.map((file, index) => {
              const isVideo = file.type?.startsWith("video");

              return (
                <View key={`${file.uri}-${index}`} style={styles.mediaItem}>
                  {isVideo ? (
                    <View style={[styles.videoPlaceholder, { borderColor }]}>
                      <ThemedText style={styles.videoLabel}>VIDEO</ThemedText>
                    </View>
                  ) : (
                    <Image
                      source={{ uri: file.uri }}
                      style={styles.mediaImage}
                    />
                  )}
                  <Pressable
                    style={styles.removeMediaButton}
                    onPress={() => removeFile(index)}
                  >
                    <ThemedText style={styles.removeMediaText}>×</ThemedText>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : null}

      {drawingData ? (
        <View style={[styles.drawingPreview, { borderColor }]}>
          <View style={[styles.drawingMediaItem, { borderColor }]}>
            <DrawingViewer
              packed={drawingData.packed}
              style={styles.drawingCanvas}
            />
            <Pressable
              style={styles.removeMediaButton}
              onPress={handleRemoveDrawing}
            >
              <ThemedText style={styles.removeMediaText}>×</ThemedText>
            </Pressable>
          </View>
          <ThemedText numberOfLines={1}>
            {drawingData.name || "(名前なし)"}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.controls}>
        <View style={styles.leftControls}>
          <TouchableOpacity
            style={[styles.controlButton, { borderColor }]}
            onPress={handlePickMedia}
            disabled={isSubmitting}
          >
            <ThemedText>画像/動画</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, { borderColor }]}
            onPress={() => setIsDrawingOpen(true)}
            disabled={isSubmitting}
          >
            <ThemedText>お絵描き</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, { borderColor }]}
            onPress={() => setVisibility("opened")}
            disabled
          >
            <ThemedText>全体公開</ThemedText>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: canSubmit ? tintColor : "#999" },
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          <ThemedText style={styles.submitText}>
            {isSubmitting ? "送信中..." : "投稿する"}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <DrawingEditor
        visible={isDrawingOpen}
        onClose={() => setIsDrawingOpen(false)}
        onSave={handleDrawingSave}
        initialData={drawingData?.packed}
        initialName={drawingData?.name}
        initialDescription={drawingData?.description}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  targetCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  targetLabel: {
    fontSize: 12,
    opacity: 0.8,
  },
  targetMeta: {
    fontSize: 11,
    opacity: 0.7,
  },
  targetContent: {
    fontSize: 13,
  },
  textarea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: "top",
  },
  mediaPreviewRow: {
    flexDirection: "row",
    gap: 8,
  },
  mediaItem: {
    width: 92,
    height: 92,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  videoPlaceholder: {
    width: "100%",
    height: "100%",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  videoLabel: {
    fontSize: 11,
    opacity: 0.8,
  },
  removeMediaButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeMediaText: {
    color: "#fff",
    fontSize: 11,
  },
  drawingPreview: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  drawingMediaItem: {
    width: DRAWING_WIDTH,
    maxWidth: "100%",
    aspectRatio: DRAWING_WIDTH / DRAWING_HEIGHT,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#111",
    alignSelf: "center",
  },
  drawingCanvas: {
    ...StyleSheet.absoluteFillObject,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  leftControls: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
  },
  controlButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  submitButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
  },
});
