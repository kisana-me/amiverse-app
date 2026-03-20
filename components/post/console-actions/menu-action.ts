import { Alert } from "react-native";

import { api } from "@/lib/axios";
import { CurrentAccount } from "@/providers/CurrentAccountProvider";
import { PostType } from "@/types/post";

export const REPORT_CATEGORIES = [
  { key: "spam", label: "スパム・迷惑" },
  { key: "hate", label: "ヘイト・嫌がらせ・いじめ・差別" },
  { key: "disinformation", label: "偽情報・なりすまし" },
  { key: "violence", label: "暴力的・テロ・過激的思想" },
  { key: "sensitive", label: "センシティブ・性的・残酷" },
  { key: "suicide", label: "自殺・自傷" },
  { key: "illegal", label: "違法・規制対象・詐欺・不正" },
  { key: "theft", label: "盗用・著作権侵害" },
  { key: "privacy", label: "不同意・プライバシー侵害" },
  { key: "other", label: "その他" },
] as const;

type ReportCategory = (typeof REPORT_CATEGORIES)[number]["key"];

type DeletePostParams = {
  post: PostType;
  removePost: (aid: string) => void;
  closeMenu: () => void;
  addToast: (toast: { message: string; detail?: string }) => void;
};

type SubmitReportParams = {
  post: PostType;
  category: ReportCategory;
  detail: string;
  closeReportModal: () => void;
  closeMenu: () => void;
  addToast: (toast: { message: string; detail?: string }) => void;
};

export function isPostOwner(post: PostType, currentAccount: CurrentAccount) {
  return currentAccount?.aid === post.account.aid;
}

export function openPostMenu(setOpen: (open: boolean) => void) {
  setOpen(true);
}

export async function handleDeletePost({
  post,
  removePost,
  closeMenu,
  addToast,
}: DeletePostParams) {
  const confirmed = await new Promise<boolean>((resolve) => {
    Alert.alert("投稿を削除", "本当に削除しますか？", [
      { text: "キャンセル", style: "cancel", onPress: () => resolve(false) },
      {
        text: "削除する",
        style: "destructive",
        onPress: () => resolve(true),
      },
    ]);
  });

  if (!confirmed) return;

  try {
    await api.delete(`/posts/${post.aid}`);
    removePost(post.aid);
    closeMenu();
    addToast({ message: "投稿を削除しました" });
  } catch (error) {
    console.error("Delete failed", error);
    addToast({ message: "削除に失敗しました" });
  }
}

export async function submitPostReport({
  post,
  category,
  detail,
  closeReportModal,
  closeMenu,
  addToast,
}: SubmitReportParams) {
  try {
    await api.post("/reports", {
      report: {
        target_type: "post",
        target_aid: post.aid,
        category,
        description: detail,
      },
    });

    addToast({ message: "通報しました" });
    closeReportModal();
    closeMenu();
    return true;
  } catch (error) {
    console.error("Report failed", error);
    addToast({ message: "通報に失敗しました" });
    return false;
  }
}
