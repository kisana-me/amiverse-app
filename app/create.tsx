import { router, useNavigation } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { InfoModal } from "@/features/modal";
import { PostForm } from "@/features/post_form";

export default function CreatePostScreen() {
  const navigation = useNavigation();

  const [hasDraft, setHasDraft] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const pendingActionRef = useRef<any>(null);
  const allowLeaveRef = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event: any) => {
      if (allowLeaveRef.current) {
        allowLeaveRef.current = false;
        return;
      }
      if (!hasDraft) {
        return;
      }

      event.preventDefault();
      pendingActionRef.current = event.data.action;
      setIsLeaveConfirmOpen(true);
    });

    return unsubscribe;
  }, [hasDraft, navigation]);

  const closeLeaveConfirm = () => {
    pendingActionRef.current = null;
    setIsLeaveConfirmOpen(false);
  };

  const confirmLeave = () => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setIsLeaveConfirmOpen(false);
    allowLeaveRef.current = true;

    if (action) {
      navigation.dispatch(action);
      return;
    }

    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <MainHeader>
        <ThemedText type="defaultSemiBold">新規投稿</ThemedText>
      </MainHeader>

      <ThemedView style={styles.container}>
        <PostForm
          onDraftStateChange={setHasDraft}
          onSuccess={() => {
            allowLeaveRef.current = true;
            setHasDraft(false);
          }}
        />
      </ThemedView>

      <InfoModal
        visible={isLeaveConfirmOpen}
        onClose={closeLeaveConfirm}
        title="投稿を破棄しますか？"
        message="入力中の本文・添付内容が失われます。"
        closeLabel="キャンセル"
        actionLabel="破棄して戻る"
        onAction={confirmLeave}
        actionVariant="destructive"
        closeOnAction={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 12,
  },
});
