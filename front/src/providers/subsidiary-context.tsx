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

import { isMainOrganization, type Me } from "~/hooks/use-me";

const STORAGE_KEY = "vifaa-selected-subsidiary-org-id";

type SubsidiaryContextValue = {
  selectedSubsidiaryId: string | null;
  setSelectedSubsidiaryId: (id: string | null) => void;
};

const SubsidiaryContext = createContext<SubsidiaryContextValue | null>(null);

export function SubsidiaryProvider({ children }: { children: ReactNode }) {
  const [selectedSubsidiaryId, setSelectedSubsidiaryIdState] = useState<
    string | null
  >(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      setSelectedSubsidiaryIdState(stored || null);
    } catch {
      setSelectedSubsidiaryIdState(null);
    }
    setHydrated(true);
  }, []);

  const setSelectedSubsidiaryId = useCallback((id: string | null) => {
    setSelectedSubsidiaryIdState(id);
    try {
      if (id) {
        sessionStorage.setItem(STORAGE_KEY, id);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* sessionStorage indisponible */
    }
  }, []);

  const value = useMemo(
    () => ({
      selectedSubsidiaryId: hydrated ? selectedSubsidiaryId : null,
      setSelectedSubsidiaryId,
    }),
    [hydrated, selectedSubsidiaryId, setSelectedSubsidiaryId],
  );

  return (
    <SubsidiaryContext.Provider value={value}>
      {children}
    </SubsidiaryContext.Provider>
  );
}

export function useSubsidiaryContext(): SubsidiaryContextValue {
  const ctx = useContext(SubsidiaryContext);
  if (!ctx) {
    throw new Error(
      "useSubsidiaryContext doit être utilisé dans SubsidiaryProvider",
    );
  }
  return ctx;
}

/** Organisation effective pour les requêtes / filtres (filiale ou filiale sélectionnée HQ). */
export function useEffectiveOrganizationId(me: Me | null | undefined): string {
  const { selectedSubsidiaryId } = useSubsidiaryContext();

  if (!me) return "";
  if (!isMainOrganization(me)) {
    return me.organisationId;
  }
  return selectedSubsidiaryId ?? me.organisationId;
}
