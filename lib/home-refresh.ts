import { DeviceEventEmitter, type EmitterSubscription } from "react-native";

const HOME_REFRESH_EVENT = "home:refresh";

export type HomeRefreshPayload = {
  scrollToTop?: boolean;
  reload?: boolean;
};

export function emitHomeRefresh(payload: HomeRefreshPayload = {}) {
  DeviceEventEmitter.emit(HOME_REFRESH_EVENT, {
    scrollToTop: true,
    reload: true,
    ...payload,
  } satisfies HomeRefreshPayload);
}

export function addHomeRefreshListener(
  handler: (payload: HomeRefreshPayload) => void,
): EmitterSubscription {
  return DeviceEventEmitter.addListener(HOME_REFRESH_EVENT, handler);
}
