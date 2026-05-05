import {
  BuildingType,
  type GameStore,
  type Garden,
  type Graveyard,
  type Greenhouse,
  type Resident,
  Season,
  Weather,
  type Well,
} from "../engine/Types.ts";
import {
  PLANT_CONFIG,
  VILLAGER_CONFIG,
  WeatherEffects,
} from "../engine/Constants.ts";
import type { WritableDraft } from "immer";
import { appendLog } from "./GameStore.ts";

export const processPlantGrowth = (
  state: WritableDraft<GameStore>,
  building: Garden | Greenhouse,
) => {
  if (building.harvest && !building.harvest.isReady) {
    const consumption =
      PLANT_CONFIG[building.harvest.type].waterConsumptionPerTick;

    if (building.type === BuildingType.Garden) {
      building.moisture = Math.max(0, building.moisture - consumption);
      building.isWatered = building.moisture > 0;
    } else if (building.type === BuildingType.Greenhouse) {
      building.waterTank.current = Math.max(
        0,
        building.waterTank.current - consumption,
      );
      building.isWatered = building.waterTank.current > 0;
    }

    if (building.isWatered) {
      if (state.gameState.meta.isNight) {
        building.harvest.growthProgress +=
          WeatherEffects.NIGHT_GROWTH_COEFFICIENT * building.growthCoefficient;
      } else {
        building.harvest.growthProgress += building.growthCoefficient;
      }

      if (state.gameState.meta.currentSeason === Season.Winter) {
        building.health -= WeatherEffects.WINTER_PLANT_DAMAGE;
      }

      if (building.harvest.growthProgress >= 100) {
        building.harvest.growthProgress = 100;
        building.harvest.isReady = true;
      }
    } else {
      building.health = Math.max(0, building.health - 0.1);
      if (building.health <= 0) {
        building.harvest = null;
      }
    }
  }
};
export const processResident = (
  state: WritableDraft<GameStore>,
  resident: Resident,
) => {
  resident.hunger = Math.max(
    0,
    resident.hunger - VILLAGER_CONFIG.hungerPerTick,
  );
  if (resident.hunger <= 0) {
    resident.health = Math.max(
      0,
      resident.health - VILLAGER_CONFIG.starvationDamagePerTick,
    );
  } else if (resident.health < VILLAGER_CONFIG.maxHealth) {
    resident.health = Math.min(
      VILLAGER_CONFIG.maxHealth,
      resident.health + VILLAGER_CONFIG.healPerTick,
    );
  }
  resident.age += VILLAGER_CONFIG.agePerTick;

  const deathChance = (resident.age / 100) * VILLAGER_CONFIG.baseDeathChance;
  if (Math.random() < deathChance) {
    resident.health = 0;
  }

  if (resident.health <= 0) {
    if (resident.homeId) {
      const home = state.gameState.buildings[resident.homeId];
      if (home && "residentsId" in home) {
        home.residentsId = home.residentsId.filter(
          (id: string) => id !== resident.id,
        );
      }
    }
    appendLog(
      state,
      `Житель ${resident.name} скончался в возрасте ${Math.floor(resident.age)} лет`,
      "info",
    );
    if (resident.workplaceId) {
      const workplace = state.gameState.buildings[resident.workplaceId];
      if (
        workplace.type === BuildingType.Greenhouse ||
        workplace.type === BuildingType.Garden
      ) {
        if (workplace.assignedWorkerId) {
          workplace.assignedWorkerId = workplace.assignedWorkerId.filter(
            (id: string) => id !== resident.id,
          );
        }
      }
    }
    delete state.gameState.residents[resident.id];
    state.gameState.economy.totalPopulation--;

    const graveyardId = state.gameState.meta.graveyardIds.find((id) => {
      const b = state.gameState.buildings[id] as Graveyard;
      return b && b.decedents.length < b.maxCapacity;
    });

    if (graveyardId) {
      const graveyard = state.gameState.buildings[graveyardId] as Graveyard;
      graveyard.decedents.push({
        id: resident.id,
        name: resident.name,
        ageAtDeath: resident.age,
      });
    } else {
      appendLog(state, "Нет места для захоронения", "warning");
    }
  }
};
export const processWell = (building: Well) => {
  building.currentAmount = Math.min(
    building.maxCapacity,
    building.currentAmount + building.refillRate,
  );
};

export const processDayTime = (state: WritableDraft<GameStore>) => {
  const { meta } = state.gameState;
  const dayTick = meta.gameTick % meta.dayDuration;
  const nightStart = meta.dayDuration * 0.7;
  const nightEnd = meta.dayDuration * 0.2;

  const totalSeasons = Object.values(Season);
  const seasonIndex =
    Math.floor(meta.gameTick / meta.seasonDuration) % totalSeasons.length;
  const nextSeason = totalSeasons[seasonIndex];

  const currentWeather = meta.currentWeather;
  if (meta.currentSeason !== nextSeason) {
    meta.currentSeason = nextSeason;
    appendLog(state, `Наступил следующий сезон: (${nextSeason}})`, "info");
    updateWeather(state);
  }

  meta.isNight = dayTick >= nightStart || dayTick <= nightEnd;
  if (meta.gameTick % 300 === 0) {
    updateWeather(state);
  }
  if (currentWeather != meta.currentWeather) {
    appendLog(
      state,
      `Сменилась погода: ${currentWeather} -> ${meta.currentWeather}`,
      "info",
    );
  }
};

const updateWeather = (state: WritableDraft<GameStore>) => {
  const { meta } = state.gameState;
  const random = Math.random();

  if (meta.currentSeason === Season.Winter) {
    meta.currentWeather = random > 0.4 ? Weather.Snow : Weather.Clear;
  } else if (meta.currentSeason === Season.Summer) {
    meta.currentWeather = random > 0.8 ? Weather.Rain : Weather.Clear;
  } else {
    meta.currentWeather = random > 0.6 ? Weather.Rain : Weather.Clear;
  }
};
