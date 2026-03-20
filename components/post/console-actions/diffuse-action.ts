import { Alert } from "react-native";

import { api } from "@/lib/axios";
import { PostType } from "@/types/post";

type ExecuteDiffuseParams = {
  post: PostType;
  addPosts: (posts: PostType[]) => void;
  addToast: (toast: { message: string; detail?: string }) => void;
};

export async function executeDiffuseToggle({
  post,
  addPosts,
  addToast,
}: ExecuteDiffuseParams) {
  const prevPost: PostType = {
    ...post,
    reactions: post.reactions ? [...post.reactions] : post.reactions,
  };

  const nextPost: PostType = {
    ...post,
    diffuses_count: post.is_diffused
      ? Math.max(0, (post.diffuses_count ?? 0) - 1)
      : (post.diffuses_count ?? 0) + 1,
    is_diffused: !post.is_diffused,
  };

  addPosts([nextPost]);

  try {
    if (post.is_diffused) {
      await api.delete(`/posts/${post.aid}/diffuse`);
      addToast({ message: "拡散を取り消しました" });
      return;
    }

    await api.post(`/posts/${post.aid}/diffuse`);
    addToast({ message: "拡散しました" });
  } catch (error) {
    console.error("Diffuse failed", error);
    addPosts([prevPost]);
    Alert.alert("エラー", "拡散の更新に失敗しました。");
  }
}
