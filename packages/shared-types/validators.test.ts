import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  GraphNodeTypes,
  GraphEdgeTypes,
  isValidGraphNode,
  isValidGraphEdge,
  isValidAnalysisRun,
  isValidBehavior,
  isValidChangeSet,
  isValidImpactReport,
  isValidScenario,
  isValidScenarioResult,
  isValidCapabilityCandidate,
  isValidEvidence,
  isValidDemoScript,
  isValidGoldenPathStep,
  isValidAIFallbackResponse,
} from "./index.ts";

// ============================================================
// Enum completeness (must match MASTER_SPEC.md Section 3)
// ============================================================

describe("Enum arrays match spec", () => {
  it("GraphNodeTypes has exactly 9 values", () => {
    assert.deepEqual(GraphNodeTypes, [
      "behavior",
      "component",
      "handler",
      "route",
      "function",
      "service",
      "data",
      "external",
      "scenario",
    ]);
  });

  it("GraphEdgeTypes has exactly 9 values", () => {
    assert.deepEqual(GraphEdgeTypes, [
      "IMPLEMENTS",
      "TRIGGERS",
      "CALLS",
      "ROUTES_TO",
      "READS",
      "WRITES",
      "DEPENDS_ON",
      "TESTS",
      "AFFECTS",
    ]);
  });
});

// ============================================================
// Minimal valid fixtures
// ============================================================

const validNode = {
  id: "node-1",
  type: "function",
  name: "withdraw",
  file: "backend/app/routes.py",
  lineStart: 42,
  lineEnd: 60,
  language: "python",
  behaviorId: "b-1",
  analysisRunId: "run-1",
  metadata: {},
};

const validEdge = {
  id: "edge-1",
  source: "node-1",
  target: "node-2",
  type: "CALLS",
  confidence: 0.95,
  analysisRunId: "run-1",
  sourceRef: "backend/app/routes.py:50",
  metadata: {},
};

const validRun = {
  id: "run-1",
  projectId: "proj-banking",
  createdAt: "2026-08-29T10:00:00Z",
  status: "completed" as const,
};

const validBehavior = {
  id: "b-1",
  name: "withdraw",
  category: "transaction",
  entrypoints: ["backend/app/routes.py:withdraw"],
  projectId: "proj-banking",
};

const validChangeSet = {
  id: "cs-1",
  analysisRunId: "run-2",
  changedFiles: ["backend/app/services.py"],
  addedNodeIds: [],
  removedNodeIds: [],
  modifiedNodeIds: ["node-3"],
};

const validImpactReport = {
  id: "ir-1",
  changeSetId: "cs-1",
  affectedBehaviorIds: ["b-1"],
  riskScore: 1,
  riskExplanation: "Direct modification to withdraw logic",
  path: [],
};

const validScenario = {
  id: "s-1",
  name: "withdraw_insufficient_balance",
  behaviorId: "b-1",
  kind: "pytest" as const,
  entrypoint: "tests/test_withdraw.py::test_insufficient_balance",
  expectedOutcome: " raises InsufficientFundsError",
};

const validScenarioResult = {
  id: "sr-1",
  scenarioId: "s-1",
  analysisRunId: "run-2",
  status: "pass" as const,
  durationMs: 120,
  stdout: "",
  stderr: "",
  confirmedRegression: false,
};

const validCapabilityCandidate = {
  id: "cc-1",
  analysisRunId: "run-3",
  nodeIds: ["n-10", "n-11", "n-12"],
  edgeIds: ["e-10", "e-11"],
  layersCovered: ["UI", "API", "Logic", "Data"] as const,
  isExtensionOfExisting: false,
  status: "candidate" as const,
  coverage: {
    ui: true,
    api: true,
    logic: true,
    data: false,
    validation: false,
    tests: false,
  },
};

const validEvidence = {
  id: "ev-1",
  scenarioResultId: "sr-1",
  summary: "withdraw_insufficient_balance failed after change",
  kind: "regression" as const,
};

const validGoldenPathStep = {
  id: "gp-1",
  order: 1,
  action: "Open Banking project",
  expectedUIState: "Project selector shows Banking",
};

const validDemoScript = {
  id: "demo-1",
  name: "Killer Demo",
  steps: [validGoldenPathStep],
};

const validAIFallback = {
  id: "ai-1",
  triggerKey: "loan-capability",
  cachedName: "Loan Management",
  cachedSummary: "A new loan origination feature cluster",
  cachedExplanation:
    "Detected a new connected component spanning UI, API, Logic, and Data layers.",
};

// ============================================================
// Validator tests
// ============================================================

describe("isValidGraphNode", () => {
  it("accepts valid node", () => {
    assert.ok(isValidGraphNode(validNode));
  });

  it("rejects node with invalid type", () => {
    assert.ok(!isValidGraphNode({ ...validNode, type: "invalid" }));
  });

  it("rejects node missing analysisRunId", () => {
    const { analysisRunId: _, ...rest } = validNode;
    assert.ok(!isValidGraphNode(rest));
  });

  it("rejects non-object", () => {
    assert.ok(!isValidGraphNode("not an object"));
  });
});

describe("isValidGraphEdge", () => {
  it("accepts valid edge", () => {
    assert.ok(isValidGraphEdge(validEdge));
  });

  it("rejects edge with invalid type", () => {
    assert.ok(!isValidGraphEdge({ ...validEdge, type: "INVALID" }));
  });

  it("rejects edge missing analysisRunId", () => {
    const { analysisRunId: _, ...rest } = validEdge;
    assert.ok(!isValidGraphEdge(rest));
  });

  it("rejects edge with non-numeric confidence", () => {
    assert.ok(!isValidGraphEdge({ ...validEdge, confidence: "high" }));
  });
});

describe("isValidAnalysisRun", () => {
  it("accepts valid run", () => {
    assert.ok(isValidAnalysisRun(validRun));
  });

  it("accepts run with parentRunId", () => {
    assert.ok(isValidAnalysisRun({ ...validRun, parentRunId: "run-0" }));
  });

  it("rejects run with invalid status", () => {
    assert.ok(!isValidAnalysisRun({ ...validRun, status: "unknown" }));
  });
});

describe("isValidBehavior", () => {
  it("accepts valid behavior", () => {
    assert.ok(isValidBehavior(validBehavior));
  });

  it("rejects behavior with non-array entrypoints", () => {
    assert.ok(!isValidBehavior({ ...validBehavior, entrypoints: "single" }));
  });
});

describe("isValidChangeSet", () => {
  it("accepts valid changeSet", () => {
    assert.ok(isValidChangeSet(validChangeSet));
  });

  it("rejects changeSet with missing array field", () => {
    const { addedNodeIds: _, ...rest } = validChangeSet;
    assert.ok(!isValidChangeSet(rest));
  });
});

describe("isValidImpactReport", () => {
  it("accepts valid impactReport", () => {
    assert.ok(isValidImpactReport(validImpactReport));
  });

  it("accepts impactReport with graph edges in path", () => {
    const report = { ...validImpactReport, path: [validEdge] };
    assert.ok(isValidImpactReport(report));
  });

  it("rejects impactReport with invalid edge in path", () => {
    const report = { ...validImpactReport, path: [{ bad: true }] };
    assert.ok(!isValidImpactReport(report));
  });
});

describe("isValidScenario", () => {
  it("accepts valid scenario", () => {
    assert.ok(isValidScenario(validScenario));
  });

  it("accepts playwright scenario", () => {
    assert.ok(isValidScenario({ ...validScenario, kind: "playwright" }));
  });

  it("rejects scenario with invalid kind", () => {
    assert.ok(!isValidScenario({ ...validScenario, kind: "jest" }));
  });
});

describe("isValidScenarioResult", () => {
  it("accepts valid result", () => {
    assert.ok(isValidScenarioResult(validScenarioResult));
  });

  it("accepts failed result with regression", () => {
    const result = {
      ...validScenarioResult,
      status: "fail" as const,
      confirmedRegression: true,
    };
    assert.ok(isValidScenarioResult(result));
  });

  it("rejects result with invalid status", () => {
    assert.ok(!isValidScenarioResult({ ...validScenarioResult, status: "error" }));
  });
});

describe("isValidCapabilityCandidate", () => {
  it("accepts valid candidate", () => {
    assert.ok(isValidCapabilityCandidate(validCapabilityCandidate));
  });

  it("rejects candidate with invalid layer", () => {
    const c = { ...validCapabilityCandidate, layersCovered: ["UI", "Network"] };
    assert.ok(!isValidCapabilityCandidate(c));
  });

  it("rejects candidate with invalid status", () => {
    const c = { ...validCapabilityCandidate, status: "approved" };
    assert.ok(!isValidCapabilityCandidate(c));
  });

  it("rejects candidate with invalid coverage", () => {
    const c = {
      ...validCapabilityCandidate,
      coverage: { ui: true, api: "yes", logic: true, data: false, validation: false, tests: false },
    };
    assert.ok(!isValidCapabilityCandidate(c));
  });
});

describe("isValidEvidence", () => {
  it("accepts valid evidence", () => {
    assert.ok(isValidEvidence(validEvidence));
  });

  it("accepts evidence with capabilityCandidateId", () => {
    assert.ok(isValidEvidence({ ...validEvidence, capabilityCandidateId: "cc-1" }));
  });

  it("rejects evidence with invalid kind", () => {
    assert.ok(!isValidEvidence({ ...validEvidence, kind: "unknown" }));
  });
});

describe("isValidDemoScript", () => {
  it("accepts valid demoScript", () => {
    assert.ok(isValidDemoScript(validDemoScript));
  });

  it("rejects demoScript with invalid step", () => {
    const script = {
      ...validDemoScript,
      steps: [{ id: "x", order: 1, action: "do thing" }],
    };
    assert.ok(!isValidDemoScript(script));
  });
});

describe("isValidGoldenPathStep", () => {
  it("accepts valid step", () => {
    assert.ok(isValidGoldenPathStep(validGoldenPathStep));
  });

  it("accepts step with screenshotRef", () => {
    assert.ok(
      isValidGoldenPathStep({ ...validGoldenPathStep, screenshotRef: "img.png" })
    );
  });

  it("rejects step with non-numeric order", () => {
    assert.ok(!isValidGoldenPathStep({ ...validGoldenPathStep, order: "1" }));
  });
});

describe("isValidAIFallbackResponse", () => {
  it("accepts valid fallback", () => {
    assert.ok(isValidAIFallbackResponse(validAIFallback));
  });

  it("rejects fallback missing field", () => {
    const { cachedExplanation: _, ...rest } = validAIFallback;
    assert.ok(!isValidAIFallbackResponse(rest));
  });
});

// ============================================================
// Cross-model consistency
// ============================================================

describe("Cross-model consistency", () => {
  it("GraphNode analysisRunId is required (not optional in validator)", () => {
    const node = { ...validNode, analysisRunId: undefined };
    assert.ok(!isValidGraphNode(node));
  });

  it("GraphEdge analysisRunId is required (not optional in validator)", () => {
    const edge = { ...validEdge, analysisRunId: undefined };
    assert.ok(!isValidGraphEdge(edge));
  });

  it("ScenarioResult.confirmedRegression is boolean", () => {
    assert.ok(
      isValidScenarioResult({ ...validScenarioResult, confirmedRegression: false })
    );
    assert.ok(
      isValidScenarioResult({ ...validScenarioResult, confirmedRegression: true })
    );
    assert.ok(
      !isValidScenarioResult({ ...validScenarioResult, confirmedRegression: "yes" })
    );
  });

  it("ImpactReport.path contains only GraphEdge objects", () => {
    const report = { ...validImpactReport, path: [validEdge, { not: "an edge" }] };
    assert.ok(!isValidImpactReport(report));
  });
});
