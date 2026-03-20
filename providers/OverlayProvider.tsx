import {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type initOverlayType = {
  is_loading: boolean;
  loading_message: string;
  loading_progress: number;
};

type OverlayContextType = {
  initOverlay: initOverlayType;
  setInitOverlay: Dispatch<SetStateAction<initOverlayType>>;

  isHeaderMenuOpen: boolean;
  setIsHeaderMenuOpen: Dispatch<SetStateAction<boolean>>;
  headerMenuTrigger: () => void;

  isAsideMenuOpen: boolean;
  setIsAsideMenuOpen: Dispatch<SetStateAction<boolean>>;
  asideMenuTrigger: () => void;

  doneInitLoading: () => void;
  menuOverlay: boolean;

  closeMenu: () => void;
};

const OverlayContext = createContext<OverlayContextType | null>(null);

export const OverlayProvider = ({ children }: { children: ReactNode }) => {
  const [initOverlay, setInitOverlay] = useState<initOverlayType>({
    is_loading: true,
    loading_message: "ロード中",
    loading_progress: 0,
  });
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isAsideMenuOpen, setIsAsideMenuOpen] = useState(false);
  const headerMenuTrigger = () => {
    setIsAsideMenuOpen(false);
    setIsHeaderMenuOpen((prevState) => !prevState);
  };
  const asideMenuTrigger = () => {
    setIsHeaderMenuOpen(false);
    setIsAsideMenuOpen((prevState) => !prevState);
  };

  const doneInitLoading = () => {
    setInitOverlay({
      is_loading: false,
      loading_message: "完了",
      loading_progress: 100,
    });
  };

  const closeMenu = useCallback(() => {
    setIsHeaderMenuOpen(false);
    setIsAsideMenuOpen(false);
  }, []);

  const menuOverlay = useMemo(() => {
    return isHeaderMenuOpen || isAsideMenuOpen;
  }, [isHeaderMenuOpen, isAsideMenuOpen]);

  const value: OverlayContextType = {
    initOverlay,
    setInitOverlay,
    isHeaderMenuOpen,
    setIsHeaderMenuOpen,
    headerMenuTrigger,
    isAsideMenuOpen,
    setIsAsideMenuOpen,
    asideMenuTrigger,
    menuOverlay,
    doneInitLoading,
    closeMenu,
  };

  return (
    <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>
  );
};

export const useOverlay = () => {
  const context = useContext(OverlayContext);
  if (!context)
    throw new Error("useOverlay must be used within an OverlayProvider");
  return context;
};
