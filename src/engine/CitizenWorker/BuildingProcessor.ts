import {
  type Bakery,
  BuildingType,
  type Mill,
  type PlantPlace,
  ResourceType,
  Season,
  Weather,
} from "../Types.ts";
import {
  DROUGHT_DAMAGE_TICK,
  PLANT_CONFIG,
  WeatherEffects,
} from "../Constants.ts";

export class BuildingProcessor {
  processMill(mill: Mill): void {
    if (
      (mill.storage[ResourceType.Flour] ?? 0) >= mill.maxCapacity ||
      (mill.storage[ResourceType.Wheat] ?? 0) <= 0
    ) {
      mill.progress = 0;
      return;
    }

    if (mill.progress < 1) {
      mill.progress += 1 / mill.recipe.durationPerTick;

      if (mill.storage[ResourceType.Wheat]) {
        const step = mill.recipe.importCount / mill.recipe.durationPerTick;
        mill.storage[ResourceType.Wheat] = Math.max(
          mill.storage[ResourceType.Wheat] - step,
          0,
        );
        mill.capacity -= step;
        mill.capacity += mill.recipe.exportCount / mill.recipe.durationPerTick;
        mill.storage[ResourceType.Flour] =
          (mill.storage[ResourceType.Flour] ?? 0) +
          mill.recipe.exportCount / mill.recipe.durationPerTick;
      } else {
        mill.storage[ResourceType.Wheat] = 0;
      }
      return;
    }

    mill.progress = 0;
  }

  processBakery(bakery: Bakery): void {
    if (
      (bakery.storage[ResourceType.Bread] ?? 0) >= bakery.maxCapacity ||
      (bakery.storage[ResourceType.Flour] ?? 0) <= 0
    ) {
      bakery.progress = 0;
      return;
    }

    if (bakery.progress < 1) {
      bakery.progress += 1 / bakery.recipe.durationPerTick;

      if (bakery.storage[ResourceType.Flour]) {
        const step = bakery.recipe.importCount / bakery.recipe.durationPerTick;
        bakery.storage[ResourceType.Flour] = Math.max(
          bakery.storage[ResourceType.Flour] - step,
          0,
        );
        bakery.capacity -= step;
        bakery.capacity += bakery.recipe.exportCount / bakery.recipe.durationPerTick;
        bakery.storage[ResourceType.Bread] =
          (bakery.storage[ResourceType.Bread] ?? 0) +
          bakery.recipe.exportCount / bakery.recipe.durationPerTick;
      } else {
        bakery.storage[ResourceType.Flour] = 0;
      }
      return;
    }

    bakery.progress = 0;
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
          building.health -= WeatherEffects.WINTER_PLANT_DAMAGE;
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
}
