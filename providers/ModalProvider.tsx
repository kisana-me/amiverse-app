import { usePathname } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { RequireSignInModal } from "@/features/modal";
import type { ModalStackItem, SignInModalPayload } from "@/types/modal";

type ModalContextType = {
  modalStack: ModalStackItem[];
  topModal: ModalStackItem | null;
  isSignInModalOpen: boolean;
  openSignInModal: (payload?: SignInModalPayload) => void;
  closeTopModal: () => void;
  closeAllModals: () => void;
};

const ModalContext = createContext<ModalContextType | null>(null);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);
  const nextIdRef = useRef(1);
  const [modalStack, setModalStack] = useState<ModalStackItem[]>([]);

  const openSignInModal = useCallback((payload?: SignInModalPayload) => {
    setModalStack((prev) => [
      ...prev,
      {
        id: nextIdRef.current++,
        kind: "signIn",
        payload,
      },
    ]);
  }, []);

  const closeTopModal = useCallback(() => {
    setModalStack((prev) => prev.slice(0, -1));
  }, []);

  const closeAllModals = useCallback(() => {
    setModalStack([]);
  }, []);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    closeAllModals();
  }, [closeAllModals, pathname]);

  const topModal =
    modalStack.length > 0 ? modalStack[modalStack.length - 1] : null;

  const isSignInModalOpen = useMemo(
    () => modalStack.some((modal) => modal.kind === "signIn"),
    [modalStack],
  );

  const value: ModalContextType = {
    modalStack,
    topModal,
    isSignInModalOpen,
    openSignInModal,
    closeTopModal,
    closeAllModals,
  };

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used within a ModalProvider");
  return context;
};

export function ModalViewport() {
  const { topModal, closeTopModal } = useModal();

  if (!topModal) return null;

  if (topModal.kind === "signIn") {
    return (
      <RequireSignInModal
        visible
        onClose={closeTopModal}
        title={topModal.payload?.title}
        message={topModal.payload?.message}
        closeLabel={topModal.payload?.closeLabel}
        signInLabel={topModal.payload?.signInLabel}
        signInPath={topModal.payload?.signInPath}
        onSignIn={topModal.payload?.onSignIn}
      />
    );
  }

  return null;
}
