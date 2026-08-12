/**
 * Promotion discount allocation (IMP-016).
 *
 * Combinable candidate uses a deterministic max-flow capacity allocation so
 * total realizable discount is maximized (not greedy-by-narrowness).
 */
import { PromotionFatalError } from "./errors";
import { allocateLargestRemainderPaise, minPaise } from "./money";
import type {
  MonetaryComponent,
  PromotionAllocation,
  PromotionDefinition,
} from "./types";

export type PromoNominal = Readonly<{
  promotion: PromotionDefinition;
  nominalBenefitPaise: bigint;
  eligibleComponentIds: readonly string[];
}>;

function sortComponents(components: readonly MonetaryComponent[]): MonetaryComponent[] {
  return [...components].sort((a, b) => {
    if (a.lineSequence !== b.lineSequence) return a.lineSequence - b.lineSequence;
    return a.componentId.localeCompare(b.componentId);
  });
}

/** Allocate one promotion's realized benefit across eligible components. */
export function allocateSinglePromotion(
  promotionId: string,
  realizedBenefitPaise: bigint,
  eligibleComponents: readonly MonetaryComponent[],
): PromotionAllocation[] {
  if (realizedBenefitPaise <= BigInt(0)) return [];
  const sorted = sortComponents(eligibleComponents.filter((c) => c.amountPaise > BigInt(0)));
  if (sorted.length === 0) {
    throw new PromotionFatalError(
      "PROMOTION_ALLOCATION_INCONSISTENT",
      "No eligible capacity for positive benefit.",
    );
  }
  const capacity = sorted.reduce((a, c) => a + c.amountPaise, BigInt(0));
  const total = minPaise(realizedBenefitPaise, capacity);
  const weights = sorted.map((c) => c.amountPaise);
  const shares = allocateLargestRemainderPaise(total, weights);
  const allocations: PromotionAllocation[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const amount = shares[i]!;
    if (amount <= BigInt(0)) continue;
    if (amount > sorted[i]!.amountPaise) {
      throw new PromotionFatalError(
        "PROMOTION_ALLOCATION_INCONSISTENT",
        "Allocation exceeded component capacity.",
      );
    }
    allocations.push({
      promotionId,
      componentId: sorted[i]!.componentId,
      amountPaise: amount,
    });
  }
  const sum = allocations.reduce((a, x) => a + x.amountPaise, BigInt(0));
  if (sum !== total) {
    throw new PromotionFatalError(
      "PROMOTION_ALLOCATION_INCONSISTENT",
      "Single-promotion allocation did not reconcile.",
    );
  }
  return allocations;
}

/**
 * Edmonds–Karp max flow with bigint capacities on a bipartite promo↔component graph.
 */
function maximizeFlowAllocation(input: {
  promos: readonly PromoNominal[];
  componentCapacities: ReadonlyMap<string, bigint>;
}): {
  realizedByPromo: Map<string, bigint>;
  allocations: PromotionAllocation[];
} {
  type Edge = { to: number; rev: number; cap: bigint };
  const nodes: string[] = ["source", "sink"];
  const index = new Map<string, number>();
  index.set("source", 0);
  index.set("sink", 1);

  const ensure = (id: string): number => {
    const existing = index.get(id);
    if (existing !== undefined) return existing;
    const i = nodes.length;
    nodes.push(id);
    index.set(id, i);
    return i;
  };

  const graph: Edge[][] = [[], []];

  const addEdge = (from: number, to: number, cap: bigint) => {
    const fwd: Edge = { to, rev: graph[to]!.length, cap };
    const rev: Edge = { to: from, rev: graph[from]!.length, cap: BigInt(0) };
    graph[from]!.push(fwd);
    graph[to]!.push(rev);
  };

  // Grow graph arrays as nodes are added
  const grow = (n: number) => {
    while (graph.length < n) graph.push([]);
  };

  const sortedPromos = [...input.promos].sort((a, b) =>
    a.promotion.id.localeCompare(b.promotion.id),
  );
  for (const p of sortedPromos) {
    if (p.nominalBenefitPaise <= BigInt(0)) continue;
    const pi = ensure(`p:${p.promotion.id}`);
    grow(nodes.length);
    addEdge(0, pi, p.nominalBenefitPaise);
    const comps = [...p.eligibleComponentIds].sort();
    for (const cid of comps) {
      const capacity = input.componentCapacities.get(cid) ?? BigInt(0);
      if (capacity <= BigInt(0)) continue;
      const ci = ensure(`c:${cid}`);
      grow(nodes.length);
      // Uncapped promo→component; component→sink enforces capacity.
      addEdge(pi, ci, BigInt("1000000000000000000"));
    }
  }

  const sortedComponents = [...input.componentCapacities.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  for (const [cid, capacity] of sortedComponents) {
    if (capacity <= BigInt(0)) continue;
    if (!index.has(`c:${cid}`)) continue;
    const ci = ensure(`c:${cid}`);
    grow(nodes.length);
    addEdge(ci, 1, capacity);
  }

  const N = nodes.length;
  grow(N);

  const parentNode = new Array<number>(N).fill(-1);
  const parentEdge = new Array<number>(N).fill(-1);

  const bfs = (): bigint => {
    parentNode.fill(-1);
    parentEdge.fill(-1);
    const queue = [0];
    const seen = new Array<boolean>(N).fill(false);
    seen[0] = true;
    for (let qi = 0; qi < queue.length; qi++) {
      const u = queue[qi]!;
      const edges = graph[u]!;
      const order = edges
        .map((e, edgeIdx) => ({ e, edgeIdx }))
        .sort((a, b) => nodes[a.e.to]!.localeCompare(nodes[b.e.to]!));
      for (const { e, edgeIdx } of order) {
        if (e.cap <= BigInt(0) || seen[e.to]) continue;
        seen[e.to] = true;
        parentNode[e.to] = u;
        parentEdge[e.to] = edgeIdx;
        if (e.to === 1) {
          let flow = e.cap;
          let v = 1;
          while (v !== 0) {
            const pNode = parentNode[v]!;
            const edge = graph[pNode]![parentEdge[v]!]!;
            if (edge.cap < flow) flow = edge.cap;
            v = pNode;
          }
          return flow;
        }
        queue.push(e.to);
      }
    }
    return BigInt(0);
  };

  let maxFlow = BigInt(0);
  for (;;) {
    const aug = bfs();
    if (aug <= BigInt(0)) break;
    let v = 1;
    while (v !== 0) {
      const pNode = parentNode[v]!;
      const edge = graph[pNode]![parentEdge[v]!]!;
      edge.cap -= aug;
      graph[v]![edge.rev]!.cap += aug;
      v = pNode;
    }
    maxFlow += aug;
  }
  void maxFlow;

  const realizedByPromo = new Map<string, bigint>();
  const allocations: PromotionAllocation[] = [];

  for (const p of sortedPromos) {
    const pi = index.get(`p:${p.promotion.id}`);
    if (pi === undefined) {
      realizedByPromo.set(p.promotion.id, BigInt(0));
      continue;
    }
    let realized = BigInt(0);
    // Flow on promo→component = residual on reverse edges
    for (const edge of graph[pi]!) {
      const toId = nodes[edge.to]!;
      if (!toId.startsWith("c:")) continue;
      const rev = graph[edge.to]![edge.rev]!;
      const flowed = rev.cap; // amount pushed to component
      if (flowed <= BigInt(0)) continue;
      const componentId = toId.slice(2);
      allocations.push({
        promotionId: p.promotion.id,
        componentId,
        amountPaise: flowed,
      });
      realized += flowed;
    }
    realizedByPromo.set(p.promotion.id, realized);
  }

  // Validate component capacities
  const used = new Map<string, bigint>();
  for (const a of allocations) {
    used.set(a.componentId, (used.get(a.componentId) ?? BigInt(0)) + a.amountPaise);
  }
  for (const [cid, amount] of used) {
    const cap = input.componentCapacities.get(cid) ?? BigInt(0);
    if (amount > cap) {
      throw new PromotionFatalError(
        "PROMOTION_ALLOCATION_INCONSISTENT",
        "Combinable allocation exceeded component capacity.",
      );
    }
  }

  return { realizedByPromo, allocations };
}

export function allocateCombinablePromotions(
  promos: readonly PromoNominal[],
  components: readonly MonetaryComponent[],
): {
  allocations: PromotionAllocation[];
  realizedByPromo: Map<string, bigint>;
} {
  const capacities = new Map<string, bigint>();
  for (const c of components) {
    capacities.set(c.componentId, c.amountPaise);
  }

  // Prefer max-flow; then deterministic re-tie via promo order for equal flows is inherent
  const sortedPromos = [...promos].sort((a, b) => {
    const narrowA = a.eligibleComponentIds.length;
    const narrowB = b.eligibleComponentIds.length;
    if (narrowA !== narrowB) return narrowA - narrowB;
    if (a.promotion.priority !== b.promotion.priority) {
      return b.promotion.priority - a.promotion.priority;
    }
    const startA = a.promotion.startsAt.getTime();
    const startB = b.promotion.startsAt.getTime();
    if (startA !== startB) return startA - startB;
    return a.promotion.id.localeCompare(b.promotion.id);
  });

  return maximizeFlowAllocation({
    promos: sortedPromos,
    componentCapacities: capacities,
  });
}

export function applyAllocationsToComponents(
  components: readonly MonetaryComponent[],
  allocations: readonly PromotionAllocation[],
): MonetaryComponent[] {
  const discount = new Map<string, bigint>();
  for (const a of allocations) {
    discount.set(a.componentId, (discount.get(a.componentId) ?? BigInt(0)) + a.amountPaise);
  }
  return components.map((c) => {
    const d = discount.get(c.componentId) ?? BigInt(0);
    if (d > c.amountPaise) {
      throw new PromotionFatalError(
        "PROMOTION_ALLOCATION_INCONSISTENT",
        "Post-promotion component would be negative.",
      );
    }
    return { ...c, amountPaise: c.amountPaise - d };
  });
}
