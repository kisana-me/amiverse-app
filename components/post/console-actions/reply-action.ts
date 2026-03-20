import { Alert } from "react-native";

import { api } from "@/lib/axios";
import { PostType } from "@/types/post";

type SubmitReplyParams = {
  post: PostType;
  content: string;
  addPosts: (posts: PostType[]) => void;
  addToast: (toast: { message: string; detail?: string }) => void;
};

async function submitPostWithFallback(payloads: unknown[]) {
  let lastError: unknown = null;

  for (const payload of payloads) {
    try {
      await api.post("/posts", payload);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function submitReply({
  post,
  content,
  addPosts,
  addToast,
}: SubmitReplyParams) {
  const trimmed = content.trim();
  if (!trimmed) {
    Alert.alert("入力エラー", "返信内容を入力してください。");
    return false;
  }

  try {
    await submitPostWithFallback([
      { content: trimmed, reply_aid: post.aid },
      { post: { content: trimmed, reply_aid: post.aid } },
    ]);

    addPosts([
      {
        ...post,
        replies_count: (post.replies_count ?? 0) + 1,
      },
    ]);

    addToast({ message: "返信を投稿しました" });
    return true;
  } catch (error) {
    console.error("Reply failed", error);
    addToast({ message: "返信に失敗しました" });
    return false;
  }
}
