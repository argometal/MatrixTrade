"use client";

/**
 * Client-only Scout allocation selection state (26-55).
 * Simulation engine remains pure in lib/; this only holds selection order.
 * Does not persist across reloads; does not write to Supabase / Apply.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CapitalAccountSnapshot } from "@/lib/capital-account";
import { capitalFieldValue } from "@/lib/capital-types";
import type { CapitalReservation } from "@/lib/capital-types";
import type { TradePlan } from "@/lib/plan-types";
import { buildScoutAllocationCandidates } from "@/lib/scout-allocation-candidates";
import {
  deriveScoutRelationships,
  summarizeRelationshipCounts,
} from "@/lib/scout-allocation-relationships";
import {
  impactByPlanId,
  simulateScoutAllocation,
} from "@/lib/scout-allocation-simulate";
import type {
  ScoutAllocationCandidate,
  ScoutAllocationImpact,
  ScoutAllocationSimulationResult,
} from "@/lib/scout-allocation-types";
import { isActiveReservation } from "@/lib/capital-types";

export type ScoutAllocationSelectionApi = {
  selectedPlanIds: string[];
  selectionOrder: string[];
  candidates: ScoutAllocationCandidate[];
  simulation: ScoutAllocationSimulationResult;
  impactsByPlanId: Map<string, ScoutAllocationImpact>;
  availableCapital: number | undefined;
  availableRiskRoom: number | undefined;
  add: (planId: string) => void;
  remove: (planId: string) => void;
  move: (planId: string, direction: "up" | "down") => void;
  clear: () => void;
  isSelected: (planId: string) => boolean;
  relationshipsFor: (focusPlanId: string) => ReturnType<
    typeof deriveScoutRelationships
  >;
  relationshipCountsFor: (
    focusPlanId: string
  ) => ReturnType<typeof summarizeRelationshipCounts>;
};

const ScoutAllocationContext =
  createContext<ScoutAllocationSelectionApi | null>(null);

export function ScoutAllocationProvider({
  plans,
  reservations,
  capitalAccount,
  authorizableLossRoom,
  capitalConfigurationPresent,
  plannedRRByPlanId,
  initialSelectedPlanIds,
  children,
}: {
  plans: TradePlan[];
  reservations: CapitalReservation[];
  capitalAccount: CapitalAccountSnapshot | null;
  authorizableLossRoom: number | undefined;
  capitalConfigurationPresent?: boolean;
  plannedRRByPlanId?: Record<string, number | undefined>;
  initialSelectedPlanIds?: string[];
  children: ReactNode;
}) {
  const [selectionOrder, setSelectionOrder] = useState<string[]>(
    () => initialSelectedPlanIds?.filter(Boolean) ?? []
  );

  const availableCapital = capitalAccount
    ? capitalFieldValue(capitalAccount.availableCapital)
    : undefined;
  const availableRiskRoom =
    authorizableLossRoom !== undefined && Number.isFinite(authorizableLossRoom)
      ? authorizableLossRoom
      : undefined;

  const candidates = useMemo(
    () =>
      buildScoutAllocationCandidates({
        plans,
        reservations,
        account: capitalAccount,
        authorizableLossRoom: availableRiskRoom,
        capitalConfigurationPresent,
        plannedRRByPlanId,
      }),
    [
      plans,
      reservations,
      capitalAccount,
      availableRiskRoom,
      capitalConfigurationPresent,
      plannedRRByPlanId,
    ]
  );

  const selectedPlanIds = selectionOrder;

  const simulation = useMemo(
    () =>
      simulateScoutAllocation({
        availableCapital,
        availableRiskRoom,
        candidates,
        selectedPlanIds,
        selectionOrder,
        existingReservations: reservations,
      }),
    [
      availableCapital,
      availableRiskRoom,
      candidates,
      selectedPlanIds,
      selectionOrder,
      reservations,
    ]
  );

  const impactsByPlanId = useMemo(
    () => impactByPlanId(simulation),
    [simulation]
  );

  const add = useCallback((planId: string) => {
    setSelectionOrder((prev) =>
      prev.includes(planId) ? prev : [...prev, planId]
    );
  }, []);

  const remove = useCallback((planId: string) => {
    setSelectionOrder((prev) => prev.filter((id) => id !== planId));
  }, []);

  const move = useCallback((planId: string, direction: "up" | "down") => {
    setSelectionOrder((prev) => {
      const idx = prev.indexOf(planId);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapWith = direction === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= next.length) return prev;
      const tmp = next[idx]!;
      next[idx] = next[swapWith]!;
      next[swapWith] = tmp;
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelectionOrder([]);
  }, []);

  const isSelected = useCallback(
    (planId: string) => selectionOrder.includes(planId),
    [selectionOrder]
  );

  const relationshipsFor = useCallback(
    (focusPlanId: string) =>
      deriveScoutRelationships({
        focusPlanId,
        candidates,
        availableCapital,
        availableRiskRoom,
        existingReservations: reservations,
      }),
    [candidates, availableCapital, availableRiskRoom, reservations]
  );

  const relationshipCountsFor = useCallback(
    (focusPlanId: string) =>
      summarizeRelationshipCounts(relationshipsFor(focusPlanId)),
    [relationshipsFor]
  );

  const value = useMemo<ScoutAllocationSelectionApi>(
    () => ({
      selectedPlanIds,
      selectionOrder,
      candidates,
      simulation,
      impactsByPlanId,
      availableCapital,
      availableRiskRoom,
      add,
      remove,
      move,
      clear,
      isSelected,
      relationshipsFor,
      relationshipCountsFor,
    }),
    [
      selectedPlanIds,
      selectionOrder,
      candidates,
      simulation,
      impactsByPlanId,
      availableCapital,
      availableRiskRoom,
      add,
      remove,
      move,
      clear,
      isSelected,
      relationshipsFor,
      relationshipCountsFor,
    ]
  );

  return (
    <ScoutAllocationContext.Provider value={value}>
      {children}
    </ScoutAllocationContext.Provider>
  );
}

export function useScoutAllocationSelection(): ScoutAllocationSelectionApi {
  const ctx = useContext(ScoutAllocationContext);
  if (!ctx) {
    throw new Error(
      "useScoutAllocationSelection must be used within ScoutAllocationProvider"
    );
  }
  return ctx;
}

export function activeReservationIds(
  reservations: CapitalReservation[]
): string[] {
  return reservations.filter(isActiveReservation).map((r) => r.id);
}
