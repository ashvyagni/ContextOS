// ============================================================
// ContextOS Shared Types — Public API
// Import from this file in all agents.
// ============================================================

// Re-export all types
export type {
  GraphNodeType,
  GraphEdgeType,
  AnalysisRunStatus,
  ScenarioKind,
  ScenarioResultStatus,
  CapabilityLayer,
  CapabilityStatus,
  EvidenceKind,
  GraphNode,
  GraphEdge,
  AnalysisRun,
  Behavior,
  ChangeSet,
  ImpactReport,
  Scenario,
  ScenarioResult,
  CapabilityCoverage,
  CapabilityCandidate,
  Evidence,
  GoldenPathStep,
  DemoScript,
  AIFallbackResponse,
} from "./types.ts";

// Re-export enum arrays for runtime checks
export { GraphNodeTypes, GraphEdgeTypes } from "./types.ts";

// Re-export validators
export {
  isValidGraphNode,
  isValidGraphEdge,
  isValidAnalysisRun,
  isValidBehavior,
  isValidChangeSet,
  isValidImpactReport,
  isValidScenario,
  isValidScenarioResult,
  isValidCapabilityCoverage,
  isValidCapabilityCandidate,
  isValidEvidence,
  isValidGoldenPathStep,
  isValidDemoScript,
  isValidAIFallbackResponse,
} from "./validators.ts";
