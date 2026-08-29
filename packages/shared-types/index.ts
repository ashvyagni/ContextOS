export interface GraphNode {
  id: string;
  type: string;
  label: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  metadata: Record<string, unknown>;
}

export interface AnalysisRun {
  id: string;
  projectId: string;
  startedAt: string;
  completedAt: string | null;
  status: "pending" | "running" | "completed" | "failed";
  nodeCount: number;
  edgeCount: number;
}

export interface Behavior {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  actions: string[];
  edges: string[];
}

export interface ChangeSet {
  id: string;
  description: string;
  files: string[];
  behaviors: string[];
  createdAt: string;
}

export interface ImpactReport {
  id: string;
  changeSetId: string;
  affectedBehaviors: string[];
  affectedNodes: string[];
  riskLevel: "low" | "medium" | "high";
  summary: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  steps: ScenarioStep[];
}

export interface ScenarioStep {
  order: number;
  action: string;
  expected: string;
}

export interface ScenarioResult {
  id: string;
  scenarioId: string;
  runAt: string;
  passed: boolean;
  steps: ScenarioStepResult[];
}

export interface ScenarioStepResult {
  order: number;
  passed: boolean;
  actual: string;
  error: string | null;
}

export interface CapabilityCandidate {
  id: string;
  name: string;
  description: string;
  confidence: number;
  supportingNodes: string[];
}

export interface Evidence {
  id: string;
  nodeId: string;
  type: string;
  content: string;
  source: string;
}

export interface DemoScript {
  id: string;
  name: string;
  steps: GoldenPathStep[];
}

export interface GoldenPathStep {
  order: number;
  action: string;
  narrative: string;
  visual: string;
}

export interface AIFallbackResponse {
  suggestion: string;
  confidence: number;
  reasoning: string;
  alternatives: string[];
}
