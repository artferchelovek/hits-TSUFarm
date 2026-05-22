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
  [BuildingType.Bakery]: "Пекарня",
};

export const BUILDING_DESCRIPTIONS: Record<BuildingType, string> = {
  [BuildingType.Main]: "Центр управления городом. Здесь можно повышать уровень поселения и координировать развитие.",
  [BuildingType.Market]: "Торговая площадка. Сюда логисты приносят товары на продажу. Выручка начисляется каждое утро.",
  [BuildingType.Greenhouse]: "Круглогодичная теплица. Защищает растения от холода и ускоряет рост, но требует много воды.",
  [BuildingType.Garden]: "Обычная грядка под открытым небом. Зависит от погоды и времени года.",
  [BuildingType.Well]: "Источник воды для полива грядок. Фермеры набирают здесь воду, когда она заканчивается.",
  [BuildingType.Graveyard]: "Место упокоения жителей. Необходимо для поддержания порядка, когда люди уходят из жизни.",
  [BuildingType.Bridge]: "Позволяет жителям переходить через реки и расширять территорию фермы.",
  [BuildingType.Road]: "Увеличивает скорость передвижения жителей и позволяет логистам использовать тележки.",
  [BuildingType.House]: "Жилье для ваших людей. В каждом доме могут жить несколько человек.",
  [BuildingType.Granary]: "Склад для хранения ресурсов. Здесь фермеры и логисты хранят запасы еды и сырья.",
  [BuildingType.Mill]: "Перерабатывает пшеницу в муку. Первый шаг в цепочке производства хлеба.",
  [BuildingType.Bakery]: "Выпекает хлеб из муки. Конечный продукт с самой высокой стоимостью на рынке.",
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
