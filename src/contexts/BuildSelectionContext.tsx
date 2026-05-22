
import React, { createContext, useContext, useState, useEffect } from "react";
import type { BuildingType, Buildings, Position } from "../engine/Types";

export type ToolMode = BuildingType | "remove";
export type DraggedBuilding = {
  id: string;
  originalPosition: Position;
  building: Buildings;
} | null;

type SelectionContextType = {
  selected: ToolMode | null;
  setSelected: (b: ToolMode | null) => void;
  reset: () => void;
  draggedBuilding: DraggedBuilding;
  setDraggedBuilding: (b: DraggedBuilding) => void;
  cancelDrag: () => void;
};

const SelectionContext = createContext<SelectionContextType | null>(null);

export function BuildSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<ToolMode | null>(null);
  const [draggedBuilding, setDraggedBuilding] = useState<DraggedBuilding>(null);

  const reset = () => {
    setSelected(null);
  };

  const cancelDrag = () => {
    setDraggedBuilding(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setDraggedBuilding(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <SelectionContext.Provider
      value={{ selected, setSelected, reset, draggedBuilding, setDraggedBuilding, cancelDrag }}
    >
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
      reset: () => {},
      draggedBuilding: null,
      setDraggedBuilding: () => {},
      cancelDrag: () => {},
    };
  }
  return ctx;
}

export default BuildSelectionProvider;
