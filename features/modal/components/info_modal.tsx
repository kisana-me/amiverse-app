import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useColors } from "@/providers/UIProvider";

type ActionVariant = "default" | "destructive";

export type InfoModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  closeLabel?: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  closeOnAction?: boolean;
  actionVariant?: ActionVariant;
  closeOnBackdropPress?: boolean;
};

export function InfoModal({
  visible,
  onClose,
  title,
  message,
  closeLabel = "閉じる",
  actionLabel,
  onAction,
  closeOnAction = true,
  actionVariant = "default",
  closeOnBackdropPress = true,
}: InfoModalProps) {
  const cardBackground = useColors().background_color;
  const borderColor = useColors().border_color;
  const tintColor = useColors().link_color;

  const handleActionPress = () => {
    if (!onAction) return;
    void Promise.resolve(onAction());
    if (closeOnAction) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.modalBackdrop}
        onPress={closeOnBackdropPress ? onClose : undefined}
      >
        <Pressable
          style={[
            styles.modalCard,
            { backgroundColor: cardBackground, borderColor },
          ]}
          onPress={() => undefined}
        >
          <ThemedText style={styles.modalTitle}>{title}</ThemedText>
          <ThemedText>{message}</ThemedText>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, { borderColor }]}
              onPress={onClose}
            >
              <ThemedText>{closeLabel}</ThemedText>
            </TouchableOpacity>
            {actionLabel && onAction ? (
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  actionVariant === "destructive"
                    ? styles.modalButtonDestructive
                    : { borderColor: tintColor },
                ]}
                onPress={handleActionPress}
              >
                <ThemedText
                  style={
                    actionVariant === "destructive"
                      ? styles.modalButtonDestructiveText
                      : undefined
                  }
                >
                  {actionLabel}
                </ThemedText>
              </TouchableOpacity>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
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
    borderWidth: 1,
  },
  modalButtonDestructive: {
    backgroundColor: "#d93838",
    borderColor: "#d93838",
  },
  modalButtonDestructiveText: {
    color: "#fff",
    fontWeight: "700",
  },
});
