"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { listAdminOutlets, type AdministrationResource } from "@/lib/administration/api";
import { getStoreCapabilities, type StoreOutletCapabilities } from "@/lib/operations/store";
import { sortOutletsByCodeThenId } from "@/lib/operations/store-navigation";

export type StoreOutlet = AdministrationResource;

export type StoreOutletContextValue = Readonly<{
  outlets: readonly StoreOutlet[];
  selectedOutlet: StoreOutlet | null;
  outletId: string | null;
  capabilities: StoreOutletCapabilities | null;
  loading: boolean;
  unauthorized: boolean;
  forbidden: boolean;
  error: string | null;
  staleOutletId: string | null;
  selectOutlet: (outletId: string) => void;
  refreshCapabilities: () => Promise<void>;
  retry: () => void;
  announce: (message: string) => void;
  announcement: string;
}>;

const StoreOutletContext = createContext<StoreOutletContextValue | null>(null);

function readOutletIdFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("outletId");
  return value && value.length > 0 ? value : null;
}

function writeOutletIdToLocation(outletId: string): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("outletId", outletId);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function StoreOutletProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [outlets, setOutlets] = useState<readonly StoreOutlet[]>([]);
  const [outletId, setOutletId] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<StoreOutletCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleOutletId, setStaleOutletId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const announce = useCallback((message: string) => {
    setAnnouncement(message);
  }, []);

  const selectOutlet = useCallback((nextId: string) => {
    setStaleOutletId(null);
    setOutletId(nextId);
    writeOutletIdToLocation(nextId);
  }, []);

  const retry = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setUnauthorized(false);
      setForbidden(false);
      setError(null);
      setStaleOutletId(null);
      const result = await listAdminOutlets();
      if (cancelled) return;
      if (!result.ok) {
        setLoading(false);
        if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
          setUnauthorized(true);
          return;
        }
        if (result.status === 403) {
          setForbidden(true);
          return;
        }
        setError("Store outlets could not be loaded.");
        return;
      }
      const sorted = sortOutletsByCodeThenId(result.data.items);
      setOutlets(sorted);
      const requested = readOutletIdFromLocation();
      if (requested) {
        const match = sorted.find((outlet) => outlet.id === requested);
        if (!match) {
          setStaleOutletId(requested);
          setOutletId(null);
          setCapabilities(null);
          setLoading(false);
          return;
        }
        setOutletId(match.id);
        writeOutletIdToLocation(match.id);
      } else if (sorted[0]) {
        setOutletId(sorted[0].id);
        writeOutletIdToLocation(sorted[0].id);
      } else {
        setOutletId(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const refreshCapabilities = useCallback(async () => {
    if (!outletId) {
      setCapabilities(null);
      return;
    }
    const result = await getStoreCapabilities(outletId);
    if (!result.ok) {
      if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
        setUnauthorized(true);
        return;
      }
      if (result.status === 403 || result.code === "STORE_UNAUTHORIZED") {
        setCapabilities({});
        return;
      }
      setCapabilities(null);
      return;
    }
    setCapabilities(result.data.capabilities);
  }, [outletId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!outletId) {
        setCapabilities(null);
        return;
      }
      const result = await getStoreCapabilities(outletId);
      if (cancelled) return;
      if (!result.ok) {
        if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
          setUnauthorized(true);
          return;
        }
        setCapabilities({});
        return;
      }
      setCapabilities(result.data.capabilities);
    })();
    return () => {
      cancelled = true;
    };
  }, [outletId]);

  const selectedOutlet = useMemo(
    () => outlets.find((outlet) => outlet.id === outletId) ?? null,
    [outlets, outletId],
  );

  const value = useMemo<StoreOutletContextValue>(
    () => ({
      outlets,
      selectedOutlet,
      outletId,
      capabilities,
      loading,
      unauthorized,
      forbidden,
      error,
      staleOutletId,
      selectOutlet,
      refreshCapabilities,
      retry,
      announce,
      announcement,
    }),
    [
      outlets,
      selectedOutlet,
      outletId,
      capabilities,
      loading,
      unauthorized,
      forbidden,
      error,
      staleOutletId,
      selectOutlet,
      refreshCapabilities,
      retry,
      announce,
      announcement,
    ],
  );

  return <StoreOutletContext.Provider value={value}>{children}</StoreOutletContext.Provider>;
}

export function useStoreOutlet(): StoreOutletContextValue {
  const value = useContext(StoreOutletContext);
  if (!value) {
    throw new Error("useStoreOutlet must be used within StoreOutletProvider");
  }
  return value;
}
