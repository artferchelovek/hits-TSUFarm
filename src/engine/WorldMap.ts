import { createNoise2D } from "simplex-noise";

export enum TileType {
  Grass = 0,
  Hill = 1,
  Water = 2,
  Sand = 3,
  PreHill = 4,
  DeepWater = 5,
}

export class WorldMap {
  readonly width: number = 500;
  readonly height: number = 500;
  data: Uint8Array;

  constructor() {
    this.data = new Uint8Array(this.width * this.height);
  }

  serialize(): string {
    let binary = "";
    for (let i = 0; i < this.data.length; i++) {
      binary += String.fromCharCode(this.data[i]);
    }
    return btoa(binary);
  }

  static deserialize(raw: string): WorldMap {
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const map = new WorldMap();
    map.data = bytes;
    return map;
  }

  private getIndex(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return -1;
    }
    return y * this.width + x;
  }

  public getTile(x: number, y: number): TileType {
    const index = this.getIndex(x, y);
    return index !== -1 ? this.data[index] : TileType.Water;
  }

  public setTile(x: number, y: number, type: TileType): void {
    const index = this.getIndex(x, y);
    if (index !== -1) {
      this.data[index] = type;
    }
  }

  public generate(): void {
    const noise2D = createNoise2D();

    const scale = 0.015;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const n1 = noise2D(x * scale, y * scale);
        const n2 = 0.5 * noise2D(x * scale * 2, y * scale * 2);
        const n3 = 0.25 * noise2D(x * scale * 4, y * scale * 4);

        let val = (n1 + n2 + n3) / 1.75;
        val = (val + 1) / 2;

        val = Math.pow(val, 1.1);

        let type = TileType.Grass;

        if (val < 0.18) {
          type = TileType.DeepWater;
        } else if (val < 0.25) {
          type = TileType.Water;
        } else if (val < 0.28) {
          type = TileType.Sand;
        } else if (val > 0.63) {
          type = TileType.PreHill;
          if (val > 0.68) {
            type = TileType.Hill;
          }
        }

        this.setTile(x, y, type);
      }
    }
    console.log("Симплекс-генерация завершена!");
  }
}
