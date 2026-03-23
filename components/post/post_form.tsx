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
import { useColors } from "@/providers/UIProvider";
import { api } from "@/lib/axios";
import { useFeeds } from "@/providers/FeedsProvider";
import { usePosts } from "@/providers/PostsProvider";
import { useToast } from "@/providers/ToastProvider";
import { PostType } from "@/types/post";
import DrawingEditor, { DrawingDraft } from "./DrawingEditor";

type PostFormProps = {
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

  const pickMedia = async () => {
    if (isSubmitting) return;

    const remaining = 8 - mediaFiles.length;
    if (remaining <= 0) {
      addToast({ message: "エラー", detail: "画像・動画は最大8個までです" });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });

    if (result.canceled) return;
    const selected = result.assets ?? [];
    setMediaFiles((prev) => [...prev, ...selected].slice(0, 8));
  };

  const removeFile = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const appendMediaToFormData = (
    formData: FormData,
    files: ImagePicker.ImagePickerAsset[],
  ) => {
    files.forEach((file, index) => {
      const fileName = file.fileName ?? `media-${Date.now()}-${index}`;
      const mimeType = file.mimeType ?? "application/octet-stream";

      formData.append("post[media_files][]", {
        uri: file.uri,
        name: fileName,
        type: mimeType,
      } as unknown as Blob);
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("post[content]", content);
    formData.append("post[visibility]", visibility);

    if (replyPost) {
      formData.append("post[reply_aid]", replyPost.aid);
    }
    if (quotePost) {
      formData.append("post[quote_aid]", quotePost.aid);
    }

    if (drawingData) {
      formData.append("post[drawing_attributes][data]", drawingData.packed);
      formData.append("post[drawing_attributes][name]", drawingData.name || "");
      formData.append(
        "post[drawing_attributes][description]",
        drawingData.description || "",
      );
    }

    appendMediaToFormData(formData, mediaFiles);

    try {
      const res = await api.post("/posts", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const newPost = (res.data?.data ?? res.data) as PostType;
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
                    <ThemedText style={styles.removeMediaText}>x</ThemedText>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : null}

      {drawingData ? (
        <View style={[styles.drawingPreview, { borderColor }]}>
          <ThemedText style={styles.targetMeta}>
            お絵描きデータを添付中
          </ThemedText>
          <ThemedText numberOfLines={1}>
            {drawingData.name || "(名前なし)"}
          </ThemedText>
          <Pressable
            style={styles.removeTextButton}
            onPress={handleRemoveDrawing}
          >
            <ThemedText style={styles.removeText}>削除</ThemedText>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.controls}>
        <View style={styles.leftControls}>
          <TouchableOpacity
            style={[styles.controlButton, { borderColor }]}
            onPress={pickMedia}
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
    borderWidth: StyleSheet.hairlineWidth,
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
    borderWidth: StyleSheet.hairlineWidth,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  removeTextButton: {
    alignSelf: "flex-start",
  },
  removeText: {
    color: "#d93838",
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
    borderWidth: StyleSheet.hairlineWidth,
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
