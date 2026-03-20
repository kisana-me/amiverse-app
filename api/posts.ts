import { api } from "@/lib/axios";
import { PostType } from "@/types/post";

export type FetchPostsOptions = {
  token?: string | null;
  cursor?: string;
  limit?: number;
};

export async function fetchPosts(
  options: FetchPostsOptions = {},
): Promise<PostType[]> {
  const res = await api.get<PostType[]>("posts", {
    headers: options.token
      ? {
          Authorization: `Bearer ${options.token}`,
        }
      : undefined,
    params: {
      cursor: options.cursor,
      limit: options.limit,
    },
  });

  return res.data;
}
