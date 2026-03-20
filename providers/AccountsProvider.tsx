import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { api } from "@/lib/axios";
import { AccountType } from "@/types/account";

export type CachedAccount = AccountType & {
  fetched_at: number;
};

type AccountsContextType = {
  accounts: Record<string, CachedAccount>;
  fetchAccount: (name_id: string) => Promise<AccountType | null>;
  getAccount: (name_id: string) => CachedAccount | undefined;
  updateAccount: (name_id: string, data: Partial<AccountType>) => void;
};

const AccountsContext = createContext<AccountsContextType | null>(null);

export const AccountsProvider = ({ children }: { children: ReactNode }) => {
  const [accounts, setAccounts] = useState<Record<string, CachedAccount>>({});
  const accountsRef = useRef(accounts);

  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  const getAccount = useCallback(
    (name_id: string) => {
      return accounts[name_id];
    },
    [accounts],
  );

  const updateAccount = useCallback(
    (name_id: string, data: Partial<AccountType>) => {
      setAccounts((prev) => {
        const current = prev[name_id];
        if (!current) return prev;
        return {
          ...prev,
          [name_id]: { ...current, ...data },
        };
      });
    },
    [],
  );

  const fetchAccount = useCallback(async (name_id: string) => {
    if (accountsRef.current[name_id]) {
      return accountsRef.current[name_id];
    }

    try {
      const res = await api.post("/accounts/@" + name_id);
      const account = res.data as AccountType;

      const cachedAccount: CachedAccount = {
        ...account,
        fetched_at: Date.now(),
      };

      setAccounts((prev) => ({
        ...prev,
        [name_id]: cachedAccount,
      }));

      return cachedAccount;
    } catch {
      return null;
    }
  }, []);

  const value: AccountsContextType = {
    accounts,
    fetchAccount,
    getAccount,
    updateAccount,
  };

  return (
    <AccountsContext.Provider value={value}>
      {children}
    </AccountsContext.Provider>
  );
};

export const useAccounts = () => {
  const context = useContext(AccountsContext);
  if (!context) {
    throw new Error("useAccounts must be used within an AccountsProvider");
  }
  return context;
};
