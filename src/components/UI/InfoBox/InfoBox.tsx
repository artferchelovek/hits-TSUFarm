import styles from "./InfoBox.module.css";
import { type Buildings, BuildingType } from "../../../engine/Types.ts";
import MainInfo from "./InfoGroups/MainInfo.tsx";
import MarketInfo from "./InfoGroups/MarketInfo.tsx";
import GreenhouseInfo from "./InfoGroups/GreenhouseInfo.tsx";
import GardenInfo from "./InfoGroups/GardenInfo.tsx";
import WellInfo from "./InfoGroups/WellInfo.tsx";
import GraveyardInfo from "./InfoGroups/GraveyardInfo.tsx";
import BridgeInfo from "./InfoGroups/BridgeInfo.tsx";
import RoadInfo from "./InfoGroups/RoadInfo.tsx";
import HouseInfo from "./InfoGroups/HouseInfo.tsx";
import GranaryInfo from "./InfoGroups/GranaryInfo.tsx";
import MillInfo from "./InfoGroups/MillInfo.tsx";
import { BUILDING_NAMES } from "../../../engine/localization/locales.ts";

interface InfoBoxProps {
  build: Buildings;
  position: { x: number; y: number };
  onClose: () => void;
  onMoveStart: (build: Buildings) => void;
}

export default function InfoBox({
  build,
  position,
  onClose,
  onMoveStart,
}: InfoBoxProps) {
  const isMain = build.type === BuildingType.Main;
  return (
    <div
      className={styles.InfoBox}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className={styles.InfoBox__label}>
        <p>{BUILDING_NAMES[build.type]}</p>
        <button onClick={onClose}>Закрыть</button>
      </div>

      {renderBuildingInfo(build)}

      {!isMain && (
        <button
          className={styles.moveButton}
          onClick={() => onMoveStart(build)}
        >
          Переместить
        </button>
      )}
    </div>
  );
}

function renderBuildingInfo(build: Buildings) {
  switch (build.type) {
    case BuildingType.Main:
      return <MainInfo build={build} />;

    case BuildingType.Market:
      return <MarketInfo build={build} />;

    case BuildingType.Greenhouse:
      return <GreenhouseInfo build={build} />;

    case BuildingType.Garden:
      return <GardenInfo build={build} />;

    case BuildingType.Well:
      return <WellInfo build={build} />;

    case BuildingType.Graveyard:
      return <GraveyardInfo build={build} />;

    case BuildingType.Bridge:
      return <BridgeInfo build={build} />;

    case BuildingType.Road:
      return <RoadInfo build={build} />;

    case BuildingType.House:
      return <HouseInfo build={build} />;

    case BuildingType.Granary:
      return <GranaryInfo build={build} />;

    case BuildingType.Mill:
      return <MillInfo build={build} />;

    default:
      return <p>Нет данных</p>;
  }
}
