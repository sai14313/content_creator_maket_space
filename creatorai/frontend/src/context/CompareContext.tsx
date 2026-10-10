import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Creator } from "../lib/types";

const STORAGE_KEY = "creatorai_compare";

interface CompareContextValue {
  /** Creators selected for side-by-side comparison (max 3). */
  creators: Creator[];
  /** Returns true when the creator is selected. */
  isSelected: (creatorId: number) => boolean;
  /** Toggle selection; returns an error message when the limit is exceeded. */
  toggle: (creator: Creator) => string | null;
  remove: (creatorId: number) => void;
  clear: () => void;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [creators, setCreators] = useState<Creator[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Creator[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creators));
  }, [creators]);

  const isSelected = useCallback(
    (creatorId: number) => creators.some((c) => c.id === creatorId),
    [creators]
  );

  const toggle = useCallback(
    (creator: Creator): string | null => {
      let error: string | null = null;
      setCreators((prev) => {
        if (prev.some((c) => c.id === creator.id)) {
          return prev.filter((c) => c.id !== creator.id);
        }
        if (prev.length >= 3) {
          error = "You can compare up to 3 creators. Remove one first.";
          return prev;
        }
        return [...prev, creator];
      });
      return error;
    },
    []
  );

  const remove = useCallback((creatorId: number) => {
    setCreators((prev) => prev.filter((c) => c.id !== creatorId));
  }, []);

  const clear = useCallback(() => setCreators([]), []);

  const value = useMemo(
    () => ({ creators, isSelected, toggle, remove, clear }),
    [creators, isSelected, toggle, remove, clear]
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
