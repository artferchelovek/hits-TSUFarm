/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";
import type { BuildingType } from "../engine/Types";

type SelectionContextType = {
  selected: BuildingType | null;
  setSelected: (b: BuildingType | null) => void;
};

const SelectionContext = createContext<SelectionContextType | null>(null);

export function BuildSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<BuildingType | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <SelectionContext.Provider value={{ selected, setSelected }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useBuildSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    return {
      selected: null,
      setSelected: () => {},
    };
  }
  return ctx;
}

export default BuildSelectionProvider;
