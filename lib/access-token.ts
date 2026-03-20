import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "amiverse.access_token";

let cachedToken: string | null | undefined;

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

export async function getAccessToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  try {
    if (!(await canUseSecureStore())) {
      cachedToken = null;
      return null;
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
    if (!(await canUseSecureStore())) return;
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // ignore: token is still kept in memory for this session
  }
}

export async function clearAccessToken(): Promise<void> {
  cachedToken = null;
  try {
    if (!(await canUseSecureStore())) return;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // ignore
  }
}
