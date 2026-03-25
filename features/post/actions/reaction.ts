import { Alert } from "react-native";

import { api } from "@/lib/axios";
import { EmojiType } from "@/types/emoji";
import { PostType } from "@/types/post";

export type ReactionInput = EmojiType | string;

type ConfirmModalState = {
  title: string;
  message: string;
  actionText: string;
};

type ProcessReactionParams = {
  emojiInput: ReactionInput;
  post: PostType;
  setPost: (post: PostType) => void;
  addPosts: (posts: PostType[]) => void;
};

type HandleEmojiReactionPressParams = {
  emojiInput: ReactionInput;
  post: PostType;
  setIsEmojiMenuOpen: (open: boolean) => void;
  setPendingReactionInput: (input: ReactionInput | null) => void;
  setConfirmModalState: (state: ConfirmModalState) => void;
  setIsReactionConfirmOpen: (open: boolean) => void;
  processReaction: (emojiInput: ReactionInput) => Promise<void>;
};

export async function processReaction({
  emojiInput,
  post,
  setPost,
  addPosts,
}: ProcessReactionParams) {
  const emojiNameId =
    typeof emojiInput === "string" ? emojiInput : emojiInput.name_id;

  const currentReaction = post.reactions?.find((r) => r.reacted);
  const isRemoving = currentReaction?.name_id === emojiNameId;

  const prevPost = {
    ...post,
    reactions: post.reactions ? [...post.reactions] : [],
  };

  const nextReactions = prevPost.reactions ? [...prevPost.reactions] : [];

  if (currentReaction) {
    const currentIndex = nextReactions.findIndex(
      (r) => r.name_id === currentReaction.name_id,
    );

    if (currentIndex !== -1) {
      const currentCount = nextReactions[currentIndex].reactions_count ?? 0;
      const updatedCurrent = {
        ...nextReactions[currentIndex],
        reactions_count: Math.max(0, currentCount - 1),
        reacted: false,
      };

      if ((updatedCurrent.reactions_count ?? 0) === 0) {
        nextReactions.splice(currentIndex, 1);
      } else {
        nextReactions[currentIndex] = updatedCurrent;
      }
    }
  }

  if (!isRemoving) {
    const nextIndex = nextReactions.findIndex((r) => r.name_id === emojiNameId);

    if (nextIndex !== -1) {
      const nextCount = nextReactions[nextIndex].reactions_count ?? 0;
      nextReactions[nextIndex] = {
        ...nextReactions[nextIndex],
        reactions_count: nextCount + 1,
        reacted: true,
      };
    } else if (typeof emojiInput !== "string") {
      nextReactions.push({
        aid: emojiInput.aid,
        name: emojiInput.name,
        name_id: emojiInput.name_id,
        reactions_count: 1,
        reacted: true,
      });
    }
  }

  const prevReactionsCount = post.reactions_count ?? 0;
  const nextPost: PostType = {
    ...post,
    reactions: nextReactions,
    reactions_count: isRemoving
      ? Math.max(0, prevReactionsCount - 1)
      : prevReactionsCount + (currentReaction ? 0 : 1),
    is_reacted: !isRemoving,
  };

  if (!isRemoving && currentReaction) {
    nextPost.reactions_count = prevReactionsCount;
  }

  setPost(nextPost);
  addPosts([nextPost]);

  try {
    if (isRemoving) {
      await api.delete(`/posts/${post.aid}/reaction`);
      return;
    }

    await api.post(`/posts/${post.aid}/reaction`, {
      emoji_name_id: emojiNameId,
    });
  } catch (error) {
    console.error("Reaction failed", error);
    setPost(prevPost);
    addPosts([prevPost]);
    Alert.alert("エラー", "リアクションの更新に失敗しました。");
  }
}

export function handleEmojiReactionPress({
  emojiInput,
  post,
  setIsEmojiMenuOpen,
  setPendingReactionInput,
  setConfirmModalState,
  setIsReactionConfirmOpen,
  processReaction,
}: HandleEmojiReactionPressParams) {
  setIsEmojiMenuOpen(false);

  const emojiNameId =
    typeof emojiInput === "string" ? emojiInput : emojiInput.name_id;
  const currentReaction = post.reactions?.find((r) => r.reacted);

  if (currentReaction) {
    setPendingReactionInput(emojiInput);

    if (currentReaction.name_id === emojiNameId) {
      setConfirmModalState({
        title: "リアクションを解除",
        message: "リアクションを解除しますか？",
        actionText: "解除する",
      });
    } else {
      setConfirmModalState({
        title: "リアクションを変更",
        message: "リアクションを変更しますか？",
        actionText: "変更する",
      });
    }

    setIsReactionConfirmOpen(true);
    return;
  }

  void processReaction(emojiInput);
}
