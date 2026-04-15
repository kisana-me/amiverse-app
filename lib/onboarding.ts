import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETED_KEY = "onboarding_completed_v1";
type OnboardingCompletedListener = (value: boolean) => void;

const listeners = new Set<OnboardingCompletedListener>();
let cachedOnboardingCompleted: boolean | null = null;

function notifyOnboardingCompleted(value: boolean) {
  for (const listener of listeners) {
    listener(value);
  }
}

export function addOnboardingCompletedListener(
  listener: OnboardingCompletedListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function getIsOnboardingCompleted(): Promise<boolean> {
  if (cachedOnboardingCompleted !== null) {
    return cachedOnboardingCompleted;
  }

  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    const completed = value === "1";
    cachedOnboardingCompleted = completed;
    return completed;
  } catch (error) {
    console.error("[onboarding] Failed to read onboarding status:", error);
    cachedOnboardingCompleted = false;
    return false;
  }
}

export async function markOnboardingCompleted(): Promise<void> {
  cachedOnboardingCompleted = true;
  notifyOnboardingCompleted(true);

  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "1");
  } catch (error) {
    console.error("[onboarding] Failed to save onboarding status:", error);
  }
}

export async function resetOnboardingCompleted(): Promise<void> {
  cachedOnboardingCompleted = false;
  notifyOnboardingCompleted(false);

  try {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
  } catch (error) {
    console.error("[onboarding] Failed to reset onboarding status:", error);
  }
}
