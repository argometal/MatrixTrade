declare module "d3-force-3d" {
  export interface SimulationNodeDatum {
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number | null;
    fy?: number | null;
    fz?: number | null;
    index?: number;
  }

  export interface SimulationLinkDatum<NodeType = SimulationNodeDatum> {
    source: string | number | NodeType;
    target: string | number | NodeType;
    index?: number;
  }

  export type ForceFn<NodeType extends SimulationNodeDatum = SimulationNodeDatum> = {
    (alpha: number): void;
    initialize?: (nodes: NodeType[]) => void;
  };

  export interface Simulation<
    NodeType extends SimulationNodeDatum = SimulationNodeDatum,
    LinkType extends SimulationLinkDatum<NodeType> = SimulationLinkDatum<NodeType>,
  > {
    tick(iterations?: number): this;
    restart(): this;
    stop(): this;
    numDimensions(n: number): this;
    force(name: string): ForceFn<NodeType> | undefined;
    force(name: string, force: null | ForceFn<NodeType>): this;
    nodes(): NodeType[];
    nodes(nodes: NodeType[]): this;
    alpha(a: number): this;
    alphaTarget(a: number): this;
    alphaDecay(a: number): this;
  }

  export interface ForceLink<
    NodeType extends SimulationNodeDatum = SimulationNodeDatum,
    LinkType extends SimulationLinkDatum<NodeType> = SimulationLinkDatum<NodeType>,
  > extends ForceFn<NodeType> {
    id(fn: (node: NodeType) => string | number): this;
    links(): LinkType[];
    links(links: LinkType[]): this;
    distance(): number | ((link: LinkType) => number);
    distance(d: number | ((link: LinkType) => number)): this;
    strength(): number | ((link: LinkType) => number);
    strength(s: number | ((link: LinkType) => number)): this;
  }

  export interface ForceManyBody<NodeType extends SimulationNodeDatum = SimulationNodeDatum>
    extends ForceFn<NodeType> {
    strength(): number | ((node: NodeType) => number);
    strength(strength: number | ((node: NodeType) => number)): this;
    distanceMax(): number;
    distanceMax(d: number): this;
  }

  export interface ForceCollide<NodeType extends SimulationNodeDatum = SimulationNodeDatum>
    extends ForceFn<NodeType> {
    radius(): number | ((node: NodeType, i: number, nodes: NodeType[]) => number);
    radius(radius: number | ((node: NodeType, i: number, nodes: NodeType[]) => number)): this;
    strength(): number;
    strength(strength: number): this;
  }

  export interface ForceCenter extends ForceFn {
    x(): number;
    x(x: number): this;
    y(): number;
    y(y: number): this;
    z(): number;
    z(z: number): this;
    strength(): number;
    strength(s: number): this;
  }

  export interface ForceX<NodeType extends SimulationNodeDatum = SimulationNodeDatum>
    extends ForceFn<NodeType> {
    x(): number | ((node: NodeType) => number);
    x(x: number | ((node: NodeType) => number)): this;
    strength(): number | ((node: NodeType) => number);
    strength(s: number | ((node: NodeType) => number)): this;
  }

  export interface ForceY<NodeType extends SimulationNodeDatum = SimulationNodeDatum>
    extends ForceFn<NodeType> {
    y(): number | ((node: NodeType) => number);
    y(y: number | ((node: NodeType) => number)): this;
    strength(): number | ((node: NodeType) => number);
    strength(s: number | ((node: NodeType) => number)): this;
  }

  export interface ForceZ<NodeType extends SimulationNodeDatum = SimulationNodeDatum>
    extends ForceFn<NodeType> {
    z(): number | ((node: NodeType) => number);
    z(z: number | ((node: NodeType) => number)): this;
    strength(): number | ((node: NodeType) => number);
    strength(s: number | ((node: NodeType) => number)): this;
  }

  export function forceSimulation<
    NodeType extends SimulationNodeDatum = SimulationNodeDatum,
    LinkType extends SimulationLinkDatum<NodeType> = SimulationLinkDatum<NodeType>,
  >(nodes?: NodeType[]): Simulation<NodeType, LinkType>;

  export function forceLink<
    NodeType extends SimulationNodeDatum = SimulationNodeDatum,
    LinkType extends SimulationLinkDatum<NodeType> = SimulationLinkDatum<NodeType>,
  >(links?: LinkType[]): ForceLink<NodeType, LinkType>;

  export function forceManyBody<
    NodeType extends SimulationNodeDatum = SimulationNodeDatum,
  >(): ForceManyBody<NodeType>;

  export function forceCollide<
    NodeType extends SimulationNodeDatum = SimulationNodeDatum,
  >(
    radius?: number | ((node: NodeType, i: number, nodes: NodeType[]) => number)
  ): ForceCollide<NodeType>;

  export function forceCenter(x?: number, y?: number, z?: number): ForceCenter;

  export function forceX<NodeType extends SimulationNodeDatum = SimulationNodeDatum>(
    x?: number | ((node: NodeType) => number)
  ): ForceX<NodeType>;

  export function forceY<NodeType extends SimulationNodeDatum = SimulationNodeDatum>(
    y?: number | ((node: NodeType) => number)
  ): ForceY<NodeType>;

  export function forceZ<NodeType extends SimulationNodeDatum = SimulationNodeDatum>(
    z?: number | ((node: NodeType) => number)
  ): ForceZ<NodeType>;
}
