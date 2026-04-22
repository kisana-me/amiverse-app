import { api } from "@/lib/axios";
import { TrendType } from "@/types/trend";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { useCurrentAccount } from "./CurrentAccountProvider";
import { useToast } from "./ToastProvider";

type TrendsContextType = {
  trends: TrendType[];
  trendsLoading: boolean;
  clearTrends: () => void;
};

export const TrendsContext = createContext<TrendsContextType | null>(null);

export function TrendsProvider({ children }: { children: ReactNode }) {
  const { currentAccountStatus } = useCurrentAccount();
  const { addToast } = useToast();
  const [trends, setTrends] = useState<TrendType[]>([]);
  const [trendsLoading, setTrendsLoading] = useState<boolean>(true);

  const fetchTrend = useCallback(
    async (category: string = "general") => {
      setTrendsLoading(true);
      try {
        const res = await api.post("/trends");
        const data = res.data;
        if (!data) return;

        const newItems: TrendType[] = (Array.isArray(data) ? data : [data]).map(
          (item: any) => ({
            ...item,
            last_updated_at: new Date(item.last_updated_at),
          }),
        );

        setTrends((prev: TrendType[]) => {
          const filtered = prev.filter((item) => item.category !== category);
          return [...filtered, ...newItems];
        });
      } catch (error) {
        addToast({
          message: "トレンド取得エラー",
          detail: "トレンドの取得に失敗しました。",
        });
        console.error("fetchTrend error:", error);
      } finally {
        setTrendsLoading(false);
      }
    },
    [addToast],
  );

  const clearTrends = useCallback(() => {
    setTrends([]);
    setTrendsLoading(false);
  }, []);

  useEffect(() => {
    if (currentAccountStatus === "loading") return;

    async function load() {
      await fetchTrend("general");
    }
    load();
  }, [currentAccountStatus, fetchTrend]);

  const value: TrendsContextType = {
    trends,
    trendsLoading,
    clearTrends,
  };
  return (
    <TrendsContext.Provider value={value}>{children}</TrendsContext.Provider>
  );
}

export function useTrends() {
  const context = useContext(TrendsContext);
  if (!context)
    throw new Error("useTrends must be used within a TrendsProvider");
  return context;
}
