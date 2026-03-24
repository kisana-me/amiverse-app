import { router } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import PostForm from "@/features/post/form";
import { useCurrentAccount } from "@/providers/CurrentAccountProvider";
import { usePosts } from "@/providers/PostsProvider";
import { useToast } from "@/providers/ToastProvider";
import { useColors } from "@/providers/UIProvider";
import { PostType } from "@/types/post";
import { runSignedInAction } from "./console-actions/auth-guard";
import { executeDiffuseToggle } from "./console-actions/diffuse-action";
import {
  handleDeletePost,
  isPostOwner,
  openPostMenu,
  REPORT_CATEGORIES,
  submitPostReport,
} from "./console-actions/menu-action";

export default function PostConsole({ post }: { post: PostType }) {
  const cardBackground = useColors().background_color;
  const borderColor = useColors().border_color;
  const textColor = useColors().font_color;
  const tintColor = useColors().link_color;

  const { currentAccountStatus, currentAccount } = useCurrentAccount();
  const { addPosts, removePost } = usePosts();
  const { addToast } = useToast();

  const [isPostMenuOpen, setIsPostMenuOpen] = useState(false);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isDiffuseConfirmOpen, setIsDiffuseConfirmOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] =
    useState<(typeof REPORT_CATEGORIES)[number]["key"]>("spam");
  const [reportDetail, setReportDetail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuotePress = () => {
    if (post.is_busy) return;
    runSignedInAction(currentAccountStatus, setIsSignInModalOpen, () => {
      setIsQuoteModalOpen(true);
    });
  };

  const handleReplyPress = () => {
    if (post.is_busy) return;
    runSignedInAction(currentAccountStatus, setIsSignInModalOpen, () => {
      setIsReplyModalOpen(true);
    });
  };

  const handleDiffusePress = () => {
    if (post.is_busy) return;
    runSignedInAction(currentAccountStatus, setIsSignInModalOpen, () => {
      if (post.is_diffused) {
        setIsDiffuseConfirmOpen(true);
        return;
      }

      void executeDiffuseToggle({ post, addPosts, addToast });
    });
  };

  const handleReportPress = () => {
    runSignedInAction(currentAccountStatus, setIsSignInModalOpen, () => {
      setIsReportModalOpen(true);
    });
  };

  const submitReport = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const ok = await submitPostReport({
      post,
      category: reportCategory,
      detail: reportDetail,
      closeReportModal: () => setIsReportModalOpen(false),
      closeMenu: () => setIsPostMenuOpen(false),
      addToast,
    });

    setIsSubmitting(false);
    if (ok) {
      setReportCategory("spam");
      setReportDetail("");
    }
  };

  const isOwner = isPostOwner(post, currentAccount);

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleQuotePress}
          disabled={post.is_busy === true}
        >
          <Svg
            viewBox="0 0 100 100"
            width={18}
            height={18}
            fill="currentColor"
            color="#666"
          >
            <Path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M44 20H11V56H35V71L29 71V80H44V20ZM89.0002 20H56.0002L56.0002 56H80.0002V71L74.0002 71V80H89.0002V20Z"
            />
          </Svg>
          <ThemedText style={styles.count}>{post.quotes_count || 0}</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={handleDiffusePress}
          disabled={post.is_busy === true}
        >
          <Svg
            viewBox="0 0 100 100"
            width={18}
            height={18}
            fill="currentColor"
            color={post.is_diffused ? "#17bf63" : "#666"}
          >
            <Path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M48.1816 12.3858C49.2557 11.5673 50.7443 11.5673 51.8184 12.3858L86.2339 38.6139C88.5177 40.3544 87.2868 44 84.4155 44H15.5846C12.7132 44 11.4824 40.3544 13.7661 38.6139L48.1816 12.3858ZM21 68H37V77C37 79.7614 34.7614 82 32 82H26C23.2386 82 21 79.7614 21 77V68ZM63 68H79V77C79 79.7614 76.7614 82 74 82H68C65.2386 82 63 79.7614 63 77V68ZM59 68H41V83C41 85.7614 43.2386 88 46 88H54C56.7614 88 59 85.7614 59 83V68ZM21 48C18.2386 48 16 50.2386 16 53V59C16 61.7614 18.2386 64 21 64H79C81.7614 64 84 61.7614 84 59V53C84 50.2386 81.7614 48 79 48H21Z"
            />
          </Svg>
          <ThemedText
            style={[styles.count, post.is_diffused && styles.diffusedCount]}
          >
            {post.diffuses_count || 0}
          </ThemedText>
        </TouchableOpacity>

        {/* Rating (Left/Right) */}
        {/* <View style={styles.ratingGroup}>
        <TouchableOpacity style={styles.button}>
          <Svg
            viewBox="0 0 100 100"
            width={18}
            height={18}
            fill="currentColor"
            color="#666"
          >
            <Path d="M48.2111 17.5777C48.9482 16.1036 51.0518 16.1036 51.7889 17.5777L83.9299 81.8598C84.7138 83.4275 83.2452 85.1736 81.5664 84.6699L50.5747 75.3724C50.1998 75.2599 49.8002 75.26 49.4253 75.3724L18.4336 84.6699C16.7548 85.1736 15.2862 83.4275 16.0701 81.8598L48.2111 17.5777Z" />
          </Svg>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button}>
          <Svg
            viewBox="0 0 100 100"
            width={18}
            height={18}
            fill="currentColor"
            color="#666"
          >
            <Path d="M51.7889 82.4223C51.0518 83.8964 48.9482 83.8964 48.2111 82.4223L16.0701 18.1402C15.2862 16.5725 16.7548 14.8264 18.4336 15.3301L49.4253 24.6276C49.8002 24.7401 50.1998 24.74 50.5747 24.6276L81.5664 15.3301C83.2452 14.8264 84.7138 16.5725 83.9299 18.1402L51.7889 82.4223Z" />
          </Svg>
        </TouchableOpacity>
      </View> */}

        <TouchableOpacity
          style={styles.button}
          onPress={handleReplyPress}
          disabled={post.is_busy === true}
        >
          <Svg
            viewBox="0 0 100 100"
            width={18}
            height={18}
            fill="currentColor"
            color="#666"
          >
            <Path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M11 19C11 16.2386 13.2386 14 16 14H84C86.7614 14 89 16.2386 89 19V59C89 61.7614 86.7614 64 84 64H80.1939C77.706 64 75.6814 62.1077 74.5909 59.8715C72.3182 55.211 67.5341 52 62 52C56.4659 52 51.6818 55.211 49.4091 59.8715C48.3186 62.1077 46.294 64 43.8061 64H16C13.2386 64 11 61.7614 11 59V19ZM52 66C52 60.4772 56.4772 56 62 56C67.5229 56 72 60.4772 72 66C72 71.5229 67.5229 76 62 76C56.4772 76 52 71.5229 52 66ZM42 80C42 76.6863 44.6863 74 48 74C51.3137 74 54 76.6863 54 80C54 83.3137 51.3137 86 48 86C44.6863 86 42 83.3137 42 80Z"
            />
          </Svg>
          <ThemedText style={styles.count}>
            {post.replies_count || 0}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => openPostMenu(setIsPostMenuOpen)}
        >
          <Svg
            viewBox="0 0 100 100"
            width={18}
            height={18}
            fill="currentColor"
            color="#666"
          >
            <Path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M30 15C21.7157 15 15 21.7157 15 30C15 38.2843 21.7157 45 30 45C38.2843 45 45 38.2843 45 30C45 21.7157 38.2843 15 30 15ZM70 15C61.7157 15 55 21.7157 55 30C55 38.2843 61.7157 45 70 45C78.2843 45 85 38.2843 85 30C85 21.7157 78.2843 15 70 15ZM55 70C55 61.7157 61.7157 55 70 55C78.2843 55 85 61.7157 85 70C85 78.2843 78.2843 85 70 85C61.7157 85 55 78.2843 55 70ZM30 55C21.7157 55 15 61.7157 15 70C15 78.2843 21.7157 85 30 85C38.2843 85 45 78.2843 45 70C45 61.7157 38.2843 55 30 55Z"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isQuoteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsQuoteModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsQuoteModalOpen(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: cardBackground }]}
            onPress={() => undefined}
          >
            <ThemedText style={styles.modalTitle}>引用</ThemedText>
            <PostForm
              quotePost={post}
              redirectToCurrentFeed={false}
              onSuccess={() => setIsQuoteModalOpen(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isReplyModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReplyModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsReplyModalOpen(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: cardBackground }]}
            onPress={() => undefined}
          >
            <ThemedText style={styles.modalTitle}>返信</ThemedText>
            <PostForm
              replyPost={post}
              redirectToCurrentFeed={false}
              onSuccess={() => setIsReplyModalOpen(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isDiffuseConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDiffuseConfirmOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsDiffuseConfirmOpen(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: cardBackground }]}
            onPress={() => undefined}
          >
            <ThemedText style={styles.modalTitle}>拡散を取り消す</ThemedText>
            <ThemedText>拡散を取り消しますか？</ThemedText>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor }]}
                onPress={() => setIsDiffuseConfirmOpen(false)}
              >
                <ThemedText>キャンセル</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.dangerButton,
                  { borderColor: "#d93838" },
                ]}
                onPress={async () => {
                  await executeDiffuseToggle({ post, addPosts, addToast });
                  setIsDiffuseConfirmOpen(false);
                }}
              >
                <ThemedText style={styles.primaryButtonText}>
                  取り消す
                </ThemedText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isPostMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPostMenuOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsPostMenuOpen(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: cardBackground }]}
            onPress={() => undefined}
          >
            <ThemedText style={styles.modalTitle}>投稿メニュー</ThemedText>
            <ThemedText style={styles.meta}>投稿ID: {post.aid}</ThemedText>
            <ThemedText style={styles.meta}>
              作成日: {new Date(post.created_at).toLocaleString()}
            </ThemedText>

            {isOwner ? (
              <TouchableOpacity
                style={[styles.menuButton, styles.dangerOutlineButton]}
                onPress={() =>
                  void handleDeletePost({
                    post,
                    removePost,
                    closeMenu: () => setIsPostMenuOpen(false),
                    addToast,
                  })
                }
              >
                <ThemedText style={styles.dangerText}>投稿を削除</ThemedText>
              </TouchableOpacity>
            ) : currentAccountStatus === "signed_in" ? (
              <TouchableOpacity
                style={[styles.menuButton, styles.dangerOutlineButton]}
                onPress={handleReportPress}
              >
                <ThemedText style={styles.dangerText}>投稿を通報</ThemedText>
              </TouchableOpacity>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isSignInModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSignInModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsSignInModalOpen(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: cardBackground }]}
            onPress={() => undefined}
          >
            <ThemedText style={styles.modalTitle}>
              サインインが必要です
            </ThemedText>
            <ThemedText>この操作を行うにはサインインしてください。</ThemedText>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor }]}
                onPress={() => setIsSignInModalOpen(false)}
              >
                <ThemedText>閉じる</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.primaryButton,
                  { backgroundColor: tintColor, borderColor: tintColor },
                ]}
                onPress={() => {
                  setIsSignInModalOpen(false);
                  router.push("/signin");
                }}
              >
                <ThemedText style={styles.primaryButtonText}>
                  サインインする
                </ThemedText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isReportModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReportModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsReportModalOpen(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: cardBackground }]}
            onPress={() => undefined}
          >
            <ThemedText style={styles.modalTitle}>投稿を通報</ThemedText>

            <ThemedText style={styles.label}>通報の理由</ThemedText>
            <ScrollView style={styles.categoryList}>
              {REPORT_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.key}
                  style={[
                    styles.categoryButton,
                    {
                      borderColor:
                        reportCategory === category.key
                          ? tintColor
                          : borderColor,
                    },
                  ]}
                  onPress={() => setReportCategory(category.key)}
                >
                  <ThemedText>{category.label}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ThemedText style={styles.label}>詳細（任意）</ThemedText>
            <TextInput
              value={reportDetail}
              onChangeText={setReportDetail}
              multiline
              placeholder="詳細を入力してください"
              placeholderTextColor="#888"
              style={[
                styles.input,
                styles.reportInput,
                {
                  color: textColor,
                  borderColor,
                  backgroundColor: cardBackground,
                },
              ]}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor }]}
                onPress={() => setIsReportModalOpen(false)}
              >
                <ThemedText>キャンセル</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.dangerButton,
                  { borderColor: "#d93838" },
                ]}
                onPress={submitReport}
              >
                <ThemedText style={styles.primaryButtonText}>
                  {isSubmitting ? "送信中..." : "通報する"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    margin: 0,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  ratingGroup: {
    flexDirection: "row",
    gap: 16,
  },
  count: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
    minWidth: 16,
  },
  diffusedCount: {
    color: "#17bf63",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  label: {
    fontSize: 13,
    opacity: 0.8,
  },
  meta: {
    fontSize: 12,
    opacity: 0.7,
  },
  input: {
    minHeight: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: "top",
  },
  reportInput: {
    minHeight: 90,
  },
  categoryList: {
    maxHeight: 180,
  },
  categoryButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  modalActions: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  primaryButton: {},
  dangerButton: {
    backgroundColor: "#d93838",
  },
  primaryButtonText: {
    color: "#fff",
  },
  menuButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dangerOutlineButton: {
    borderColor: "#d93838",
  },
  dangerText: {
    color: "#d93838",
  },
});
