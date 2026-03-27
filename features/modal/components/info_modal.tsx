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

export type InfoModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  closeLabel?: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
};

export function InfoModal({
  visible,
  onClose,
  title,
  message,
  closeLabel = "閉じる",
  actionLabel,
  onAction,
}: InfoModalProps) {
  const cardBackground = useColors().background_color;
  const borderColor = useColors().border_color;
  const tintColor = useColors().link_color;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
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
                style={[styles.modalButton, { borderColor: tintColor }]}
                onPress={() => {
                  onClose();
                  void Promise.resolve(onAction());
                }}
              >
                <ThemedText>{actionLabel}</ThemedText>
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
});
