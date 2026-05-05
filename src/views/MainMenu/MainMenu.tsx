import { useEffect, useState } from "react";
import styles from "./MainMenu.module.css";
import MapCanvas from "../../components/game/MapCanvas";

type CommitEntry = {
  sha: string;
  message: string;
  date: string;
};

export default function MainMenu() {
  const [commits, setCommits] = useState<CommitEntry[]>([]);

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
          <button className={styles.btn}>Загрузить сохранение</button>
          <button className={styles.btn}>Настройки</button>
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
    </div>
  );
}
