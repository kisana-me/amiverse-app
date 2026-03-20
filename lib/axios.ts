import axios, { AxiosHeaders } from "axios";

import { getAccessToken } from "@/lib/access-token";

const backUrl = process.env.EXPO_PUBLIC_BACK_URL;

const baseURL = (() => {
  if (!backUrl) {
    throw new Error(
      "BACK_URL is not set. Define EXPO_PUBLIC_BACK_URL (e.g. https://api.example.com) to use API calls.",
    );
  }
  try {
    return new URL("/v1", backUrl).toString();
  } catch {
    throw new Error(
      "BACK_URL is invalid. Define EXPO_PUBLIC_BACK_URL as an absolute URL (e.g. https://api.example.com).",
    );
  }
})();

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    if (!config.headers) {
      config.headers = new AxiosHeaders();
    }

    if (config.headers instanceof AxiosHeaders) {
      config.headers.set("Authorization", `Bearer ${token}`);
    } else {
      (config.headers as Record<string, unknown>)["Authorization"] =
        `Bearer ${token}`;
    }
  }
  return config;
});
