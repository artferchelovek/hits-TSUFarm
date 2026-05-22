import {
  type GameStore,
  Season,
  Weather,
  BuildingType,
  type Market,
  ResourceType,
} from "../engine/Types.ts";

import type { WritableDraft } from "immer";
import { appendLog } from "./GameStore.ts";
import { RESOURCE_PRICES } from "../engine/Constants.ts";
import { workerManager } from "./WorkerManager.ts";

export const processDayTime = (state: WritableDraft<GameStore>) => {
  const { meta } = state.gameState;
  const dayTick = meta.gameTick % meta.dayDuration;
  const nightStart = meta.dayDuration * 0.7;
  const nightEnd = meta.dayDuration * 0.2;

  if (dayTick === 0 && meta.gameTick > 0) {
    processMarketSales(state);
    processMaintenanceCosts(state);
  }

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

const processMarketSales = (state: WritableDraft<GameStore>) => {
  let totalProfit = 0;
  const soldResources: Partial<Record<ResourceType, number>> = {};

  const markets = Object.values(state.gameState.buildings).filter(
    (b): b is Market => b.type === BuildingType.Market,
  );

  markets.forEach((market) => {
    let marketChanged = false;
    Object.entries(market.storage).forEach(([res, amount]) => {
      const type = res as ResourceType;
      const basePrice = RESOURCE_PRICES[type] ?? 0;
      const demand = state.gameState.economy.marketDemand[type] ?? 1.0;

      const profit = (amount ?? 0) * basePrice * demand;
      totalProfit += profit;

      soldResources[type] = (soldResources[type] ?? 0) + (amount ?? 0);
      delete market.storage[type];
      marketChanged = true;
    });

    if (marketChanged) {
      workerManager.send("UPDATE_BUILDING", {
        building: JSON.parse(JSON.stringify(market)),
      });
    }
  });

  if (totalProfit > 0) {
    state.gameState.economy.money += Math.floor(totalProfit);
    state.gameState.economy.lastDailyIncome = Math.floor(totalProfit);
    appendLog(
      state,
      `Рынок продал товаров на сумму ${Math.floor(totalProfit)} монет.`,
      "success",
    );

    Object.entries(soldResources).forEach(([res, amount]) => {
      const type = res as ResourceType;
      const currentDemand = state.gameState.economy.marketDemand[type] ?? 1.0;
      const drop = (amount ?? 0) * 0.005;
      state.gameState.economy.marketDemand[type] = Math.max(
        0.2,
        currentDemand - drop,
      );
    });
  } else {
    state.gameState.economy.lastDailyIncome = 0;
  }

  Object.keys(RESOURCE_PRICES).forEach((res) => {
    const type = res as ResourceType;
    const currentDemand = state.gameState.economy.marketDemand[type] ?? 1.0;
    if (currentDemand < 1.5) {
      state.gameState.economy.marketDemand[type] = Math.min(
        1.5,
        currentDemand + 0.02,
      );
    }
  });
};

const processMaintenanceCosts = (state: WritableDraft<GameStore>) => {
  let totalMaintenance = 0;

  Object.values(state.gameState.buildings).forEach((building) => {
    const cost = building.maintenanceCost || 0;
    const isTiled =
      building.type === BuildingType.Garden ||
      building.type === BuildingType.Road ||
      building.type === BuildingType.Bridge;
    
    // For tiled buildings, maintenance could be per tile if we want, but config says 0 for them.
    // If we later add cost for roads, we should multiply by area.
    const area = isTiled ? (building.width || 1) * (building.length || 1) : 1;
    totalMaintenance += cost * area;
  });

  if (totalMaintenance > 0) {
    state.gameState.economy.money -= totalMaintenance;
    state.gameState.economy.lastDailyMaintenance = totalMaintenance;
    
    // Check for negative balance
    if (state.gameState.economy.money < 0) {
      appendLog(
        state,
        `ВНИМАНИЕ: Баланс ушел в минус! Расходы на содержание: ${totalMaintenance} 💰`,
        "error",
      );
    } else {
      appendLog(
        state,
        `Ежедневное обслуживание зданий обошлось в ${totalMaintenance} 💰`,
        "info",
      );
    }
  } else {
    state.gameState.economy.lastDailyMaintenance = 0;
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
