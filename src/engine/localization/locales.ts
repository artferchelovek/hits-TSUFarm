import { BuildingType, ProfessionType, Season, Weather } from "../Types.ts";

export const BUILDING_NAMES: Record<BuildingType, string> = {
  [BuildingType.Main]: "Главное здание",
  [BuildingType.Market]: "Рынок",
  [BuildingType.Greenhouse]: "Теплица",
  [BuildingType.Garden]: "Грядка",
  [BuildingType.Well]: "Колодец",
  [BuildingType.Graveyard]: "Кладбище",
  [BuildingType.Bridge]: "Мост",
  [BuildingType.Road]: "Дорога",
  [BuildingType.House]: "Дом для жителей",
  [BuildingType.Granary]: "Амбар",
  [BuildingType.Mill]: "Мельница",
};
export const PROFESSION_NAMES: Record<ProfessionType, string> = {
  Farmer: "Фермер",
  Jobless: "Безработный",
  Transporter: "Логист",
};

export const WEATHER_NAMES: Record<Weather, string> = {
  Snow: "Снег",
  Rain: "Дождь",
  Clear: "Ясно",
};

export const SEASON_NAMES: Record<Season, string> = {
  Summer: "Лето",
  Autumn: "Осень",
  Winter: "Зима",
  Spring: "Весна",
};
