// ============================================================
// ContextOS Shared Types
// Frozen contract from MASTER_SPEC.md Section 3
// All agents must consume these — no custom graph shapes allowed.
// ============================================================

// --- Enums / Literal Union Types ---

export const GraphNodeTypes = [
  "behavior",
  "component",
  "handler",
  "route",
  "function",
  "service",
  "data",
  "external",
  "scenario",
] as const;

export type GraphNodeType = (typeof GraphNodeTypes)[number];

export const GraphEdgeTypes = [
  "IMPLEMENTS",
  "TRIGGERS",
  "CALLS",
  "ROUTES_TO",
  "READS",
  "WRITES",
  "DEPENDS_ON",
  "TESTS",
  "AFFECTS",
] as const;

export type GraphEdgeType = (typeof GraphEdgeTypes)[number];

export type AnalysisRunStatus = "pending" | "running" | "completed" | "failed";

export type ScenarioKind = "pytest" | "playwright";

export type ScenarioResultStatus = "pass" | "fail";

export type CapabilityLayer = "UI" | "API" | "Logic" | "Data";

export type CapabilityStatus = "candidate" | "named";

export type EvidenceKind = "regression" | "capability";

// --- Core Graph Types ---

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  name: string;
  file: string;
  lineStart: number;
  lineEnd: number;
  language: string;
  behaviorId?: string;
  analysisRunId: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  confidence: number;
  analysisRunId: string;
  sourceRef: string;
  metadata: Record<string, unknown>;
}

// --- Analysis Run ---

export interface AnalysisRun {
  id: string;
  projectId: string;
  createdAt: string;
  status: AnalysisRunStatus;
  parentRunId?: string;
}

// --- Behavior ---

export interface Behavior {
  id: string;
  name: string;
  category: string;
  entrypoints: string[];
  projectId: string;
}

// --- Change / Impact ---

export interface ChangeSet {
  id: string;
  analysisRunId: string;
  changedFiles: string[];
  addedNodeIds: string[];
  removedNodeIds: string[];
  modifiedNodeIds: string[];
}

export interface ImpactReport {
  id: string;
  changeSetId: string;
  affectedBehaviorIds: string[];
  riskScore: number;
  riskExplanation: string;
  path: GraphEdge[];
}

// --- Scenarios / Evidence ---

export interface Scenario {
  id: string;
  name: string;
  behaviorId: string;
  kind: ScenarioKind;
  entrypoint: string;
  expectedOutcome: string;
}

export interface ScenarioResult {
  id: string;
  scenarioId: string;
  analysisRunId: string;
  status: ScenarioResultStatus;
  durationMs: number;
  stdout: string;
  stderr: string;
  confirmedRegression: boolean;
}

// --- Capability Detection ---

export interface CapabilityCoverage {
  ui: boolean;
  api: boolean;
  logic: boolean;
  data: boolean;
  validation: boolean;
  tests: boolean;
}

export interface CapabilityCandidate {
  id: string;
  analysisRunId: string;
  nodeIds: string[];
  edgeIds: string[];
  layersCovered: CapabilityLayer[];
  isExtensionOfExisting: boolean;
  status: CapabilityStatus;
  coverage: CapabilityCoverage;
}

// --- Evidence ---

export interface Evidence {
  id: string;
  scenarioResultId: string;
  capabilityCandidateId?: string;
  summary: string;
  kind: EvidenceKind;
}

// --- Demo / Presentation ---

export interface GoldenPathStep {
  id: string;
  order: number;
  action: string;
  expectedUIState: string;
  screenshotRef?: string;
}

export interface DemoScript {
  id: string;
  name: string;
  steps: GoldenPathStep[];
}

// --- AI Fallback ---

export interface AIFallbackResponse {
  id: string;
  triggerKey: string;
  cachedName: string;
  cachedSummary: string;
  cachedExplanation: string;
}
