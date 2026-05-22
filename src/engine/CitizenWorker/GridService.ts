import { BuildingType, type Buildings, type Position } from "../Types.ts";
import { TileType } from "../WorldMap.ts";
import { PathFinding } from "./pathfinding.ts";
import { TERRAIN_WEIGHTS } from "./utils.ts";

export class GridService {
  private grid: number[][] = [];
  private width = 0;
  private height = 0;

  init(
    tiles: Uint8Array,
    width: number,
    height: number,
    buildings: Record<string, Buildings>,
  ) {
    this.width = width;
    this.height = height;
    this.buildGrid(tiles, buildings);
  }

  private buildGrid(
    tiles: Uint8Array,
    buildings: Record<string, Buildings>,
  ): void {
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.width; x++) {
        const tile = tiles[y * this.width + x];
        row.push(
          this.isWalkable(tile)
            ? TERRAIN_WEIGHTS.DEFAULT
            : tile === TileType.Water
              ? TERRAIN_WEIGHTS.WATER
              : TERRAIN_WEIGHTS.OBSTACLE,
        );
      }
      this.grid.push(row);
    }

    Object.values(buildings).forEach((building) => {
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
      tile === TileType.PreHill ||
      tile === TileType.Hill
    );
  }

  isPositionWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    return this.grid[y][x] <= TERRAIN_WEIGHTS.OBSTACLE;
  }

  getGrid(): number[][] {
    return this.grid;
  }

  calculatePath(start: Position, end: Position): Position[] {
    const pathfinder = new PathFinding(this.grid);
    return pathfinder.findPath(start, end);
  }

  serialize(): Uint8Array {
    const data = new Uint8Array(this.width * this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        data[y * this.width + x] = this.grid[y][x];
      }
    }
    return data;
  }

  clearArea(x: number, y: number, w: number, l: number): void {
    for (let i = y; i < y + l; i++) {
      for (let j = x; j < x + w; j++) {
        if (i < this.height && j < this.width) {
          this.grid[i][j] = TERRAIN_WEIGHTS.DEFAULT;
        }
      }
    }
  }

  updateObstacle(
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
}
