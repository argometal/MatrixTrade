import type {
  MtaeAsymmetryQuality,
  MtaeBattleZone,
  MtaeCalibrationErrorType,
  MtaeCandleConfirmation,
  MtaeCandlePattern,
  MtaeCandleSignal,
  MtaeDominantCondition,
  MtaeHistoricalReactionZone,
  MtaeIntegratedView,
  MtaeLargeParticipantFootprint,
  MtaeMovementCharacter,
  MtaeMovementCharacterLabel,
  MtaeParticipantSignal,
  MtaeParticipation,
  MtaeParticipationSynthesis,
  MtaePriceVolumeRelationship,
  MtaePriceZone,
  MtaeRankedLevel,
  MtaeReachProbability,
  MtaeRelativeVolume,
  MtaeTechnicalSummary,
  MtaeTimeframeReport,
  MtaeTimeframeRoles,
  MtaeTrend,
  MtaeVolumeBehavior,
  MtaeVolumeConfirmation,
  MtaeVolumeDirectionalBias,
  MtaeVolumeState,
  MtaeWickAnalysis,
  MtaeWickNetMessage,
  MtaeWickRejection,
} from "./mtae-types";
import {
  MTAE_CANDLE_CONFIRMATIONS,
  MTAE_CANDLE_PATTERNS,
  MTAE_DOMINANT_CONDITIONS,
  MTAE_MOVEMENT_CHARACTERS,
  MTAE_PARTICIPANT_SIGNALS,
  MTAE_PRICE_VOLUME_RELATIONSHIPS,
  MTAE_RELATIVE_VOLUMES,
  MTAE_VOLUME_CONFIRMATIONS,
  MTAE_VOLUME_DIRECTIONAL_BIASES,
  MTAE_VOLUME_STATES,
  MTAE_WICK_NET_MESSAGES,
} from "./mtae-types";

const TRENDS: MtaeTrend[] = ["bullish", "neutral", "bearish"];
const REACH: MtaeReachProbability[] = ["high", "medium", "low"];
const ASYM: MtaeAsymmetryQuality[] = ["acceptable", "good", "excellent"];
const ERROR_TYPES: MtaeCalibrationErrorType[] = [
  "support_hierarchy",
  "resistance_hierarchy",
  "battle_zone",
  "probable_target",
  "extended_target",
  "structural_invalidation",
  "trend",
  "structure",
  "volume_behavior",
  "movement_character",
  "wick_hierarchy",
  "candle_signal_context",
  "historical_reaction_rank",
  "participant_footprint_overclaim",
  "other",
];

function enumOne<T extends string>(
  raw: unknown,
  allowed: readonly T[],
  label: string,
  errors: string[]
): T | undefined {
  const v = String(raw ?? "").trim() as T;
  if (!(allowed as readonly string[]).includes(v)) {
    errors.push(`${label} must be one of: ${allowed.join(", ")}`);
    return undefined;
  }
  return v;
}

function stringList(raw: unknown, label: string, errors: string[]): string[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    errors.push(`${label} must be an array of strings`);
    return [];
  }
  return raw.map((c) => String(c).trim()).filter(Boolean);
}

function clampConfidence(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function parseZone(raw: unknown, label: string, errors: string[]): MtaePriceZone | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push(`${label} must be {low, high}`);
    return undefined;
  }
  const z = raw as Record<string, unknown>;
  const low = Number(z.low);
  const high = Number(z.high);
  if (!Number.isFinite(low) || !Number.isFinite(high)) {
    errors.push(`${label} low/high must be numbers`);
    return undefined;
  }
  if (low > high) {
    errors.push(`${label} low must be <= high`);
    return undefined;
  }
  return { low, high };
}

function parseTrend(raw: unknown, label: string, errors: string[]): MtaeTrend | undefined {
  const v = String(raw ?? "").toLowerCase() as MtaeTrend;
  if (!TRENDS.includes(v)) {
    errors.push(`${label} must be bullish|neutral|bearish`);
    return undefined;
  }
  return v;
}

function parseRankedLevels(raw: unknown, label: string, errors: string[]): MtaeRankedLevel[] {
  if (!Array.isArray(raw)) {
    errors.push(`${label} must be an array`);
    return [];
  }
  const out: MtaeRankedLevel[] = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`${label}[${i}] must be an object`);
      return;
    }
    const row = item as Record<string, unknown>;
    const rank = Number(row.rank);
    const reason = String(row.reason ?? "").trim();
    const confidence = clampConfidence(Number(row.confidence ?? 0));
    if (!Number.isFinite(rank) || rank < 1) {
      errors.push(`${label}[${i}].rank must be >= 1`);
      return;
    }
    if (!reason) {
      errors.push(`${label}[${i}].reason required`);
      return;
    }
    const price =
      row.price !== undefined && Number.isFinite(Number(row.price)) ? Number(row.price) : undefined;
    const zone = parseZone(row.zone, `${label}[${i}].zone`, errors);
    if (price === undefined && !zone) {
      errors.push(`${label}[${i}] needs price or zone`);
      return;
    }
    out.push({
      rank,
      price,
      zone,
      strength:
        row.strength !== undefined && Number.isFinite(Number(row.strength))
          ? clampConfidence(Number(row.strength))
          : undefined,
      reason,
      confidence,
    });
  });
  return out;
}

function parseBattleZones(raw: unknown, label: string, errors: string[]): MtaeBattleZone[] {
  if (!Array.isArray(raw)) {
    errors.push(`${label} must be an array`);
    return [];
  }
  const out: MtaeBattleZone[] = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`${label}[${i}] must be an object`);
      return;
    }
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? "").trim() || `bz-${i + 1}`;
    const low = Number(row.low);
    const high = Number(row.high);
    const reachProbability = String(row.reachProbability ?? "").toLowerCase() as MtaeReachProbability;
    const asymmetryQuality = String(row.asymmetryQuality ?? "").toLowerCase() as MtaeAsymmetryQuality;
    const technicalImportance = clampConfidence(Number(row.technicalImportance ?? 0));
    const reason = String(row.reason ?? "").trim();
    if (!Number.isFinite(low) || !Number.isFinite(high) || low > high) {
      errors.push(`${label}[${i}] needs valid low/high`);
      return;
    }
    if (!REACH.includes(reachProbability)) {
      errors.push(`${label}[${i}].reachProbability must be high|medium|low`);
      return;
    }
    if (!ASYM.includes(asymmetryQuality)) {
      errors.push(`${label}[${i}].asymmetryQuality must be acceptable|good|excellent`);
      return;
    }
    if (!reason) {
      errors.push(`${label}[${i}].reason required`);
      return;
    }
    out.push({ id, low, high, reachProbability, asymmetryQuality, technicalImportance, reason });
  });
  return out;
}

function parseTimeframeRoles(raw: unknown, errors: string[]): MtaeTimeframeRoles | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push("timeframeRoles must be an object");
    return null;
  }
  const r = raw as Record<string, unknown>;
  const strategic_tf = String(r.strategic_tf ?? "").trim();
  const opportunity_tf = String(r.opportunity_tf ?? "").trim();
  const refinement_tf = String(r.refinement_tf ?? "").trim();
  const execution_tf = String(r.execution_tf ?? "").trim();
  if (!strategic_tf || !opportunity_tf || !refinement_tf || !execution_tf) {
    errors.push(
      "timeframeRoles requires strategic_tf, opportunity_tf, refinement_tf, execution_tf"
    );
    return null;
  }
  const roles: MtaeTimeframeRoles = {
    strategic_tf,
    opportunity_tf,
    refinement_tf,
    execution_tf,
  };
  if (r.execution_detail_tf !== undefined) {
    const detail = String(r.execution_detail_tf).trim();
    if (detail) roles.execution_detail_tf = detail;
  }
  return roles;
}

function parseWickRejection(
  raw: unknown,
  label: string,
  errors: string[]
): MtaeWickRejection | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push(`${label} must be an object`);
    return undefined;
  }
  const row = raw as Record<string, unknown>;
  const zone = parseZone(row.zone, `${label}.zone`, errors);
  if (!zone) {
    errors.push(`${label}.zone required`);
    return undefined;
  }
  const frequency = Number(row.frequency);
  if (!Number.isFinite(frequency) || frequency < 1) {
    errors.push(`${label}.frequency must be >= 1`);
    return undefined;
  }
  const volumeConfirmation = enumOne(
    row.volumeConfirmation,
    MTAE_VOLUME_CONFIRMATIONS,
    `${label}.volumeConfirmation`,
    errors
  );
  const interpretation = String(row.interpretation ?? "").trim();
  if (!volumeConfirmation || !interpretation) {
    if (!interpretation) errors.push(`${label}.interpretation required`);
    return undefined;
  }
  return {
    zone,
    frequency: Math.round(frequency),
    strength: clampConfidence(Number(row.strength ?? 50)),
    volumeConfirmation: volumeConfirmation as MtaeVolumeConfirmation,
    interpretation,
  };
}

function parseWickList(
  raw: unknown,
  label: string,
  errors: string[]
): MtaeWickRejection[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    errors.push(`${label} must be an array`);
    return [];
  }
  const out: MtaeWickRejection[] = [];
  raw.forEach((item, i) => {
    const parsed = parseWickRejection(item, `${label}[${i}]`, errors);
    if (parsed) out.push(parsed);
  });
  return out;
}

function parseVolumeBehavior(
  raw: unknown,
  label: string,
  errors: string[]
): MtaeVolumeBehavior | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push(`${label} must be an object`);
    return undefined;
  }
  const row = raw as Record<string, unknown>;
  const state = enumOne(row.state, MTAE_VOLUME_STATES, `${label}.state`, errors);
  const directionalBias = enumOne(
    row.directionalBias,
    MTAE_VOLUME_DIRECTIONAL_BIASES,
    `${label}.directionalBias`,
    errors
  );
  const priceVolumeRelationship = enumOne(
    row.priceVolumeRelationship,
    MTAE_PRICE_VOLUME_RELATIONSHIPS,
    `${label}.priceVolumeRelationship`,
    errors
  );
  const relativeVolume = enumOne(
    row.relativeVolume,
    MTAE_RELATIVE_VOLUMES,
    `${label}.relativeVolume`,
    errors
  );
  const interpretation = String(row.interpretation ?? "").trim();
  if (!interpretation) errors.push(`${label}.interpretation required`);
  if (!state || !directionalBias || !priceVolumeRelationship || !relativeVolume || !interpretation) {
    return undefined;
  }
  return {
    state: state as MtaeVolumeState,
    directionalBias: directionalBias as MtaeVolumeDirectionalBias,
    priceVolumeRelationship: priceVolumeRelationship as MtaePriceVolumeRelationship,
    relativeVolume: relativeVolume as MtaeRelativeVolume,
    interpretation,
    confidence: clampConfidence(Number(row.confidence ?? 50)),
  };
}

function parseWickAnalysis(
  raw: unknown,
  label: string,
  errors: string[]
): MtaeWickAnalysis | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push(`${label} must be an object`);
    return undefined;
  }
  const row = raw as Record<string, unknown>;
  const netMessage = enumOne(row.netMessage, MTAE_WICK_NET_MESSAGES, `${label}.netMessage`, errors);
  if (!netMessage) return undefined;
  return {
    upperRejections: parseWickList(row.upperRejections, `${label}.upperRejections`, errors),
    lowerRejections: parseWickList(row.lowerRejections, `${label}.lowerRejections`, errors),
    liquiditySweeps: parseWickList(row.liquiditySweeps, `${label}.liquiditySweeps`, errors),
    netMessage: netMessage as MtaeWickNetMessage,
  };
}

function parseCandleSignals(
  raw: unknown,
  label: string,
  errors: string[]
): MtaeCandleSignal[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) {
    errors.push(`${label} must be an array`);
    return undefined;
  }
  const out: MtaeCandleSignal[] = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`${label}[${i}] must be an object`);
      return;
    }
    const row = item as Record<string, unknown>;
    const pattern = enumOne(row.pattern, MTAE_CANDLE_PATTERNS, `${label}[${i}].pattern`, errors);
    const confirmation = enumOne(
      row.confirmation,
      MTAE_CANDLE_CONFIRMATIONS,
      `${label}[${i}].confirmation`,
      errors
    );
    const location = String(row.location ?? "").trim();
    const context = String(row.context ?? "").trim();
    const symbolicMeaning = String(row.symbolicMeaning ?? "").trim();
    if (!location) errors.push(`${label}[${i}].location required`);
    if (!context) errors.push(`${label}[${i}].context required`);
    if (!symbolicMeaning) errors.push(`${label}[${i}].symbolicMeaning required`);
    if (!pattern || !confirmation || !location || !context || !symbolicMeaning) return;
    out.push({
      pattern: pattern as MtaeCandlePattern,
      location,
      context,
      confirmation: confirmation as MtaeCandleConfirmation,
      symbolicMeaning,
      confidence: clampConfidence(Number(row.confidence ?? 50)),
    });
  });
  return out;
}

function parseMovementCharacter(
  raw: unknown,
  label: string,
  errors: string[]
): MtaeMovementCharacter | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push(`${label} must be an object`);
    return undefined;
  }
  const row = raw as Record<string, unknown>;
  const primary = enumOne(row.primary, MTAE_MOVEMENT_CHARACTERS, `${label}.primary`, errors);
  if (!primary) return undefined;
  let secondary: MtaeMovementCharacterLabel[] | undefined;
  if (row.secondary !== undefined) {
    if (!Array.isArray(row.secondary)) {
      errors.push(`${label}.secondary must be an array`);
    } else {
      secondary = [];
      row.secondary.forEach((item, i) => {
        const v = enumOne(item, MTAE_MOVEMENT_CHARACTERS, `${label}.secondary[${i}]`, errors);
        if (v) secondary!.push(v as MtaeMovementCharacterLabel);
      });
    }
  }
  const evidence = stringList(row.evidence, `${label}.evidence`, errors);
  if (!evidence.length) errors.push(`${label}.evidence must be a non-empty array`);
  if (!evidence.length) return undefined;
  return {
    primary: primary as MtaeMovementCharacterLabel,
    secondary,
    evidence,
    confidence: clampConfidence(Number(row.confidence ?? 50)),
    caveat: row.caveat !== undefined ? String(row.caveat).trim() || undefined : undefined,
  };
}

function parseHistoricalReactionZones(
  raw: unknown,
  label: string,
  errors: string[]
): MtaeHistoricalReactionZone[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) {
    errors.push(`${label} must be an array`);
    return undefined;
  }
  const out: MtaeHistoricalReactionZone[] = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`${label}[${i}] must be an object`);
      return;
    }
    const row = item as Record<string, unknown>;
    const zone = parseZone(row.zone, `${label}[${i}].zone`, errors);
    const reactionCount = Number(row.reactionCount);
    const interpretation = String(row.interpretation ?? "").trim();
    if (!zone) return;
    if (!Number.isFinite(reactionCount) || reactionCount < 1) {
      errors.push(`${label}[${i}].reactionCount must be >= 1`);
      return;
    }
    if (!interpretation) {
      errors.push(`${label}[${i}].interpretation required`);
      return;
    }
    out.push({
      zone,
      reactionCount: Math.round(reactionCount),
      successfulDefenses:
        row.successfulDefenses !== undefined && Number.isFinite(Number(row.successfulDefenses))
          ? Math.round(Number(row.successfulDefenses))
          : undefined,
      averageReactionPercent:
        row.averageReactionPercent !== undefined &&
        Number.isFinite(Number(row.averageReactionPercent))
          ? Number(row.averageReactionPercent)
          : undefined,
      volumeCharacter:
        row.volumeCharacter !== undefined
          ? String(row.volumeCharacter).trim() || undefined
          : undefined,
      confidence: clampConfidence(Number(row.confidence ?? 50)),
      interpretation,
    });
  });
  return out;
}

function parseLargeParticipantFootprint(
  raw: unknown,
  label: string,
  errors: string[]
): MtaeLargeParticipantFootprint | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push(`${label} must be an object`);
    return undefined;
  }
  const row = raw as Record<string, unknown>;
  // Hard ban identity claims
  if (row.whalesAreBuying !== undefined || row.whalesBuying !== undefined) {
    errors.push(
      `${label} must not claim whalesAreBuying — use signal possible_accumulation|… only`
    );
  }
  const signal = enumOne(row.signal, MTAE_PARTICIPANT_SIGNALS, `${label}.signal`, errors);
  const evidence = stringList(row.evidence, `${label}.evidence`, errors);
  if (!signal) return undefined;
  if (!evidence.length) {
    errors.push(`${label}.evidence must be a non-empty array`);
    return undefined;
  }
  return {
    signal: signal as MtaeParticipantSignal,
    evidence,
    confidence: clampConfidence(Number(row.confidence ?? 50)),
  };
}

function parseParticipation(
  raw: unknown,
  label: string,
  errors: string[]
): MtaeParticipation | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push(`${label} must be an object`);
    return undefined;
  }
  const row = raw as Record<string, unknown>;
  const participation: MtaeParticipation = {
    volumeBehavior: parseVolumeBehavior(row.volumeBehavior, `${label}.volumeBehavior`, errors),
    wickAnalysis: parseWickAnalysis(row.wickAnalysis, `${label}.wickAnalysis`, errors),
    candleSignals: parseCandleSignals(row.candleSignals, `${label}.candleSignals`, errors),
    movementCharacter: parseMovementCharacter(
      row.movementCharacter,
      `${label}.movementCharacter`,
      errors
    ),
    historicalReactionZones: parseHistoricalReactionZones(
      row.historicalReactionZones,
      `${label}.historicalReactionZones`,
      errors
    ),
    largeParticipantFootprint: parseLargeParticipantFootprint(
      row.largeParticipantFootprint,
      `${label}.largeParticipantFootprint`,
      errors
    ),
  };
  const hasAny = Object.values(participation).some((v) => v !== undefined);
  return hasAny ? participation : undefined;
}

function parseParticipationSynthesis(
  raw: unknown,
  label: string,
  errors: string[]
): MtaeParticipationSynthesis | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push(`${label} must be an object`);
    return undefined;
  }
  const row = raw as Record<string, unknown>;
  const dominantCondition = enumOne(
    row.dominantCondition,
    MTAE_DOMINANT_CONDITIONS,
    `${label}.dominantCondition`,
    errors
  );
  if (!dominantCondition) return undefined;
  return {
    dominantCondition: dominantCondition as MtaeDominantCondition,
    buyingEvidence: stringList(row.buyingEvidence, `${label}.buyingEvidence`, errors),
    sellingEvidence: stringList(row.sellingEvidence, `${label}.sellingEvidence`, errors),
    unresolvedSignals: stringList(row.unresolvedSignals, `${label}.unresolvedSignals`, errors),
    confidence: clampConfidence(Number(row.confidence ?? 50)),
  };
}

function parsePerTimeframe(raw: unknown, errors: string[]): MtaeTimeframeReport[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push("perTimeframe must be a non-empty array");
    return [];
  }
  const out: MtaeTimeframeReport[] = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`perTimeframe[${i}] must be an object`);
      return;
    }
    const row = item as Record<string, unknown>;
    const timeframe = String(row.timeframe ?? "").trim();
    if (!timeframe) {
      errors.push(`perTimeframe[${i}].timeframe required`);
      return;
    }
    const trend = parseTrend(row.trend, `perTimeframe[${i}].trend`, errors);
    if (!trend) return;
    const structuralInvalidation = String(row.structuralInvalidation ?? "").trim();
    const summary = String(row.summary ?? "").trim();
    if (!structuralInvalidation) {
      errors.push(`perTimeframe[${i}].structuralInvalidation required`);
      return;
    }
    if (!summary) {
      errors.push(`perTimeframe[${i}].summary required`);
      return;
    }
    const structureRaw =
      row.structure && typeof row.structure === "object" && !Array.isArray(row.structure)
        ? (row.structure as Record<string, unknown>)
        : {};
    const contradictions = Array.isArray(row.contradictions)
      ? row.contradictions.map((c) => String(c).trim()).filter(Boolean)
      : [];

    const report: MtaeTimeframeReport = {
      timeframe,
      trend,
      trendConfidence: clampConfidence(Number(row.trendConfidence ?? row.confidence ?? 50)),
      structure: {
        higherHighs: typeof structureRaw.higherHighs === "boolean" ? structureRaw.higherHighs : undefined,
        higherLows: typeof structureRaw.higherLows === "boolean" ? structureRaw.higherLows : undefined,
        channel: typeof structureRaw.channel === "boolean" ? structureRaw.channel : undefined,
        range: typeof structureRaw.range === "boolean" ? structureRaw.range : undefined,
        distribution:
          typeof structureRaw.distribution === "boolean" ? structureRaw.distribution : undefined,
        compression:
          typeof structureRaw.compression === "boolean" ? structureRaw.compression : undefined,
        broken: typeof structureRaw.broken === "boolean" ? structureRaw.broken : undefined,
        note: structureRaw.note !== undefined ? String(structureRaw.note) : undefined,
      },
      supports: parseRankedLevels(row.supports ?? [], `perTimeframe[${i}].supports`, errors),
      resistances: parseRankedLevels(row.resistances ?? [], `perTimeframe[${i}].resistances`, errors),
      battleZones: parseBattleZones(row.battleZones ?? [], `perTimeframe[${i}].battleZones`, errors),
      structuralInvalidation,
      contradictions,
      summary,
    };
    if (row.probableTarget !== undefined && Number.isFinite(Number(row.probableTarget))) {
      report.probableTarget = Number(row.probableTarget);
    }
    if (row.extendedTarget !== undefined && Number.isFinite(Number(row.extendedTarget))) {
      report.extendedTarget = Number(row.extendedTarget);
    }
    if (
      report.probableTarget !== undefined &&
      report.extendedTarget !== undefined &&
      report.probableTarget === report.extendedTarget
    ) {
      errors.push(
        `perTimeframe[${i}]: probableTarget and extendedTarget must not be the same price`
      );
    }
    const participation = parseParticipation(
      row.participation,
      `perTimeframe[${i}].participation`,
      errors
    );
    if (participation) report.participation = participation;
    out.push(report);
  });
  return out;
}

function parseIntegrated(raw: unknown, errors: string[]): MtaeIntegratedView | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push("integrated must be an object");
    return null;
  }
  const row = raw as Record<string, unknown>;
  const structureSpine = String(row.structureSpine ?? "").trim();
  const opportunityNote = String(row.opportunityNote ?? "").trim();
  const executionContext = String(row.executionContext ?? "").trim();
  if (!structureSpine || !opportunityNote || !executionContext) {
    errors.push("integrated requires structureSpine, opportunityNote, executionContext");
    return null;
  }
  return {
    structureSpine,
    opportunityNote,
    executionContext,
    battleZoneRanking: parseBattleZones(
      row.battleZoneRanking ?? [],
      "integrated.battleZoneRanking",
      errors
    ),
    contradictions: Array.isArray(row.contradictions)
      ? row.contradictions.map((c) => String(c).trim()).filter(Boolean)
      : [],
    participationSynthesis: parseParticipationSynthesis(
      row.participationSynthesis,
      "integrated.participationSynthesis",
      errors
    ),
  };
}

function parseTechnicalSummary(raw: unknown, errors: string[]): MtaeTechnicalSummary | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push("technicalSummary must be an object");
    return null;
  }
  const row = raw as Record<string, unknown>;
  const trend = parseTrend(row.trend, "technicalSummary.trend", errors);
  const structureNote = String(row.structureNote ?? "").trim();
  const structuralInvalidation = String(row.structuralInvalidation ?? "").trim();
  if (!trend || !structureNote || !structuralInvalidation) {
    errors.push(
      "technicalSummary requires trend, structureNote, structuralInvalidation"
    );
    return null;
  }

  // Forbidden Matrix decision fields in MTAE summary
  for (const banned of [
    "maximumEntry",
    "recommendedEntry",
    "plannedEntry",
    "minimumRR",
    "riskReward",
    "rr",
    "shares",
    "positionSize",
    "scoutVerdict",
    "verdict",
    "whalesAreBuying",
    "whalesBuying",
  ]) {
    if (row[banned] !== undefined) {
      errors.push(
        `technicalSummary must not include ${banned} — MTAE is technical only (Scout owns capital)`
      );
    }
  }

  const probableTarget =
    row.probableTarget !== undefined && Number.isFinite(Number(row.probableTarget))
      ? Number(row.probableTarget)
      : undefined;
  const extendedTarget =
    row.extendedTarget !== undefined && Number.isFinite(Number(row.extendedTarget))
      ? Number(row.extendedTarget)
      : undefined;
  if (
    probableTarget !== undefined &&
    extendedTarget !== undefined &&
    probableTarget === extendedTarget
  ) {
    errors.push("technicalSummary: probableTarget and extendedTarget must differ");
  }

  return {
    trend,
    structureNote,
    majorSupport:
      row.majorSupport !== undefined && Number.isFinite(Number(row.majorSupport))
        ? Number(row.majorSupport)
        : undefined,
    majorResistance:
      row.majorResistance !== undefined && Number.isFinite(Number(row.majorResistance))
        ? Number(row.majorResistance)
        : undefined,
    primaryBattleZone: parseZone(row.primaryBattleZone, "technicalSummary.primaryBattleZone", errors),
    secondaryBattleZone: parseZone(
      row.secondaryBattleZone,
      "technicalSummary.secondaryBattleZone",
      errors
    ),
    probableTarget,
    extendedTarget,
    structuralInvalidation,
    contradictions: Array.isArray(row.contradictions)
      ? row.contradictions.map((c) => String(c).trim()).filter(Boolean)
      : [],
    confidence: clampConfidence(Number(row.confidence ?? 50)),
  };
}

export type ParsedMtaeAssessmentProposal = {
  stockProfileId: string;
  ticker: string;
  asOfPrice?: number;
  timeframeMapId?: string;
  timeframeRoles: MtaeTimeframeRoles;
  perTimeframe: MtaeTimeframeReport[];
  integrated: MtaeIntegratedView;
  technicalSummary: MtaeTechnicalSummary;
  patchStockFile: boolean;
};

export function validateTechnicalAssessmentProposal(
  proposal: Record<string, unknown>
): { ok: true; value: ParsedMtaeAssessmentProposal } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const stockProfileId = String(proposal.stockProfileId ?? proposal.id ?? "")
    .trim()
    .toUpperCase();
  const ticker = String(proposal.ticker ?? "")
    .trim()
    .toUpperCase();
  if (!stockProfileId) errors.push("proposal.stockProfileId required");
  if (!ticker) errors.push("proposal.ticker required");

  const timeframeRoles = parseTimeframeRoles(proposal.timeframeRoles, errors);
  const perTimeframe = parsePerTimeframe(proposal.perTimeframe, errors);
  const integrated = parseIntegrated(proposal.integrated, errors);
  const technicalSummary = parseTechnicalSummary(proposal.technicalSummary, errors);

  if (errors.length || !timeframeRoles || !integrated || !technicalSummary) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      stockProfileId,
      ticker,
      asOfPrice:
        proposal.asOfPrice !== undefined && Number.isFinite(Number(proposal.asOfPrice))
          ? Number(proposal.asOfPrice)
          : undefined,
      timeframeMapId:
        proposal.timeframeMapId !== undefined
          ? String(proposal.timeframeMapId).trim() || undefined
          : undefined,
      timeframeRoles,
      perTimeframe,
      integrated,
      technicalSummary,
      patchStockFile: proposal.patchStockFile === false ? false : true,
    },
  };
}

export type ParsedMtaeCalibrationProposal = {
  assessmentId: string;
  stockProfileId: string;
  ticker: string;
  errorType: MtaeCalibrationErrorType;
  fieldPath: string;
  aiValue: unknown;
  humanValue: unknown;
  magnitude?: string;
  confidenceAdjustment?: number;
  reason: string;
};

export function validateTechnicalCalibrationProposal(
  proposal: Record<string, unknown>
): { ok: true; value: ParsedMtaeCalibrationProposal } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const assessmentId = String(proposal.assessmentId ?? "").trim().toUpperCase();
  const stockProfileId = String(proposal.stockProfileId ?? "").trim().toUpperCase();
  const ticker = String(proposal.ticker ?? "").trim().toUpperCase();
  const errorType = String(proposal.errorType ?? "").trim() as MtaeCalibrationErrorType;
  const fieldPath = String(proposal.fieldPath ?? "").trim();
  const reason = String(proposal.reason ?? "").trim();

  if (!assessmentId) errors.push("proposal.assessmentId required");
  if (!stockProfileId) errors.push("proposal.stockProfileId required");
  if (!ticker) errors.push("proposal.ticker required");
  if (!ERROR_TYPES.includes(errorType)) {
    errors.push(`proposal.errorType must be one of: ${ERROR_TYPES.join(", ")}`);
  }
  if (!fieldPath) errors.push("proposal.fieldPath required");
  if (proposal.aiValue === undefined) errors.push("proposal.aiValue required");
  if (proposal.humanValue === undefined) errors.push("proposal.humanValue required");
  if (!reason) errors.push("proposal.reason required");

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      assessmentId,
      stockProfileId,
      ticker,
      errorType,
      fieldPath,
      aiValue: proposal.aiValue,
      humanValue: proposal.humanValue,
      magnitude:
        proposal.magnitude !== undefined ? String(proposal.magnitude).trim() || undefined : undefined,
      confidenceAdjustment:
        proposal.confidenceAdjustment !== undefined &&
        Number.isFinite(Number(proposal.confidenceAdjustment))
          ? Number(proposal.confidenceAdjustment)
          : undefined,
      reason,
    },
  };
}
