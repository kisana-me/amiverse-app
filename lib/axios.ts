import axios, { AxiosHeaders } from "axios";

import { getAccessToken } from "@/lib/access-token";

const backUrl = process.env.EXPO_PUBLIC_BACK_URL;

const resolvedApiConfig = (() => {
  if (!backUrl) {
    return {
      baseURL: undefined,
      error:
        "BACK_URL is not set. Define EXPO_PUBLIC_BACK_URL (e.g. https://api.example.com) to use API calls.",
    };
  }

  try {
    return {
      baseURL: new URL("/v1", backUrl).toString(),
      error: null,
    };
  } catch {
    return {
      baseURL: undefined,
      error:
        "BACK_URL is invalid. Define EXPO_PUBLIC_BACK_URL as an absolute URL (e.g. https://api.example.com).",
    };
  }
})();

export const apiConfigError = resolvedApiConfig.error;

export const api = axios.create({
  baseURL: resolvedApiConfig.baseURL,
});

api.interceptors.request.use(async (config) => {
  if (apiConfigError) {
    return Promise.reject(new Error(apiConfigError));
  }

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
