// ============================================================
// Runtime validators for shared types.
// Use these when ingesting data from the backend or persisting.
// ============================================================

import {
  GraphNodeTypes,
  GraphEdgeTypes,
  type GraphNode,
  type GraphEdge,
  type AnalysisRun,
  type Behavior,
  type ChangeSet,
  type ImpactReport,
  type Scenario,
  type ScenarioResult,
  type CapabilityCandidate,
  type CapabilityCoverage,
  type Evidence,
  type DemoScript,
  type GoldenPathStep,
  type AIFallbackResponse,
} from "./types.ts";

// --- Helpers ---

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isArrayOf(v: unknown, check: (x: unknown) => boolean): v is unknown[] {
  return Array.isArray(v) && v.every(check);
}

// --- Graph Node ---

export function isValidGraphNode(v: unknown): v is GraphNode {
  if (!isRecord(v)) return false;
  return (
    isString(v.id) &&
    isString(v.type) &&
    GraphNodeTypes.includes(v.type as GraphNode["type"]) &&
    isString(v.name) &&
    isString(v.file) &&
    isNumber(v.lineStart) &&
    isNumber(v.lineEnd) &&
    isString(v.language) &&
    isString(v.analysisRunId) &&
    isRecord(v.metadata)
  );
}

// --- Graph Edge ---

export function isValidGraphEdge(v: unknown): v is GraphEdge {
  if (!isRecord(v)) return false;
  return (
    isString(v.id) &&
    isString(v.source) &&
    isString(v.target) &&
    isString(v.type) &&
    GraphEdgeTypes.includes(v.type as GraphEdge["type"]) &&
    isNumber(v.confidence) &&
    isString(v.analysisRunId) &&
    isString(v.sourceRef) &&
    isRecord(v.metadata)
  );
}

// --- Analysis Run ---

export function isValidAnalysisRun(v: unknown): v is AnalysisRun {
  if (!isRecord(v)) return false;
  const validStatuses = ["pending", "running", "completed", "failed"];
  return (
    isString(v.id) &&
    isString(v.projectId) &&
    isString(v.createdAt) &&
    isString(v.status) &&
    validStatuses.includes(v.status) &&
    (v.parentRunId === undefined || isString(v.parentRunId))
  );
}

// --- Behavior ---

export function isValidBehavior(v: unknown): v is Behavior {
  if (!isRecord(v)) return false;
  return (
    isString(v.id) &&
    isString(v.name) &&
    isString(v.category) &&
    isArrayOf(v.entrypoints, isString) &&
    isString(v.projectId)
  );
}

// --- ChangeSet ---

export function isValidChangeSet(v: unknown): v is ChangeSet {
  if (!isRecord(v)) return false;
  return (
    isString(v.id) &&
    isString(v.analysisRunId) &&
    isArrayOf(v.changedFiles, isString) &&
    isArrayOf(v.addedNodeIds, isString) &&
    isArrayOf(v.removedNodeIds, isString) &&
    isArrayOf(v.modifiedNodeIds, isString)
  );
}

// --- Impact Report ---

export function isValidImpactReport(v: unknown): v is ImpactReport {
  if (!isRecord(v)) return false;
  return (
    isString(v.id) &&
    isString(v.changeSetId) &&
    isArrayOf(v.affectedBehaviorIds, isString) &&
    isNumber(v.riskScore) &&
    isString(v.riskExplanation) &&
    isArrayOf(v.path, isValidGraphEdge)
  );
}

// --- Scenario ---

export function isValidScenario(v: unknown): v is Scenario {
  if (!isRecord(v)) return false;
  const validKinds = ["pytest", "playwright"];
  return (
    isString(v.id) &&
    isString(v.name) &&
    isString(v.behaviorId) &&
    isString(v.kind) &&
    validKinds.includes(v.kind) &&
    isString(v.entrypoint) &&
    isString(v.expectedOutcome)
  );
}

// --- Scenario Result ---

export function isValidScenarioResult(v: unknown): v is ScenarioResult {
  if (!isRecord(v)) return false;
  const validStatuses = ["pass", "fail"];
  return (
    isString(v.id) &&
    isString(v.scenarioId) &&
    isString(v.analysisRunId) &&
    isString(v.status) &&
    validStatuses.includes(v.status) &&
    isNumber(v.durationMs) &&
    isString(v.stdout) &&
    isString(v.stderr) &&
    typeof v.confirmedRegression === "boolean"
  );
}

// --- Capability Coverage ---

export function isValidCapabilityCoverage(v: unknown): v is CapabilityCoverage {
  if (!isRecord(v)) return false;
  return (
    typeof v.ui === "boolean" &&
    typeof v.api === "boolean" &&
    typeof v.logic === "boolean" &&
    typeof v.data === "boolean" &&
    typeof v.validation === "boolean" &&
    typeof v.tests === "boolean"
  );
}

// --- Capability Candidate ---

export function isValidCapabilityCandidate(v: unknown): v is CapabilityCandidate {
  if (!isRecord(v)) return false;
  const validLayers = ["UI", "API", "Logic", "Data"];
  const validStatuses = ["candidate", "named"];
  return (
    isString(v.id) &&
    isString(v.analysisRunId) &&
    isArrayOf(v.nodeIds, isString) &&
    isArrayOf(v.edgeIds, isString) &&
    isArrayOf(v.layersCovered, (l: unknown) =>
      isString(l) && validLayers.includes(l as string)
    ) &&
    typeof v.isExtensionOfExisting === "boolean" &&
    isString(v.status) &&
    validStatuses.includes(v.status) &&
    isValidCapabilityCoverage(v.coverage)
  );
}

// --- Evidence ---

export function isValidEvidence(v: unknown): v is Evidence {
  if (!isRecord(v)) return false;
  const validKinds = ["regression", "capability"];
  return (
    isString(v.id) &&
    isString(v.scenarioResultId) &&
    (v.capabilityCandidateId === undefined || isString(v.capabilityCandidateId)) &&
    isString(v.summary) &&
    isString(v.kind) &&
    validKinds.includes(v.kind)
  );
}

// --- Golden Path Step ---

export function isValidGoldenPathStep(v: unknown): v is GoldenPathStep {
  if (!isRecord(v)) return false;
  return (
    isString(v.id) &&
    isNumber(v.order) &&
    isString(v.action) &&
    isString(v.expectedUIState) &&
    (v.screenshotRef === undefined || isString(v.screenshotRef))
  );
}

// --- Demo Script ---

export function isValidDemoScript(v: unknown): v is DemoScript {
  if (!isRecord(v)) return false;
  return (
    isString(v.id) &&
    isString(v.name) &&
    isArrayOf(v.steps, isValidGoldenPathStep)
  );
}

// --- AI Fallback Response ---

export function isValidAIFallbackResponse(v: unknown): v is AIFallbackResponse {
  if (!isRecord(v)) return false;
  return (
    isString(v.id) &&
    isString(v.triggerKey) &&
    isString(v.cachedName) &&
    isString(v.cachedSummary) &&
    isString(v.cachedExplanation)
  );
}
