import {
  type Bakery,
  BuildingType,
  type Mill,
  type PlantPlace,
  ResourceType,
  Season,
  Weather,
  type Well,
} from "../Types.ts";
import {
  DROUGHT_DAMAGE_TICK,
  PLANT_CONFIG,
  WeatherEffects,
  WELL_REFILL_AMOUNT,
} from "../Constants.ts";

export class BuildingProcessor {
  processMill(mill: Mill): void {
    const currentWheat = mill.storage[ResourceType.Wheat] ?? 0;
    const currentFlour = mill.storage[ResourceType.Flour] ?? 0;

    if (
      currentWheat < mill.recipe.importCount ||
      currentFlour + mill.recipe.exportCount > mill.maxCapacity
    ) {
      mill.progress = 0;
      return;
    }

    mill.progress += 1 / mill.recipe.durationPerTick;

    if (mill.progress >= 1) {
      mill.storage[ResourceType.Wheat] = currentWheat - mill.recipe.importCount;
      if (mill.storage[ResourceType.Wheat]! <= 0) {
        delete mill.storage[ResourceType.Wheat];
      }
      mill.storage[ResourceType.Flour] = currentFlour + mill.recipe.exportCount;
      
      mill.capacity =
        (mill.storage[ResourceType.Wheat] ?? 0) +
        (mill.storage[ResourceType.Flour] ?? 0);
      
      mill.progress = 0;
    }
  }

  processBakery(bakery: Bakery): void {
    const currentFlour = bakery.storage[ResourceType.Flour] ?? 0;
    const currentBread = bakery.storage[ResourceType.Bread] ?? 0;

    if (
      currentFlour < bakery.recipe.importCount ||
      currentBread + bakery.recipe.exportCount > bakery.maxCapacity
    ) {
      bakery.progress = 0;
      return;
    }

    bakery.progress += 1 / bakery.recipe.durationPerTick;

    if (bakery.progress >= 1) {
      bakery.storage[ResourceType.Flour] = currentFlour - bakery.recipe.importCount;
      if (bakery.storage[ResourceType.Flour]! <= 0) {
        delete bakery.storage[ResourceType.Flour];
      }
      bakery.storage[ResourceType.Bread] = currentBread + bakery.recipe.exportCount;
      
      bakery.capacity =
        (bakery.storage[ResourceType.Flour] ?? 0) +
        (bakery.storage[ResourceType.Bread] ?? 0);
      
      bakery.progress = 0;
    }
  }

  processPlantGrowth(
    building: PlantPlace,
    isNight: boolean,
    currentSeason: Season,
    currentWeather: Weather,
  ): void {
    if (building.harvest && !building.harvest.isReady) {
      const config = PLANT_CONFIG[building.harvest.type];
      const consumption = config.waterConsumptionPerTick;

      const isRaining = currentWeather === Weather.Rain;

      if (isRaining) {
        if (building.type === BuildingType.Garden) {
          building.moisture = Math.min(
            100,
            building.moisture + WeatherEffects.RAIN_MOISTURE_GAIN,
          );
        } else if (building.type === BuildingType.Greenhouse) {
          building.waterTank.current = Math.min(
            building.waterTank.max,
            building.waterTank.current + WeatherEffects.RAIN_MOISTURE_GAIN,
          );
        }
      }

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
        const growthBonus = isNight
          ? WeatherEffects.NIGHT_GROWTH_COEFFICIENT
          : 1;
        building.harvest.growthProgress +=
          building.growthCoefficient * growthBonus;

        if (currentSeason === Season.Winter) {
          if (building.type === BuildingType.Garden) {
            building.health -= WeatherEffects.WINTER_PLANT_DAMAGE;
          }
        }

        if (building.harvest.growthProgress >= 100) {
          building.harvest.growthProgress = 100;
          building.harvest.isReady = true;
        }
      } else {
        building.health = Math.max(0, building.health - DROUGHT_DAMAGE_TICK);
        if (building.health <= 0) {
          building.harvest = null;
        }
      }
    }
  }
  processWell(building: Well, currentWeather: Weather) {
    if (building.currentAmount === building.maxCapacity) {
      return;
    }
    if (currentWeather === Weather.Rain) {
      building.currentAmount = Math.min(
        building.maxCapacity,
        building.currentAmount + WeatherEffects.RAIN_REFILL_WELL,
      );
    }
    building.currentAmount = Math.min(
      building.maxCapacity,
      building.currentAmount + WELL_REFILL_AMOUNT,
    );
  }
}
