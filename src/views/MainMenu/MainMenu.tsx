import { useRef, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import styles from "./MainMenu.module.css";
import MapCanvas from "../../components/game/MapCanvas";
import { loadGameFromFile, setPendingLoad } from "../../Store/SaveManager";
import { useAuth } from "../../contexts/AuthContext.tsx";
import * as savesApi from "../../api/saves.ts";
import type { CloudSaveMeta } from "../../api/saves.ts";

type CommitEntry = {
  sha: string;
  message: string;
  date: string;
};

export default function MainMenu() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [commits, setCommits] = useState<CommitEntry[]>([]);
  const [cloudSaves, setCloudSaves] = useState<CloudSaveMeta[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSaves = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingSlots(true);
    try {
      const list = await savesApi.listSaves();
      setCloudSaves(list);
    } catch {
      setCloudSaves([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const USER = "artferchelovek";
    const REPO = "hits-TSUFarm";
    const BRANCH = "develop";

    const url = `https://api.github.com/repos/${USER}/${REPO}/commits?sha=${BRANCH}&per_page=5`;

    let mounted = true;
    type GhCommit = {
      sha: string;
      commit?: { message?: string; author?: { date?: string } };
    };
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (!Array.isArray(data)) return;
        const list = (data as GhCommit[]).slice(0, 5).map((c) => ({
          sha: c.sha.slice(0, 7),
          message: c.commit?.message || "",
          date: c.commit?.author?.date || "",
        }));
        setCommits(list);
      })
      .catch((err) => {
        console.warn("Failed to load changelog", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    fetchSaves();
  }, [fetchSaves]);

  const handleLoadSlot = async (slot: number) => {
    try {
      const data = await savesApi.loadFromSlot(slot);
      const save = {
        version: "0.0.1",
        timestamp: data.timestamp,
        gameState: data.gameState as any,
        worldData: data.worldData,
      };
      setPendingLoad(save);
      navigate("/game");
    } catch {
      alert("Не удалось загрузить сохранение");
    }
  };

  const handleDeleteSlot = async (slot: number) => {
    try {
      await savesApi.deleteSlot(slot);
      setCloudSaves((prev) =>
        prev.map((s) =>
          s.slot === slot
            ? { slot, name: null, timestamp: null, updatedAt: null }
            : s,
        ),
      );
    } catch {
      alert("Не удалось удалить сохранение");
    }
  };

  const formatDate = (ts: number | null) => {
    if (!ts) return "";
    return new Date(ts).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={styles.root}>
      <div className={styles.background}>
        <MapCanvas isBackground={true} />
      </div>

      <div className={styles.overlay} />

      <div className={styles.content}>
        <div className={styles.left}>
          <p className={styles.title}>TSUFarm</p>
          <button
            onClick={() => {
              window.location.href = "/game";
            }}
            className={styles.btn}
          >
            Начать игру
          </button>
          <button
            className={styles.btn}
            onClick={() => fileInputRef.current?.click()}
          >
            Загрузить локально
          </button>

          {!isAuthenticated ? (
            <div className={styles.authButtons}>
              <button
                className={styles.btnSmall}
                onClick={() => navigate("/login")}
              >
                Войти
              </button>
              <button
                className={styles.btnSmall}
                onClick={() => navigate("/register")}
              >
                Регистрация
              </button>
            </div>
          ) : (
            <div className={styles.cloudSection}>
              <div className={styles.cloudHeader}>
                ☁ {user?.username}
                <button className={styles.logoutBtn} onClick={logout}>
                  Выйти
                </button>
              </div>

              {loadingSlots ? (
                <div className={styles.slotLoading}>Загрузка...</div>
              ) : (
                <div className={styles.slotList}>
                  {cloudSaves.map((s) => (
                    <div
                      key={s.slot}
                      className={
                        s.timestamp ? styles.slot : styles.slotEmpty
                      }
                    >
                      <div className={styles.slotInfo}>
                        <span className={styles.slotName}>
                          {s.name ?? `Слот ${s.slot}`}
                        </span>
                        <span className={styles.slotDate}>
                          {formatDate(s.timestamp)}
                        </span>
                      </div>
                      <div className={styles.slotActions}>
                        {s.timestamp ? (
                          <>
                            <button
                              className={styles.slotBtn}
                              onClick={() => handleLoadSlot(s.slot)}
                            >
                              Загрузить
                            </button>
                            <button
                              className={styles.slotBtnDanger}
                              onClick={() => handleDeleteSlot(s.slot)}
                            >
                              Удалить
                            </button>
                          </>
                        ) : (
                          <span className={styles.slotEmptyText}>
                            — пусто —
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.right}>
          <div className={styles.changelogHeader}>Changelog</div>
          <div className={styles.commitList}>
            {commits.length === 0 && <div>Загрузка...</div>}
            {commits.map((c) => (
              <div key={c.sha} className={styles.commit}>
                <div>
                  <span className={styles.commitHash}>{c.sha}</span>
                  <span className={styles.commitMsg}>{c.message}</span>
                </div>
                <div className={styles.commitDate}>
                  {new Date(c.date).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const save = await loadGameFromFile(file);
          if (save) {
            setPendingLoad(save);
            window.location.href = "/game";
          } else {
            alert("Не удалось загрузить сохранение");
          }
        }}
      />
    </div>
  );
}
