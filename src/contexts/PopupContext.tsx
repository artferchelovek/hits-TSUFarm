/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useGameStore } from "../Store/GameStore";
import CenteredPopup from "../components/UI/CenteredPopup/CenteredPopup";
import type { LogType, GameStore } from "../engine/Types";

type ShowPopupFn = (
  message: string,
  type?: LogType,
  durationMs?: number,
) => void;

const PopupContext = createContext<{ showPopup: ShowPopupFn } | null>(null);

export function PopupProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<{
    id: string;
    message: string;
    type: LogType;
    duration: number;
  } | null>(null);
  const queueRef = useRef<
    Array<{ id: string; message: string; type: LogType; duration: number }>
  >([]);
  const timerRef = useRef<number | null>(null);
  const lastLogRef = useRef<string | null>(null);

  const showPopup: ShowPopupFn = useCallback(
    (msg, t: LogType = "info", durationMs = 2000) => {
      const item = {
        id: crypto.randomUUID(),
        message: msg,
        type: t,
        duration: durationMs,
      };
      queueRef.current.push(item);
      if (!current) {
        setTimeout(() => {
          const next = queueRef.current.shift();
          if (next) setCurrent(next);
        }, 0);
      }
    },
    [current],
  );

  useEffect(() => {
    const unsub = useGameStore.subscribe((s: GameStore) => {
      const logs = s.gameState.logs || [];
      const last = logs[logs.length - 1];
      if (last && last.id !== lastLogRef.current) {
        lastLogRef.current = last.id;
        showPopup(last.message, last.type || "info");
      }
    });

    try {
      const state = useGameStore.getState();
      const logs = state.gameState.logs || [];
      if (logs.length) lastLogRef.current = logs[logs.length - 1].id;
    } catch {
      // ignore
    }

    return () => unsub();
  }, [showPopup]);

  useEffect(() => {
    if (!current) return;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    timerRef.current = window.setTimeout(() => {
      setCurrent(null);
      const next = queueRef.current.shift();
      if (next) setCurrent(next);
      timerRef.current = null;
    }, current.duration);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [current]);

  const handleClose = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCurrent(null);
    const next = queueRef.current.shift();
    if (next) setCurrent(next);
  };

  return (
    <PopupContext.Provider value={{ showPopup }}>
      {children}
      <CenteredPopup
        visible={!!current}
        message={current?.message ?? ""}
        type={current?.type ?? "info"}
        onClose={handleClose}
      />
    </PopupContext.Provider>
  );
}

export function usePopup() {
  const ctx = useContext(PopupContext);
  if (!ctx) {
    return { showPopup: (() => {}) as ShowPopupFn };
  }
  return ctx;
}

export default PopupContext;
