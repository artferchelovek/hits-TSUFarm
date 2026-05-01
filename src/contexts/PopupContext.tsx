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
import type { LogType } from "../engine/Types";

type ShowPopupFn = (
  message: string,
  type?: LogType,
  durationMs?: number,
) => void;

const PopupContext = createContext<{ showPopup: ShowPopupFn } | null>(null);

export function PopupProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<LogType>("info");
  const timeoutRef = useRef<number | null>(null);
  const lastLogRef = useRef<string | null>(null);

  const showPopup: ShowPopupFn = useCallback(
    (msg, t = "info", durationMs = 2000) => {
      setMessage(msg);
      setType(t);
      setVisible(true);

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setVisible(false);
        timeoutRef.current = null;
      }, durationMs);
    },
    [],
  );

  useEffect(() => {
    const unsub = useGameStore.subscribe((s: any) => {
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
    } catch (e) {}

    return () => unsub();
  }, [showPopup]);

  return (
    <PopupContext.Provider value={{ showPopup }}>
      {children}
      <CenteredPopup visible={visible} message={message} type={type} />
    </PopupContext.Provider>
  );
}

export function usePopup() {
  const ctx = useContext(PopupContext);
  if (!ctx) {
    return { showPopup: (_: string, __?: LogType) => {} };
  }
  return ctx;
}

export default PopupContext;
