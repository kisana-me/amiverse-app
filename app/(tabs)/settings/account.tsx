import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColors } from "@/providers/UIProvider";
import { api } from "@/lib/axios";
import { useCurrentAccount } from "@/providers/CurrentAccountProvider";
import { useToast } from "@/providers/ToastProvider";

type FormState = {
  name: string;
  name_id: string;
  description: string;
  birthdate: string;
};

function formatDateForInput(dateStr?: string): string {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0] ?? "";
}

function assetToFormFile(
  asset: ImagePicker.ImagePickerAsset,
  fallback: string,
) {
  const uri = asset.uri;
  const name = asset.fileName || fallback;
  const type = asset.mimeType || "image/jpeg";
  return { uri, name, type } as any;
}

export default function AccountSettingsScreen() {
  const borderColor = useColors().border_color;
  const backgroundColor = useColors().background_color;
  const textColor = useColors().font_color;
  const tintColor = useColors().link_color;

  const { addToast } = useToast();
  const { currentAccount, setCurrentAccount, currentAccountStatus } =
    useCurrentAccount();

  const [form, setForm] = useState<FormState>({
    name: "",
    name_id: "",
    description: "",
    birthdate: "",
  });
  const [iconAsset, setIconAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [bannerAsset, setBannerAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const redirectedRef = useRef(false);

  useEffect(() => {
    if (currentAccountStatus === "signed_out" && !redirectedRef.current) {
      redirectedRef.current = true;
      addToast({ message: "エラー", detail: "サインインしてください" });
      router.push("/signin" as any);
      return;
    }

    if (currentAccountStatus === "signed_in" && currentAccount) {
      setForm({
        name: currentAccount.name || "",
        name_id: currentAccount.name_id || "",
        description: currentAccount.description || "",
        birthdate: formatDateForInput(currentAccount.birthdate),
      });
    }
  }, [addToast, currentAccount, currentAccountStatus]);

  const previewIconUri = useMemo(() => {
    return iconAsset?.uri || currentAccount?.icon_url || null;
  }, [iconAsset?.uri, currentAccount?.icon_url]);

  const previewBannerUri = useMemo(() => {
    return bannerAsset?.uri || currentAccount?.banner_url || null;
  }, [bannerAsset?.uri, currentAccount?.banner_url]);

  const ensurePermission = useCallback(async () => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) {
      addToast({
        message: "権限エラー",
        detail: "写真へのアクセスを許可してください",
      });
      return false;
    }
    return true;
  }, [addToast]);

  const pickIcon = useCallback(async () => {
    if (!(await ensurePermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.9,
      aspect: [1, 1],
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    setIconAsset(asset);
  }, [ensurePermission]);

  const pickBanner = useCallback(async () => {
    if (!(await ensurePermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.9,
      aspect: [16, 9],
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    setBannerAsset(asset);
  }, [ensurePermission]);

  const handleSubmit = useCallback(async () => {
    if (currentAccountStatus !== "signed_in") return;

    setIsSubmitting(true);
    setErrors([]);

    const submitData = new FormData();
    submitData.append("account[name]", form.name);
    submitData.append("account[name_id]", form.name_id);
    submitData.append("account[description]", form.description);
    submitData.append("account[birthdate]", form.birthdate);

    if (iconAsset) {
      submitData.append(
        "account[icon_file]",
        assetToFormFile(iconAsset, "icon.jpg"),
      );
    }
    if (bannerAsset) {
      submitData.append(
        "account[banner_file]",
        assetToFormFile(bannerAsset, "banner.jpg"),
      );
    }

    try {
      const res = await api.post("/settings/account", submitData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.account) {
        setCurrentAccount(res.data.account);
      }
      addToast({ message: "成功", detail: "アカウント情報を更新しました" });
      router.push("/dashboard" as any);
    } catch (error: unknown) {
      const err = error as any;
      const data = err?.response?.data;
      if (data?.errors) {
        setErrors(
          Array.isArray(data.errors) ? data.errors : [String(data.errors)],
        );
        addToast({
          message: "エラー",
          detail: data.message || "更新に失敗しました",
        });
      } else if (data?.message) {
        setErrors([String(data.message)]);
        addToast({ message: "エラー", detail: String(data.message) });
      } else {
        setErrors(["更新に失敗しました"]);
        addToast({ message: "エラー", detail: "予期せぬエラーが発生しました" });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    addToast,
    bannerAsset,
    currentAccountStatus,
    form.birthdate,
    form.description,
    form.name,
    form.name_id,
    iconAsset,
    setCurrentAccount,
  ]);

  if (currentAccountStatus === "loading") {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <MainHeader>
          <ThemedText type="defaultSemiBold">アカウント設定</ThemedText>
        </MainHeader>
        <ThemedView style={styles.center}>
          <ActivityIndicator />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (currentAccountStatus === "signed_out") {
    return null;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <MainHeader>
        <ThemedText type="defaultSemiBold">アカウント設定</ThemedText>
      </MainHeader>

      <ScrollView contentContainerStyle={styles.container}>
        {errors.length > 0 ? (
          <ThemedView style={[styles.errorBox, { borderColor }]}>
            {errors.map((e, i) => (
              <ThemedText key={`${e}:${i}`} style={styles.errorText}>
                {e}
              </ThemedText>
            ))}
          </ThemedView>
        ) : null}

        <ThemedView style={[styles.previewCard, { borderColor }]}>
          <Pressable onPress={pickBanner} style={styles.bannerWrap}>
            {previewBannerUri ? (
              <Image
                source={{ uri: previewBannerUri }}
                style={styles.banner}
                contentFit="cover"
                cachePolicy="disk"
              />
            ) : (
              <View style={[styles.banner, { backgroundColor }]} />
            )}
            <View
              style={[
                styles.overlay,
                { borderColor, backgroundColor, opacity: 0.88 },
              ]}
            >
              <ThemedText style={{ color: textColor, fontSize: 12 }}>
                バナーを変更
              </ThemedText>
            </View>
          </Pressable>

          <Pressable
            onPress={pickIcon}
            style={[styles.iconWrap, { borderColor, backgroundColor }]}
          >
            {previewIconUri ? (
              <Image
                source={{ uri: previewIconUri }}
                style={styles.icon}
                contentFit="cover"
                cachePolicy="disk"
              />
            ) : (
              <View style={[styles.icon, { backgroundColor }]} />
            )}
            <View
              style={[
                styles.overlaySmall,
                { borderColor, backgroundColor, opacity: 0.88 },
              ]}
            >
              <ThemedText style={{ color: textColor, fontSize: 11 }}>
                アイコン
              </ThemedText>
            </View>
          </Pressable>
        </ThemedView>

        <ThemedView style={[styles.formCard, { borderColor }]}>
          <View style={styles.field}>
            <ThemedText style={styles.label}>名前</ThemedText>
            <TextInput
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
              placeholder="表示名"
              placeholderTextColor={borderColor}
              style={[styles.input, { borderColor, color: textColor }]}
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>ユーザーID</ThemedText>
            <View style={[styles.inputRow, { borderColor }]}>
              <ThemedText style={styles.prefix}>@</ThemedText>
              <TextInput
                value={form.name_id}
                onChangeText={(v) => setForm((p) => ({ ...p, name_id: v }))}
                placeholder="username"
                placeholderTextColor={borderColor}
                style={[styles.inputInline, { color: textColor }]}
                editable={!isSubmitting}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>自己紹介</ThemedText>
            <TextInput
              value={form.description}
              onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
              placeholder="自己紹介を入力..."
              placeholderTextColor={borderColor}
              style={[styles.textarea, { borderColor, color: textColor }]}
              editable={!isSubmitting}
              multiline
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>誕生日</ThemedText>
            <TextInput
              value={form.birthdate}
              onChangeText={(v) => setForm((p) => ({ ...p, birthdate: v }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={borderColor}
              style={[styles.input, { borderColor, color: textColor }]}
              editable={!isSubmitting}
              autoCapitalize="none"
            />
          </View>
        </ThemedView>

        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.submit,
            {
              backgroundColor: tintColor,
              opacity: isSubmitting ? 0.6 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <ThemedText style={{ color: backgroundColor }}>
            {isSubmitting ? "保存中..." : "変更を保存"}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 16, gap: 14 },
  errorBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  errorText: { opacity: 0.9 },
  previewCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    overflow: "hidden",
  },
  bannerWrap: { width: "100%" },
  banner: { width: "100%", height: 160 },
  iconWrap: {
    position: "absolute",
    left: 14,
    bottom: 14,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  icon: { width: 72, height: 72 },
  overlay: {
    position: "absolute",
    right: 12,
    bottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  overlaySmall: {
    position: "absolute",
    right: 6,
    bottom: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  formCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  field: { gap: 6 },
  label: { opacity: 0.85 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  prefix: { opacity: 0.7, marginRight: 6 },
  inputInline: { flex: 1, paddingVertical: 10 },
  textarea: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 110,
    textAlignVertical: "top",
  },
  submit: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
});
