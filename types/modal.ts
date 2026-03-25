import type { Href } from "expo-router";

export type ModalKind = "signIn";

export type SignInModalPayload = {
  title?: string;
  message?: string;
  closeLabel?: string;
  signInLabel?: string;
  signInPath?: Href;
  onSignIn?: () => void | Promise<void>;
};

export type SignInModalStackItem = {
  id: number;
  kind: "signIn";
  payload?: SignInModalPayload;
};

export type ModalStackItem = SignInModalStackItem;
