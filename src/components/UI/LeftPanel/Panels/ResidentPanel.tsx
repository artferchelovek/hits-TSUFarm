import { ProfessionType, type Resident } from "../../../../engine/Types.ts";
import { useState } from "react";
import styles from "../LeftPanel.module.css";
import {
  CHARACTERS_SVG,
  createProfession,
} from "../../../../engine/Constants.ts";
import { useGameStore } from "../../../../Store/GameStore.ts";
import { PROFESSION_NAMES } from "../../../../engine/localization/locales.ts";

export function ResidentPanel() {
  const residents = useGameStore((state) => state.gameState.residents);

  return (
    <div className={styles.residentsList}>
      {Object.values(residents).map((res: Resident) => (
        <ResidentItem key={res.id} res={res} />
      ))}
    </div>
  );
}

function ResidentItem({ res }: { res: Resident }) {
  const [prof, setProf] = useState(res.profession.type);

  return (
    <div className={styles.residentsItem}>
      <img src={CHARACTERS_SVG[res.gender]} alt="" />
      <div className={styles.residentsItem__body}>
        <p>
          {res.name}, {Math.round(res.age)}
        </p>
        <select
          value={prof}
          onChange={(e) => {
            const type = e.target.value as ProfessionType;
            const ok = useGameStore
              .getState()
              .giveProfession(createProfession(type), res);
            if (ok) setProf(type);
          }}
        >
          {(Object.keys(PROFESSION_NAMES) as ProfessionType[]).map((type) => (
            <option key={type} value={type}>
              {PROFESSION_NAMES[type]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
