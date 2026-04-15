import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from "expo-tracking-transparency";
import { Platform } from "react-native";

const PERSONALIZATION_CONSENT_KEY = "personalization_consent_v1";

export type PersonalizationConsent = "allow" | "deny";
export type TrackingPermissionStatus = "denied" | "granted" | "undetermined";

export async function getTrackingPermissionStatus(): Promise<TrackingPermissionStatus> {
  if (Platform.OS !== "ios") return "granted";

  const { status } = await getTrackingPermissionsAsync();
  if (
    status === "granted" ||
    status === "denied" ||
    status === "undetermined"
  ) {
    return status;
  }
  return "denied";
}

export async function requestTrackingPermissionIfNeeded(): Promise<TrackingPermissionStatus> {
  if (Platform.OS !== "ios") return "granted";

  const current = await getTrackingPermissionsAsync();
  if (current.status === "granted" || current.status === "denied") {
    return current.status;
  }

  const next = await requestTrackingPermissionsAsync();
  if (next.status === "granted" || next.status === "denied") {
    return next.status;
  }
  return "undetermined";
}

export async function openSystemSettings(): Promise<void> {
  await Linking.openSettings();
}

export async function getPersonalizationConsent(): Promise<PersonalizationConsent | null> {
  try {
    const value = await AsyncStorage.getItem(PERSONALIZATION_CONSENT_KEY);
    if (value === "allow" || value === "deny") {
      return value;
    }
    return null;
  } catch (error) {
    console.error(
      "[tracking-permission] Failed to read personalization consent:",
      error,
    );
    return null;
  }
}

export async function setPersonalizationConsent(
  value: PersonalizationConsent,
): Promise<void> {
  try {
    await AsyncStorage.setItem(PERSONALIZATION_CONSENT_KEY, value);
  } catch (error) {
    console.error(
      "[tracking-permission] Failed to save personalization consent:",
      error,
    );
  }
}
