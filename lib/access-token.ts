import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "amiverse.access_token";

let cachedToken: string | null | undefined;

const isDev =
  typeof __DEV__ !== "undefined"
    ? __DEV__
    : process.env.NODE_ENV !== "production";

async function canUseSecureStore(): Promise<boolean> {
  try {
    if (
      typeof SecureStore.getItemAsync !== "function" ||
      typeof SecureStore.setItemAsync !== "function" ||
      typeof SecureStore.deleteItemAsync !== "function"
    ) {
      return false;
    }

    if (typeof SecureStore.isAvailableAsync === "function") {
      return await SecureStore.isAvailableAsync();
    }

    return true;
  } catch {
    return false;
  }
}

async function readTokenFromFallback(): Promise<string | null> {
  if (!isDev) return null;

  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function writeTokenToFallback(token: string): Promise<void> {
  if (!isDev) return;

  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch {
    // no-op
  }
}

async function clearTokenFromFallback(): Promise<void> {
  if (!isDev) return;

  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // no-op
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;

  try {
    if (!(await canUseSecureStore())) {
      if (!isDev) {
        cachedToken = null;
        return null;
      }

      cachedToken = await readTokenFromFallback();
      return cachedToken;
    }

    cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
    return cachedToken ?? null;
  } catch {
    cachedToken = null;
    return null;
  }
}

export async function setAccessToken(token: string): Promise<void> {
  cachedToken = token;

  try {
    if (!(await canUseSecureStore())) {
      if (!isDev) return;

      await writeTokenToFallback(token);
      return;
    }

    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    if (!isDev) return;

    await writeTokenToFallback(token);
  }
}

export async function clearAccessToken(): Promise<void> {
  cachedToken = null;

  try {
    if (!(await canUseSecureStore())) {
      if (!isDev) return;

      await clearTokenFromFallback();
      return;
    }

    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    if (!isDev) return;

    await clearTokenFromFallback();
  }
}
