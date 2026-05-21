import { type Position, ProfessionType, type Resident, ResourceType, type TaskContext } from "../Types.ts";
import { getMaxInventoryCapacity, getXpForNextLevel, PROFESSION_SETTINGS } from "../Constants.ts";

export const TERRAIN_WEIGHTS = {
  ROAD: 1,
  BRIDGE: 2,
  DEFAULT: 5,
  WATER: 1111,
  OBSTACLE: 999,
};

export const WANDER_CHANCE = 0.5;
export const WANDER_RADIUS = 5;
export const WANDER_ATTEMPTS = 5;

export function getEvcDist(a: Position, b: Position): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return dx + dy - Math.min(dx, dy);
}

export function closestByDistance<T extends { position: Position }>(
  from: Position,
  candidates: T[],
): T | undefined {
  let best: T | undefined;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = getEvcDist(from, c.position);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

export function getExitPos(build: { position: Position }): Position {
  return { x: build.position.x, y: build.position.y - 1 };
}

export function addItemToInventory(
  resident: Resident,
  type: ResourceType,
  amount: number,
) {
  if (!resident.inventory.resources[type]) {
    resident.inventory.resources[type] = 0;
  }
  resident.inventory.resources[type]! += amount;
  resident.inventory.totalAmount += amount;
}

export function addExperience(resident: Resident, amount: number): void {
  const prof = resident.profession;
  if (prof.type === ProfessionType.Jobless) return;
  const settings = PROFESSION_SETTINGS[prof.type];
  if (!settings || prof.level >= settings.maxLevel) return;

  prof.xp += amount;
  while (prof.level < settings.maxLevel) {
    const xpNeeded = getXpForNextLevel(prof.type, prof.level);
    if (prof.xp >= xpNeeded) {
      prof.xp -= xpNeeded;
      prof.level += 1;
      console.log(`${resident.name} повысил уровень до ${prof.level}!`);
    } else {
      break;
    }
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
