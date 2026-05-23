import { BuildingType } from "../engine/Types.ts";
import { LEVEL_CONFIG } from "../engine/Constants.ts";

export const getBuildingLimit = (type: BuildingType, level: number): number => {
  const levelReq = LEVEL_CONFIG[level];
  if (levelReq && !levelReq.unlockedBuildings.includes(type)) {
    return 0;
  }

  switch (type) {
    case BuildingType.Main:
      return 1;

    case BuildingType.House:
      return level * 3;

    case BuildingType.Garden:
      return 5 + level * 5;

    case BuildingType.Well:
      return level;

    case BuildingType.Greenhouse:
      if (level < 4) return 0;
      return level - 3;

    case BuildingType.Granary:
      return level;

    case BuildingType.Mill:
      if (level < 2) return 0;
      return level - 1;

    case BuildingType.Market:
      return Math.ceil(level / 2);

    case BuildingType.Graveyard:
      if (level < 3) return 0;
      return 1;

    case BuildingType.Bakery:
      if (level < 3) return 0;
      return level - 2;

    case BuildingType.Road:
      return level * 100;

    case BuildingType.Bridge:
      return level * 20;

    default:
      return 5;
  }
};
