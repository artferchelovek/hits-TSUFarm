enum TileType {
  Grass = 0,
  Hill = 1,
  Water = 2,
}

class WorldMap {
  private readonly width: number = 500;
  private readonly height: number = 500;
  private data: Uint8Array;

  constructor() {
    this.data = new Uint8Array(this.width * this.height);
  }

  private getIndex(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return -1;
    }
    return y * this.width + x;
  }

  public setTile(x: number, y: number, type: TileType): void {
    const index = this.getIndex(x, y);
    if (index !== -1) {
      this.data[index] = type;
    }
  }

  public generate(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const type = x < 5 || x > 495 ? TileType.Water : TileType.Grass;
        this.setTile(x, y, type);
      }
    }

    console.log("генерация окончена");
  }
}
