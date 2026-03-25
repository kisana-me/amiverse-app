import { useColors } from "@/providers/UIProvider";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import { useCurrentAccount } from "@/providers/CurrentAccountProvider";
import { useModal } from "@/providers/ModalProvider";
import { usePosts } from "@/providers/PostsProvider";
import { EmojiType } from "@/types/emoji";
import { PostType } from "@/types/post";
import {
  handleEmojiReactionPress,
  processReaction,
  ReactionInput,
} from "../actions/reaction";
import { runSignedInAction } from "../actions/signed_in";

export default function PostReactions({ post }: { post: PostType }) {
  const tintColor = useColors().link_color;
  const modalCardBackground = useColors().background_color;
  const modalText = useColors().font_color;
  const { addPosts } = usePosts();
  const { currentAccountStatus } = useCurrentAccount();
  const { openSignInModal } = useModal();

  const [isEmojiMenuOpen, setIsEmojiMenuOpen] = useState(false);
  const [isReactionConfirmOpen, setIsReactionConfirmOpen] = useState(false);
  const [pendingReactionInput, setPendingReactionInput] =
    useState<ReactionInput | null>(null);
  const [confirmModalState, setConfirmModalState] = useState({
    title: "リアクションを解除",
    message: "リアクションを解除しますか？",
    actionText: "解除する",
  });

  const defaultEmojis = useMemo<EmojiType[]>(
    () => [
      { aid: "default-like", name: "👍", name_id: "thumbs_up" },
      { aid: "default-love", name: "❤️", name_id: "heart" },
      { aid: "default-laugh", name: "😂", name_id: "joy" },
      { aid: "default-wow", name: "😮", name_id: "open_mouth" },
      { aid: "default-sad", name: "😢", name_id: "cry" },
      { aid: "default-fire", name: "🔥", name_id: "fire" },
    ],
    [],
  );

  const emojiMenuItems = useMemo(() => {
    const merged = new Map<string, EmojiType>();

    defaultEmojis.forEach((emoji) => {
      merged.set(emoji.name_id, emoji);
    });

    post.reactions?.forEach((emoji) => {
      merged.set(emoji.name_id, {
        aid: emoji.aid,
        name: emoji.name,
        name_id: emoji.name_id,
      });
    });

    return Array.from(merged.values());
  }, [defaultEmojis, post.reactions]);

  const runProcessReaction = async (emojiInput: ReactionInput) => {
    await processReaction({
      emojiInput,
      post,
      setPost: () => undefined,
      addPosts,
    });
  };

  const handlePrimaryReactionPress = () => {
    if (post.is_busy) return;
    runSignedInAction(currentAccountStatus, openSignInModal, () => {
      setIsEmojiMenuOpen(true);
    });
  };

  const handleEmojiReactionPressWithAuth = (emojiInput: ReactionInput) => {
    if (post.is_busy) return;
    runSignedInAction(currentAccountStatus, openSignInModal, () => {
      handleEmojiReactionPress({
        emojiInput,
        post,
        setIsEmojiMenuOpen,
        setPendingReactionInput,
        setConfirmModalState,
        setIsReactionConfirmOpen,
        processReaction: runProcessReaction,
      });
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePrimaryReactionPress}
        style={[
          styles.reactionButton,
          post.is_reacted && styles.reactedButton,
          { borderColor: post.is_reacted ? tintColor : "transparent" },
        ]}
      >
        <View style={styles.icon}>
          <Svg
            viewBox="0 0 100 100"
            width={16}
            height={16}
            fill="currentColor"
            color={post.is_reacted ? "#e0245e" : "#666"}
          >
            <Path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M76 11H70V24H57V30H70V43H76V30H89V24H76V11ZM50 27C50 21.5581 51.8899 16.5576 55.0492 12.6192C52.7609 12.2123 50.4052 12 48 12C25.9086 12 8 29.9086 8 52C8 74.0914 25.9086 92 48 92C70.0914 92 88 74.0914 88 52C88 49.5948 87.7877 47.2391 87.3808 44.9508C83.4424 48.1101 78.4419 50 73 50C60.2975 50 50 39.7025 50 27ZM36 34C32.6863 34 30 36.6863 30 40C30 43.3137 32.6863 46 36 46C39.3137 46 42 43.3137 42 40C42 36.6863 39.3137 34 36 34ZM32.8247 59C32.3692 59 32 59.3693 32 59.8247C32 68.2058 38.7942 75 47.1753 75H51.8247C60.2058 75 67 68.2058 67 59.8247C67 59.3693 66.6308 59 66.1753 59H32.8247Z"
            />
          </Svg>
        </View>
        <ThemedText style={[styles.count]}>
          {post.reactions_count || 0}
        </ThemedText>
      </TouchableOpacity>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
      >
        {post.reactions?.map((reaction: EmojiType) => (
          <TouchableOpacity
            onPress={() => handleEmojiReactionPressWithAuth(reaction.name_id)}
            key={reaction.aid}
            style={[
              styles.reactionButton,
              reaction.reacted && styles.reactedButton,
              { borderColor: reaction.reacted ? tintColor : "transparent" },
            ]}
          >
            <ThemedText style={styles.emoji}>{reaction.name}</ThemedText>
            <ThemedText style={[styles.count]}>
              {reaction.reactions_count}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={isEmojiMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEmojiMenuOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsEmojiMenuOpen(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: modalCardBackground }]}
            onPress={() => undefined}
          >
            <ThemedText style={styles.modalTitle}>
              リアクションを選択
            </ThemedText>
            <View style={styles.emojiMenuList}>
              {emojiMenuItems.map((emoji) => (
                <TouchableOpacity
                  key={emoji.aid}
                  style={styles.emojiMenuButton}
                  onPress={() => handleEmojiReactionPressWithAuth(emoji)}
                >
                  <ThemedText style={styles.emoji}>{emoji.name}</ThemedText>
                  <ThemedText style={styles.emojiLabel}>
                    {emoji.name_id}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isReactionConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReactionConfirmOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsReactionConfirmOpen(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: modalCardBackground }]}
            onPress={() => undefined}
          >
            <ThemedText style={styles.modalTitle}>
              {confirmModalState.title}
            </ThemedText>
            <ThemedText style={[styles.modalMessage, { color: modalText }]}>
              {confirmModalState.message}
            </ThemedText>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setIsReactionConfirmOpen(false);
                  setPendingReactionInput(null);
                }}
              >
                <ThemedText>キャンセル</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalPrimaryButton]}
                onPress={async () => {
                  if (pendingReactionInput) {
                    await runProcessReaction(pendingReactionInput);
                  }
                  setIsReactionConfirmOpen(false);
                  setPendingReactionInput(null);
                }}
              >
                <ThemedText style={styles.modalPrimaryText}>
                  {confirmModalState.actionText}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  reactionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 0,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderRadius: 6,
    marginRight: 8,
  },
  reactedButton: {
    borderColor: "transparent",
  },
  icon: {
    marginRight: 4,
  },
  count: {
    fontSize: 12,
    color: "#666",
  },
  scroll: {
    flexGrow: 0,
  },
  emoji: {
    fontSize: 14,
    marginRight: 4,
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
    maxWidth: 360,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalMessage: {
    fontSize: 14,
  },
  emojiMenuList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  emojiMenuButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#999",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emojiLabel: {
    fontSize: 10,
    opacity: 0.6,
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
    borderColor: "#999",
  },
  modalPrimaryButton: {
    backgroundColor: "#d93838",
    borderColor: "#d93838",
  },
  modalPrimaryText: {
    color: "#fff",
  },
});
