import { Alert } from "react-native";

import { api } from "@/lib/axios";
import { PostType } from "@/types/post";

type SubmitQuoteParams = {
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

export async function submitQuote({
  post,
  content,
  addPosts,
  addToast,
}: SubmitQuoteParams) {
  const trimmed = content.trim();
  if (!trimmed) {
    Alert.alert("入力エラー", "引用内容を入力してください。");
    return false;
  }

  try {
    await submitPostWithFallback([
      { content: trimmed, quote_aid: post.aid },
      { post: { content: trimmed, quote_aid: post.aid } },
    ]);

    addPosts([
      {
        ...post,
        quotes_count: (post.quotes_count ?? 0) + 1,
      },
    ]);

    addToast({ message: "引用を投稿しました" });
    return true;
  } catch (error) {
    console.error("Quote failed", error);
    addToast({ message: "引用に失敗しました" });
    return false;
  }
}
