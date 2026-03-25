import { api } from "@/lib/axios";
import { PostType } from "@/types/post";

export async function submitPost(formData: FormData) {
  const res = await api.post("/posts", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return (res.data?.data ?? res.data) as PostType;
}
