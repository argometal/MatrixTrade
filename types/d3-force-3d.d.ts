declare module "d3-force-3d" {
  export function forceCollide<NodeType = unknown>(
    radius?: number | ((node: NodeType, i: number, nodes: NodeType[]) => number)
  ): {
    (alpha: number): void;
    radius: (
      radius?: number | ((node: NodeType, i: number, nodes: NodeType[]) => number)
    ) => unknown;
    strength: (strength?: number) => unknown;
    initialize: (nodes: NodeType[]) => void;
  };

  export function forceManyBody<NodeType = unknown>(): {
    (alpha: number): void;
    strength: (strength?: number | ((node: NodeType) => number)) => unknown;
    initialize: (nodes: NodeType[]) => void;
  };
}
