import {
  BuildingType,
  type Bakery,
  type Buildings,
  type Granary,
  type Main,
  type Market,
  type Mill,
  type Position,
  ProfessionType,
  type Resident,
  ResourceType,
  type TaskContext,
  type Transporter,
  VillagerStatus,
} from "../Types.ts";
import {
  getMaxInventoryCapacity,
  getSpeedWork,
  LEVEL_CONFIG,
  TRANSPORTER_TASK_DURATION,
  XP_REWARDS,
} from "../Constants.ts";
import { addExperience, getEvcDist, getExitPos } from "./utils.ts";
import { GridService } from "./GridService.ts";

export class TransportService {
  constructor(private grid: GridService) {}

  findBestExportSource(
    resident: Resident,
    buildings: Record<string, Buildings>,
  ): {
    source: Buildings;
    resourceType: ResourceType;
    takeAmount: number;
  } | null {
    let bestSource: Buildings | null = null;
    let bestResourceType: ResourceType | null = null;
    let bestDest: Buildings | null = null;
    let bestScore = -Infinity;
    let bestAmount = 0;

    for (const build of Object.values(buildings)) {
      const exportArr = (build as any).export;
      if (!Array.isArray(exportArr) || exportArr.length === 0) continue;

      const availableResources: {
        type: ResourceType;
        amount: number;
        max: number;
      }[] = [];

      if (build.type === BuildingType.Granary) {
        const g = build as Granary;
        if (g.resourceType && g.storage.amount > 0) {
          availableResources.push({
            type: g.resourceType,
            amount: g.storage.amount,
            max: g.storage.maxCapacity,
          });
        }
      } else if (build.type === BuildingType.Mill) {
        const m = build as Mill;
        const exportKey = m.recipe.export;
        const amount = m.storage[exportKey] ?? 0;
        if (amount > 0) {
          availableResources.push({
            type: exportKey,
            amount: amount,
            max: m.maxCapacity,
          });
        }
      } else if (build.type === BuildingType.Bakery) {
        const b = build as Bakery;
        const exportKey = b.recipe.export;
        const amount = b.storage[exportKey] ?? 0;
        if (amount > 0) {
          availableResources.push({
            type: exportKey,
            amount: amount,
            max: b.maxCapacity,
          });
        }
      } else if (build.type === BuildingType.Main) {
        const m = build as Main;
        Object.entries(m.storage).forEach(([res, amount]) => {
          if ((amount ?? 0) > 0) {
            availableResources.push({
              type: res as ResourceType,
              amount: amount ?? 0,
              max: m.maxCapacity,
            });
          }
        });
      }

      for (const res of availableResources) {
        const dest = this.findBestExportDestination(
          exportArr,
          res.type,
          build.position,
          buildings,
        );
        if (!dest) continue;

        const dist = getEvcDist(resident.position, build.position);

        const fullness = res.amount / res.max;
        const score = fullness / (dist + 1);

        if (score > bestScore) {
          bestScore = score;
          bestSource = build;
          bestDest = dest;
          bestResourceType = res.type;
          bestAmount = res.amount;
        }
      }
    }

    if (!bestSource || !bestResourceType || !bestDest) return null;

    const transporterLevel = (resident.profession as Transporter).level;
    const maxCarry = getMaxInventoryCapacity(
      ProfessionType.Transporter,
      transporterLevel,
    );
    const freeInv = maxCarry - resident.inventory.totalAmount;

    const destNeed = this.getDestinationNeed(bestDest, bestResourceType);
    const takeAmount = Math.min(bestAmount, freeInv, destNeed);

    if (takeAmount <= 0) return null;

    bestSource.incoming[bestResourceType] =
      (bestSource.incoming[bestResourceType] ?? 0) + 1;

    return {
      source: bestSource,
      resourceType: bestResourceType,
      takeAmount,
    };
  }

  private getDestinationNeed(
    dest: Buildings,
    resourceType: ResourceType,
    currentEconomyLevel: number = 1,
  ): number {
    if (dest.type === BuildingType.Mill) {
      const m = dest as Mill;
      if (m.recipe.import !== resourceType) return 0;
      const need = m.maxCapacity - m.capacity;
      if (need < 1) return 0;
      return need;
    }
    if (dest.type === BuildingType.Bakery) {
      const b = dest as Bakery;
      if (b.recipe.import !== resourceType) return 0;
      const need = b.maxCapacity - b.capacity;
      if (need < 1) return 0;
      return need;
    }
    if (dest.type === BuildingType.Granary) {
      const g = dest as Granary;
      if (!g.resourceType || g.resourceType !== resourceType) return 0;
      return g.storage.maxCapacity - g.storage.amount;
    }
    if (dest.type === BuildingType.Market) {
      const m = dest as Market;
      const totalAmount = (Object.values(m.storage) as number[]).reduce(
        (sum, amt) => sum + amt,
        0,
      );
      return m.maxCapacity - totalAmount;
    }
    if (dest.type === BuildingType.Main) {
      const m = dest as Main;
      const config = LEVEL_CONFIG[currentEconomyLevel];
      if (!config) return 0;

      const needed = config.upgradeCost.resources[resourceType] ?? 0;
      const stored = m.storage[resourceType] ?? 0;
      return Math.max(0, needed - stored);
    }
    return 0;
  }

  private findBestExportDestination(
    exportArr: string[],
    resourceType: ResourceType,
    pos: Position,
    buildings: Record<string, Buildings>,
    currentEconomyLevel: number = 1,
  ): Buildings | null {
    let bestDest: Buildings | null = null;
    let bestScore = -Infinity;

    const mainBuilding = Object.values(buildings).find(
      (b) => b.type === BuildingType.Main,
    );

    const candidates = [...exportArr];
    if (mainBuilding && !candidates.includes(mainBuilding.id)) {
      candidates.push(mainBuilding.id);
    }

    for (const destId of candidates) {
      const dest = buildings[destId];
      if (!dest) continue;
      if ((dest.incoming[resourceType] ?? 0) >= 3) continue;

      const need = this.getDestinationNeed(dest, resourceType, currentEconomyLevel);
      if (need <= 0) continue;

      let maxCapacity = 100;
      if (dest.type === BuildingType.Mill)
        maxCapacity = (dest as Mill).maxCapacity;
      if (dest.type === BuildingType.Bakery)
        maxCapacity = (dest as Bakery).maxCapacity;
      if (dest.type === BuildingType.Granary)
        maxCapacity = (dest as Granary).storage.maxCapacity;
      if (dest.type === BuildingType.Market)
        maxCapacity = (dest as Market).maxCapacity;
      if (dest.type === BuildingType.Main)
        maxCapacity = (dest as Main).maxCapacity;

      const dist = getEvcDist(pos, dest.position);

      const deficitRatio = need / maxCapacity;
      const score = Math.pow(deficitRatio, 2) / (dist + 1);

      if (score > bestScore) {
        bestScore = score;
        bestDest = dest;
      }
    }

    return bestDest;
  }

  routeRemainder(
    resident: Resident,
    tc: TaskContext,
    buildings: Record<string, Buildings>,
    currentEconomyLevel: number = 1,
  ): void {
    if (tc.sourceId) {
      const source = buildings[tc.sourceId];
      if (source && Array.isArray((source as any).export)) {
        const next = this.findBestExportDestination(
          (source as any).export,
          tc.resourceType,
          resident.position,
          buildings,
          currentEconomyLevel,
        );
        if (next) {
          next.incoming[tc.resourceType] =
            (next.incoming[tc.resourceType] ?? 0) + 1;
          tc.targetId = next.id;
          return;
        }
      }
      if (source) {
        let canAccept = false;
        if (source.type === BuildingType.Granary) {
          canAccept =
            (source as Granary).storage.amount <
            (source as Granary).storage.maxCapacity;
        } else if (source.type === BuildingType.Mill) {
          canAccept =
            (source as Mill).capacity < (source as Mill).maxCapacity;
        } else if (source.type === BuildingType.Bakery) {
          canAccept =
            (source as Bakery).capacity < (source as Bakery).maxCapacity;
        } else if (source.type === BuildingType.Market) {
          const m = source as Market;
          const totalAmount = (Object.values(m.storage) as number[]).reduce(
            (sum, amt) => sum + amt,
            0,
          );
          canAccept = totalAmount < m.maxCapacity;
        }
        if (canAccept) {
          tc.targetId = tc.sourceId;
          return;
        }
      }
    }
    tc.targetId = "";
  }

  updateTransporter(
    resident: Resident,
    buildings: Record<string, Buildings>,
    currentEconomyLevel: number = 1,
  ): void {
    if (resident.profession.type !== ProfessionType.Transporter) return;

    const tc = resident.taskContext;

    if (resident.inventory.totalAmount > 0) {
      if (tc?.targetId && buildings[tc.targetId]) {
        const dest = buildings[tc.targetId];
        resident.path = this.grid.calculatePath(
          resident.position,
          getExitPos(dest),
        );
        resident.pathIndex = 0;
        resident.status = VillagerStatus.MovingToExportTarget;
        return;
      }

      const carriedType = (
        Object.keys(resident.inventory.resources) as ResourceType[]
      ).find((k) => (resident.inventory.resources[k] ?? 0) > 0);
      if (!carriedType) return;

      if (tc?.sourceId) {
        const source = buildings[tc.sourceId];
        if (source && Array.isArray((source as any).export)) {
          const dest = this.findBestExportDestination(
            (source as any).export,
            carriedType,
            resident.position,
            buildings,
            currentEconomyLevel,
          );
          if (dest) {
            dest.incoming[carriedType] =
              (dest.incoming[carriedType] ?? 0) + 1;
            tc.targetId = dest.id;
            resident.path = this.grid.calculatePath(
              resident.position,
              getExitPos(dest),
            );
            resident.pathIndex = 0;
            resident.status = VillagerStatus.MovingToExportTarget;
            return;
          }

          let canAccept = false;
          if (source.type === BuildingType.Granary) {
            canAccept =
              (source as Granary).storage.amount <
              (source as Granary).storage.maxCapacity;
          } else if (source.type === BuildingType.Mill) {
            canAccept =
              (source as Mill).capacity < (source as Mill).maxCapacity;
          } else if (source.type === BuildingType.Bakery) {
            canAccept =
              (source as Bakery).capacity < (source as Bakery).maxCapacity;
          } else if (source.type === BuildingType.Market) {
            const m = source as Market;
            const totalAmount = (Object.values(m.storage) as number[]).reduce(
              (sum, amt) => sum + amt,
              0,
            );
            canAccept = totalAmount < m.maxCapacity;
          }
          if (canAccept) {
            tc.targetId = tc.sourceId;
            resident.path = this.grid.calculatePath(
              resident.position,
              getExitPos(source),
            );
            resident.pathIndex = 0;
            resident.status = VillagerStatus.MovingToExportTarget;
            return;
          }
        }
      }

      // If no valid destination and source cannot accept, clear inventory to prevent getting stuck
      resident.inventory.resources = {};
      resident.inventory.totalAmount = 0;
      if (tc) tc.targetId = "";
      return;
    }

    const result = this.findBestExportSource(resident, buildings);
    if (!result) return;

    resident.taskContext = {
      targetId: result.source.id,
      sourceId: result.source.id,
      resourceType: result.resourceType,
      neededAmount: result.takeAmount,
      currentAmount: 0,
    };
    resident.path = this.grid.calculatePath(
      resident.position,
      getExitPos(result.source),
    );
    resident.pathIndex = 0;
    resident.status = VillagerStatus.MovingToExportSource;
  }

  loadingExport(
    resident: Resident,
    buildings: Record<string, Buildings>,
    currentEconomyLevel: number = 1,
  ): boolean {
    if (resident.profession.type !== ProfessionType.Transporter) return false;

    const tc = resident.taskContext;
    if (!tc) return false;

    const source = buildings[tc.targetId];
    if (!source) {
      resident.taskContext = null;
      return true;
    }

    let availableAmount = 0;
    if (source.type === BuildingType.Granary) {
      const g = source as Granary;
      if (!g.resourceType || g.storage.amount <= 0) return false;
      availableAmount = g.storage.amount;
    } else if (source.type === BuildingType.Mill) {
      const m = source as Mill;
      const millKey = tc.resourceType as
        | ResourceType.Flour
        | ResourceType.Bread;
      availableAmount = m.storage[millKey] ?? 0;
      if (availableAmount <= 0) return false;
    } else if (source.type === BuildingType.Bakery) {
      const b = source as Bakery;
      availableAmount = b.storage[ResourceType.Bread] ?? 0;
      if (availableAmount <= 0) return false;
    } else if (source.type === BuildingType.Main) {
      const m = source as Main;
      availableAmount = m.storage[tc.resourceType] ?? 0;
      if (availableAmount <= 0) return false;
    } else {
      return false;
    }

    const transporterLevel = (resident.profession as Transporter).level;
    const maxCarry = getMaxInventoryCapacity(
      ProfessionType.Transporter,
      transporterLevel,
    );
    const freeInv = maxCarry - resident.inventory.totalAmount;
    const toTake = Math.min(availableAmount, tc.neededAmount, freeInv);
    if (toTake <= 0) return false;

    if (resident.workProgress < TRANSPORTER_TASK_DURATION.LOADING) {
      resident.workProgress += getSpeedWork(
        ProfessionType.Transporter,
        transporterLevel,
      );
      return false;
    }

    if (source.type === BuildingType.Granary) {
      (source as Granary).storage.amount -= toTake;
    } else if (source.type === BuildingType.Mill) {
      const m = source as Mill;
      const millKey = tc.resourceType as
        | ResourceType.Flour
        | ResourceType.Bread;
      m.storage[millKey] = (m.storage[millKey] ?? 0) - toTake;
      if (m.storage[millKey]! <= 0) delete m.storage[millKey];
      m.capacity -= toTake;
    } else if (source.type === BuildingType.Bakery) {
      const b = source as Bakery;
      b.storage[ResourceType.Bread] =
        (b.storage[ResourceType.Bread] ?? 0) - toTake;
      if (b.storage[ResourceType.Bread]! <= 0)
        delete b.storage[ResourceType.Bread];
      b.capacity -= toTake;
    } else if (source.type === BuildingType.Main) {
      const m = source as Main;
      m.storage[tc.resourceType] = (m.storage[tc.resourceType] ?? 0) - toTake;
      if (m.storage[tc.resourceType]! <= 0) delete m.storage[tc.resourceType];
    }

    resident.inventory.resources[tc.resourceType] =
      (resident.inventory.resources[tc.resourceType] ?? 0) + toTake;
    resident.inventory.totalAmount += toTake;

    const exportArr = (source as any).export as string[];
    const dest = this.findBestExportDestination(
      exportArr,
      tc.resourceType,
      resident.position,
      buildings,
      currentEconomyLevel,
    );

    if (!dest) {
      if (source.type === BuildingType.Granary) {
        (source as Granary).storage.amount += toTake;
      } else if (source.type === BuildingType.Mill) {
        const m = source as Mill;
        const millKey = tc.resourceType as
          | ResourceType.Flour
          | ResourceType.Bread;
        m.storage[millKey] = (m.storage[millKey] ?? 0) + toTake;
        m.capacity += toTake;
      } else if (source.type === BuildingType.Bakery) {
        const b = source as Bakery;
        b.storage[ResourceType.Bread] =
          (b.storage[ResourceType.Bread] ?? 0) + toTake;
        b.capacity += toTake;
      } else if (source.type === BuildingType.Main) {
        const m = source as Main;
        m.storage[tc.resourceType] = (m.storage[tc.resourceType] ?? 0) + toTake;
      }
      delete resident.inventory.resources[tc.resourceType];
      resident.inventory.totalAmount = Math.max(
        0,
        resident.inventory.totalAmount - toTake,
      );
      resident.workProgress = 0;
      resident.taskContext = null;
      return true;
    }

    addExperience(
      resident,
      XP_REWARDS[ProfessionType.Transporter].LOADING,
    );

    dest.incoming[tc.resourceType] =
      (dest.incoming[tc.resourceType] ?? 0) + 1;
    tc.targetId = dest.id;
    tc.neededAmount = toTake;
    tc.currentAmount = 0;
    resident.workProgress = 0;
    return true;
  }

  unloadingExport(
    resident: Resident,
    buildings: Record<string, Buildings>,
    currentEconomyLevel: number = 1,
  ): boolean {
    if (resident.profession.type !== ProfessionType.Transporter) return false;

    const tc = resident.taskContext;
    if (!tc) return false;

    const dest = buildings[tc.targetId];
    if (!dest) {
      resident.taskContext = null;
      return true;
    }

    const availableAmount = resident.inventory.resources[tc.resourceType] ?? 0;
    if (availableAmount <= 0) {
      resident.taskContext = null;
      return true;
    }

    let freeSpace = 0;

    if (dest.id === tc.sourceId) {
      if (dest.type === BuildingType.Granary) {
        freeSpace =
          (dest as Granary).storage.maxCapacity -
          (dest as Granary).storage.amount;
      } else if (dest.type === BuildingType.Mill) {
        freeSpace = (dest as Mill).maxCapacity - (dest as Mill).capacity;
      } else if (dest.type === BuildingType.Bakery) {
        freeSpace = (dest as Bakery).maxCapacity - (dest as Bakery).capacity;
      } else if (dest.type === BuildingType.Market) {
        const m = dest as Market;
        const totalAmount = (Object.values(m.storage) as number[]).reduce(
          (sum, amt) => sum + amt,
          0,
        );
        freeSpace = m.maxCapacity - totalAmount;
      } else if (dest.type === BuildingType.Main) {
        const m = dest as Main;
        const config = LEVEL_CONFIG[currentEconomyLevel];
        if (!config) {
          resident.taskContext = null;
          return true;
        }
        const needed = config.upgradeCost.resources[tc.resourceType] ?? 0;
        const stored = m.storage[tc.resourceType] ?? 0;
        freeSpace = Math.max(0, needed - stored);
      } else {
        resident.taskContext = null;
        return true;
      }
    } else {
      if (dest.type === BuildingType.Mill) {
        const m = dest as Mill;
        if (m.recipe.import !== tc.resourceType) {
          resident.taskContext = null;
          return true;
        }
        freeSpace = m.maxCapacity - m.capacity;
      } else if (dest.type === BuildingType.Bakery) {
        const b = dest as Bakery;
        if (b.recipe.import !== tc.resourceType) {
          resident.taskContext = null;
          return true;
        }
        freeSpace = b.maxCapacity - b.capacity;
      } else if (dest.type === BuildingType.Granary) {
        const g = dest as Granary;
        if (g.resourceType && g.resourceType !== tc.resourceType) {
          resident.taskContext = null;
          return true;
        }
        freeSpace = g.storage.maxCapacity - g.storage.amount;
      } else if (dest.type === BuildingType.Market) {
        const m = dest as Market;
        const totalAmount = (Object.values(m.storage) as number[]).reduce(
          (sum, amt) => sum + amt,
          0,
        );
        freeSpace = m.maxCapacity - totalAmount;
      } else if (dest.type === BuildingType.Main) {
        const m = dest as Main;
        const config = LEVEL_CONFIG[currentEconomyLevel];
        if (!config) {
          resident.taskContext = null;
          return true;
        }
        const needed = config.upgradeCost.resources[tc.resourceType] ?? 0;
        const stored = m.storage[tc.resourceType] ?? 0;
        freeSpace = Math.max(0, needed - stored);
      } else {
        resident.taskContext = null;
        return true;
      }
    }

    const toUnload = Math.min(availableAmount, freeSpace);
    if (toUnload <= 0) {
      if (
        dest.id !== tc.sourceId &&
        (dest.incoming[tc.resourceType] ?? 0) > 0
      ) {
        dest.incoming[tc.resourceType]! -= 1;
      }
      this.routeRemainder(resident, tc, buildings, currentEconomyLevel);
      return true;
    }

    const transporterLevel = (resident.profession as Transporter).level;
    if (resident.workProgress < TRANSPORTER_TASK_DURATION.UNLOADING) {
      resident.workProgress += getSpeedWork(
        ProfessionType.Transporter,
        transporterLevel,
      );
      return false;
    }

    if (dest.type === BuildingType.Granary) {
      (dest as Granary).storage.amount += toUnload;
    } else if (dest.type === BuildingType.Mill) {
      const m = dest as Mill;
      const millKey = tc.resourceType as
        | ResourceType.Wheat
        | ResourceType.Flour
        | ResourceType.Bread;
      m.storage[millKey] = (m.storage[millKey] ?? 0) + toUnload;
      m.capacity += toUnload;
    } else if (dest.type === BuildingType.Bakery) {
      const b = dest as Bakery;
      const bakeryKey = tc.resourceType as
        | ResourceType.Flour
        | ResourceType.Bread;
      b.storage[bakeryKey] = (b.storage[bakeryKey] ?? 0) + toUnload;
      b.capacity += toUnload;
    } else if (dest.type === BuildingType.Market) {
      const m = dest as Market;
      m.storage[tc.resourceType] = (m.storage[tc.resourceType] ?? 0) + toUnload;
    } else if (dest.type === BuildingType.Main) {
      const m = dest as Main;
      m.storage[tc.resourceType] = (m.storage[tc.resourceType] ?? 0) + toUnload;
    }

    resident.inventory.resources[tc.resourceType]! -= toUnload;
    resident.inventory.totalAmount -= toUnload;
    if (resident.inventory.resources[tc.resourceType]! <= 0) {
      delete resident.inventory.resources[tc.resourceType];
    }
    if (dest.id !== tc.sourceId && (dest.incoming[tc.resourceType] ?? 0) > 0) {
      dest.incoming[tc.resourceType]! -= 1;
    }
    if ((resident.inventory.resources[tc.resourceType] ?? 0) > 0) {
      this.routeRemainder(resident, tc, buildings, currentEconomyLevel);
      if (tc.targetId) {
        const nextDest = buildings[tc.targetId];
        resident.path = this.grid.calculatePath(
          resident.position,
          getExitPos(nextDest),
        );
        resident.pathIndex = 0;
        resident.status = VillagerStatus.MovingToExportTarget;
        resident.workProgress = 0;
        return true;
      }
      resident.taskContext = null;
    } else {
      addExperience(
        resident,
        XP_REWARDS[ProfessionType.Transporter].UNLOADING,
      );
      resident.taskContext = null;
    }

    resident.workProgress = 0;
    return true;
  }
}
