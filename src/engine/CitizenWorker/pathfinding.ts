import type { Position } from "../Types.ts";
import { TERRAIN_WEIGHTS } from "./utils.ts";
interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}
class PriorityQueue {
  private heap: PathNode[] = [];

  public size() {
    return this.heap.length;
  }

  public push(node: PathNode) {
    this.heap.push(node);
    this.siftUp(this.heap.length - 1);
  }

  public pop(): PathNode | undefined {
    if (this.size() === 0) return undefined;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.size() > 0 && bottom) {
      this.heap[0] = bottom;
      this.siftDown(0);
    }
    return top;
  }

  private compare(first: number, second: number): boolean {
    return this.heap[first].f < this.heap[second].f;
  }

  private siftUp(current: number) {
    while (current > 0) {
      const pInd = Math.floor((current - 1) / 2);
      if (this.compare(current, pInd)) {
        [this.heap[current], this.heap[pInd]] = [
          this.heap[pInd],
          this.heap[current],
        ];
        current = pInd;
      } else break;
    }
  }

  private siftDown(current: number) {
    while (true) {
      const left = 2 * current + 1;
      const right = 2 * current + 2;
      let smallest = current;

      if (left < this.size() && this.compare(left, smallest)) smallest = left;
      if (right < this.size() && this.compare(right, smallest))
        smallest = right;

      if (smallest !== current) {
        [this.heap[current], this.heap[smallest]] = [
          this.heap[smallest],
          this.heap[current],
        ];
        current = smallest;
      } else break;
    }
  }
}
export class PathFinding {
  constructor(private grid: number[][]) {}

  private heuristic(a: Position, b: Position) {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return dx + dy - Math.min(dx, dy);
  }

  public findPath(start: Position, end: Position): Position[] {
    const height = this.grid.length;
    const width = this.grid[0].length;

    if (this.grid[end.y][end.x] >= TERRAIN_WEIGHTS.OBSTACLE) return [];

    const openList = new PriorityQueue();
    const closedSet = new Set<string>();
    const gScores = new Map<string, number>();

    const startNode: PathNode = {
      x: start.x,
      y: start.y,
      g: 0,
      h: this.heuristic(start, end),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.h;

    openList.push(startNode);
    gScores.set(`${start.x},${start.y}`, 0);

    while (openList.size() > 0) {
      const current = openList.pop()!;
      const currentKey = `${current.x},${current.y}`;

      if (current.x === end.x && current.y === end.y) {
        return this.reconstructPath(current);
      }

      closedSet.add(currentKey);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;

          const nx = current.x + dx;
          const ny = current.y + dy;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const weight = this.grid[ny][nx];

            if (
              weight > TERRAIN_WEIGHTS.OBSTACLE ||
              closedSet.has(`${nx},${ny}`)
            )
              continue;

            const distance = dx !== 0 && dy !== 0 ? Math.sqrt(2) : 1;
            const tentativeG = current.g + distance * weight;

            const neighborKey = `${nx},${ny}`;

            if (tentativeG < (gScores.get(neighborKey) ?? Infinity)) {
              gScores.set(neighborKey, tentativeG);
              const h = this.heuristic({ x: nx, y: ny }, end);
              const node: PathNode = {
                x: nx,
                y: ny,
                g: tentativeG,
                h,
                f: tentativeG + h,
                parent: current,
              };
              openList.push(node);
            }
          }
        }
      }
    }
    return [];
  }

  private reconstructPath(node: PathNode): Position[] {
    const path: Position[] = [];
    let curr: PathNode | null = node;
    while (curr) {
      path.push({ x: curr.x, y: curr.y });
      curr = curr.parent;
    }
    return path.reverse();
  }
}
