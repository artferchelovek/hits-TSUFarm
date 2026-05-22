import { BuildingType } from "../engine/Types.ts";

export const getBuildingLimit = (type: BuildingType, level: number): number => {
  switch (type) {
    case BuildingType.Main:
      return 1;

    case BuildingType.House:
      return level * 2;

    case BuildingType.Garden:
      return 5 + level * 5;

    case BuildingType.Well:
      return Math.max(1, Math.floor(level / 2));

    case BuildingType.Greenhouse:
      if (level < 3) return 0;
      return 1 + Math.floor((level - 3) / 2);

    case BuildingType.Granary:
      return 1 + Math.floor(level / 5);

    case BuildingType.Mill:
      return 1 + Math.floor(level / 6);

    case BuildingType.Market:
      if (level < 4) return 0;
      return Math.floor(level / 4);

    case BuildingType.Graveyard:
      if (level < 2) return 0;
      return 1 + Math.floor(level / 10);

    case BuildingType.Bakery:
      if (level < 5) return 0;
      return 1 + Math.floor((level - 5) / 5);

    case BuildingType.Road:
      return level * 100;

    case BuildingType.Bridge:
      return level * 20;

    default:
      return 5;
  }
};
