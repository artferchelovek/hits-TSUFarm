import {
  type Buildings,
  BuildingType,
  type Resident,
  type Position,
  VillagerStatus,
} from "../Types.ts";
import { TileType } from "../WorldMap.ts";
import { VILLAGER_CONFIG } from "../Constants.ts";
import { PathFinding } from "./pathfinding.ts";

export interface WorkerMessage {
  type: string;
  payload: unknown;
}

export const TERRAIN_WEIGHTS = {
  ROAD: 1,
  BRIDGE: 2,
  DEFAULT: 5,
  OBSTACLE: 999,
};

export class CitizenWorker {
  private residents: Record<string, Resident> = {};
  private buildings: Record<string, Buildings> = {};
  private grid: number[][] = [];
  private width: number = 0;
  private height: number = 0;

  init(
    tiles: Uint8Array,
    buildings: Record<string, Buildings>,
    width: number,
    height: number,
  ) {
    this.width = width;
    this.height = height;
    this.buildings = buildings;
    this.buildGrid(tiles);
  }
  constructor() {}

  private buildGrid(tiles: Uint8Array): void {
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.width; x++) {
        const tile = tiles[y * this.width + x];
        row.push(
          this.isWalkable(tile)
            ? TERRAIN_WEIGHTS.DEFAULT
            : TERRAIN_WEIGHTS.OBSTACLE,
        );
      }
      this.grid.push(row);
    }

    Object.values(this.buildings).forEach((building) => {
      this.updateObstacle(
        building.position.x,
        building.position.y,
        building.width,
        building.length,
        building.type,
      );
    });
  }

  private isWalkable(tile: TileType): boolean {
    return (
      tile === TileType.Grass ||
      tile === TileType.Sand ||
      tile === TileType.PreHill
    );
  }

  public isPositionWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    return this.grid[y][x] < TERRAIN_WEIGHTS.OBSTACLE;
  }

  public setResidents(residents: Record<string, Resident>): void {
    this.residents = residents;
  }

  public getResidents(): Record<string, Resident> {
    return this.residents;
  }

  public getResident(id: string): Resident | undefined {
    return this.residents[id];
  }

  public getGrid(): number[][] {
    return this.grid;
  }

  public calculatePath(start: Position, end: Position): Position[] {
    const pathfinder = new PathFinding(this.grid);
    const path = pathfinder.findPath(start, end);
    return path;
  }

  public serialize(): Uint8Array {
    const data = new Uint8Array(this.width * this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        data[y * this.width + x] = this.grid[y][x];
      }
    }
    return data;
  }
  public updateObstacle(
    x: number,
    y: number,
    w: number,
    l: number,
    type: BuildingType,
  ): void {
    let cost = TERRAIN_WEIGHTS.OBSTACLE;

    if (type === BuildingType.Road) cost = TERRAIN_WEIGHTS.ROAD;
    if (type === BuildingType.Bridge) cost = TERRAIN_WEIGHTS.BRIDGE;

    for (let i = y; i < y + l; i++) {
      for (let j = x; j < x + w; j++) {
        if (i < this.height && j < this.width) {
          this.grid[i][j] = cost;
        }
      }
    }
  }
  public tick(isNight: boolean): {
    updatedResidents: Record<string, Resident>;
    deadResidentIds: string[];
  } {
    const deadResidentIds: string[] = [];

    for (const id in this.residents) {
      const resident = this.residents[id];
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

      const deathChance =
        (resident.age / 100) * VILLAGER_CONFIG.baseDeathChance;
      if (Math.random() < deathChance) {
        resident.health = 0;
      }

      if (resident.health <= 0) {
        deadResidentIds.push(id);
        delete this.residents[id];
        continue;
      }

      this.updateMovement(resident, isNight);
    }

    return {
      updatedResidents: this.residents,
      deadResidentIds,
    };
  }
  private updateMovement(resident: Resident, isNight: boolean): void {
    if (
      resident.status === "Moving" &&
      resident.path &&
      resident.path.length > 0
    ) {
      const nextStep = resident.path[0];

      if (this.isPositionWalkable(nextStep.x, nextStep.y)) {
        resident.position = nextStep;
        resident.path.shift();
      } else {
        resident.path = [];
        resident.status = VillagerStatus.Idle;
      }
    }

    if (isNight && resident.status === VillagerStatus.Idle && resident.homeId) {
    }
  }
}
