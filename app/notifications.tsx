import { useScrollToTop } from "@react-navigation/native";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { formatRelativeTime } from "@/lib/format_time";
import { useCurrentAccount } from "@/providers/CurrentAccountProvider";
import { useNotifications } from "@/providers/NotificationsProvider";
import { useColors } from "@/providers/UIProvider";
import { NotificationType } from "@/types/notification";

function getNotificationText(notification: NotificationType): {
  title?: string;
  message: string;
  icon: string;
} {
  switch (notification.action) {
    case "reaction":
      return {
        message: "さんがあなたの投稿にリアクションしました",
        icon: "❤️",
      };
    case "diffuse":
      return { message: "さんがあなたの投稿を拡散しました", icon: "🔁" };
    case "reply":
      return { message: "さんがあなたの投稿に返信しました", icon: "💬" };
    case "quote":
      return { message: "さんがあなたの投稿を引用しました", icon: "✒️" };
    case "follow":
      return { message: "さんがあなたをフォローしました", icon: "👤" };
    case "mention":
      return { message: "さんがあなたをメンションしました", icon: "📢" };
    case "signin":
      return {
        title: "サインイン通知",
        message: "新しい端末からサインインがありました",
        icon: "🔑",
      };
    case "system":
      return {
        title: "システム通知",
        message: notification.content || "",
        icon: "🔔",
      };
    default:
      return { message: "新しい通知があります", icon: "❔" };
  }
}

function NotificationItem({
  notification,
}: {
  notification: NotificationType;
}) {
  const borderColor = useColors().border_color;
  const backgroundColor = useColors().background_color;

  const { title, message, icon } = useMemo(
    () => getNotificationText(notification),
    [notification],
  );

  const isUnread = !notification.checked;

  const onPress = () => {
    if (notification.post?.aid) {
      router.replace({
        pathname: "/post/[aid]",
        params: { aid: notification.post.aid, from: "timeline" },
      } as any);
      return;
    }
    if (notification.actor?.name_id) {
      router.push(`/account/${notification.actor.name_id}`);
    }
  };

  const isPressable = Boolean(
    notification.post?.aid || notification.actor?.name_id,
  );

  return (
    <Pressable
      onPress={isPressable ? onPress : undefined}
      style={({ pressed }) => [
        styles.itemPressable,
        { opacity: isPressable && pressed ? 0.7 : 1 },
      ]}
      accessibilityRole={isPressable ? "button" : undefined}
    >
      <ThemedView
        style={[
          styles.item,
          {
            borderBottomColor: borderColor,
            backgroundColor: isUnread ? backgroundColor : "transparent",
          },
        ]}
      >
        <View style={styles.itemLeft}>
          {isUnread && <ThemedText style={styles.unreadLabel}>New</ThemedText>}
          <ThemedText style={styles.icon}>{icon}</ThemedText>
        </View>

        <View style={styles.itemRight}>
          {notification.actor?.icon_url ? (
            <View style={styles.headerRow}>
              <Image
                source={{ uri: notification.actor.icon_url }}
                style={styles.actorIcon}
                contentFit="cover"
              />
            </View>
          ) : null}

          <View style={styles.body}>
            {!!title && (
              <ThemedText type="defaultSemiBold" style={styles.title}>
                {title}
              </ThemedText>
            )}
            <ThemedText style={styles.message}>
              {notification.actor?.name ? (
                <ThemedText type="defaultSemiBold">
                  {notification.actor.name}
                </ThemedText>
              ) : null}
              {notification.actor?.name ? "" : null}
              {message}
            </ThemedText>
          </View>

          {!!notification.post && (
            <ThemedView style={[styles.postPreview, { borderColor }]}>
              <ThemedText style={styles.postPreviewText} numberOfLines={2}>
                {notification.post.content
                  ? notification.post.content.slice(0, 100)
                  : "[メディアのみ投稿]"}
              </ThemedText>
            </ThemedView>
          )}

          <ThemedText style={styles.time}>
            {formatRelativeTime(new Date(notification.created_at))}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const listRef = useRef<FlatList<NotificationType> | null>(null);
  useScrollToTop(listRef);

  const borderColor = useColors().border_color;
  const { currentAccountStatus } = useCurrentAccount();
  const canFetchNotifications = currentAccountStatus === "signed_in";
  const {
    notifications,
    isLoading,
    hasMore,
    fetchedAt,
    fetchNotifications,
    markAsRead,
  } = useNotifications();

  useEffect(() => {
    if (!canFetchNotifications) return;
    fetchNotifications(true);
  }, [canFetchNotifications, fetchNotifications]);

  useEffect(() => {
    return () => {
      markAsRead();
    };
  }, [markAsRead]);

  return (
    <>
      <MainHeader>
        <ThemedText type="defaultSemiBold">通知</ThemedText>
      </MainHeader>

      <FlatList
        ref={listRef}
        data={notifications}
        keyExtractor={(item) => item.aid}
        renderItem={({ item }) => <NotificationItem notification={item} />}
        onRefresh={() => {
          if (!canFetchNotifications) return;
          fetchNotifications(true);
        }}
        refreshing={canFetchNotifications && isLoading}
        ListHeaderComponent={
          <ThemedView
            style={[styles.metaRow, { borderBottomColor: borderColor }]}
          >
            <ThemedText style={styles.metaText}>
              {fetchedAt
                ? `最終更新: ${new Date(fetchedAt).toLocaleString()}`
                : "未取得"}
            </ThemedText>
            <Pressable
              onPress={() => {
                if (!canFetchNotifications) return;
                fetchNotifications(true);
              }}
              disabled={!canFetchNotifications || isLoading}
              style={[
                styles.reloadButton,
                {
                  borderColor,
                  opacity: !canFetchNotifications || isLoading ? 0.5 : 1,
                },
              ]}
            >
              <ThemedText style={styles.reloadText}>
                {isLoading ? "更新中..." : "再読み込み"}
              </ThemedText>
            </Pressable>
          </ThemedView>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator />
            </View>
          ) : (
            <View style={styles.center}>
              <ThemedText style={styles.subtle}>通知はありません</ThemedText>
            </View>
          )
        }
        ListFooterComponent={
          notifications.length === 0 ? null : isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator />
            </View>
          ) : canFetchNotifications && hasMore ? (
            <View style={styles.footer}>
              <Pressable
                onPress={() => {
                  if (!canFetchNotifications) return;
                  fetchNotifications(false);
                }}
                style={[styles.loadMore, { borderColor }]}
              >
                <ThemedText>もっと見る</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.center}>
              <ThemedText style={styles.subtle}>
                これ以上通知はありません
              </ThemedText>
            </View>
          )
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  itemPressable: {},
  metaRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaText: { fontSize: 12, opacity: 0.7 },
  reloadButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  reloadText: { fontSize: 12 },
  item: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemLeft: { width: 44, alignItems: "center" },
  unreadLabel: { fontSize: 10, opacity: 0.8, marginBottom: 2 },
  icon: { fontSize: 22 },
  itemRight: { flex: 1, gap: 6 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  actorIcon: { width: 32, height: 32, borderRadius: 16 },
  body: { gap: 4 },
  title: { fontSize: 13 },
  message: { fontSize: 15, lineHeight: 20 },
  postPreview: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 10,
  },
  postPreviewText: { fontSize: 13, opacity: 0.8 },
  time: { fontSize: 12, opacity: 0.7 },
  loading: { padding: 20, alignItems: "center" },
  footer: { paddingVertical: 18, alignItems: "center" },
  loadMore: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  center: { padding: 20, alignItems: "center" },
  subtle: { opacity: 0.7 },
});
