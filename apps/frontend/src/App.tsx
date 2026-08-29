import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  type OnNodesChange,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Code2,
  Database,
  FileCode2,
  GitBranch,
  Layers3,
  ListFilter,
  PanelRight,
  RotateCcw,
  Search,
  Server,
  ShieldCheck,
  Split,
  Zap,
  Box,
  Command,
  Bell,
  ArrowRight,
} from "lucide-react";

// ============================================================
// API types (mirror of backend/shared-types contract)
// ============================================================

type ApiGraphNode = {
  id: string;
  type: string;
  name: string;
  file: string;
  lineStart: number;
  lineEnd: number;
  language: string;
  behaviorId?: string;
  analysisRunId: string;
  metadata: Record<string, unknown>;
};

type ApiGraphEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
  confidence: number;
  analysisRunId: string;
  sourceRef: string;
  metadata: Record<string, unknown>;
};

type Behavior = {
  id: string;
  name: string;
  category: string;
  entrypoints: string[];
  projectId: string;
};

type AnalysisRun = {
  id: string;
  projectId: string;
  createdAt: string;
  status: string;
  parentRunId?: string;
};

type GraphData = {
  runId: string;
  nodes: ApiGraphNode[];
  edges: ApiGraphEdge[];
  behaviors: Behavior[];
};

type NodeSource = {
  id: string;
  file: string;
  lineStart: number;
  lineEnd: number;
  snippet?: string | null;
  error?: string;
};

// ============================================================
// Node kind mapping (spec types -> visual kinds)
// ============================================================

type NodeKind = "ui" | "handler" | "api" | "logic" | "data" | "test" | "behavior" | "external";

const NODE_KIND_MAP: Record<string, NodeKind> = {
  component: "ui",
  route: "api",
  handler: "handler",
  function: "logic",
  service: "logic",
  data: "data",
  behavior: "behavior",
  scenario: "test",
  external: "external",
};

const NODE_COLORS: Record<NodeKind, { fill: string; stroke: string; icon: ReactNode }> = {
  ui: { fill: "#122b38", stroke: "#35d0dc", icon: <Box size={14} /> },
  handler: { fill: "#172a3d", stroke: "#59a9e8", icon: <Command size={14} /> },
  api: { fill: "#182d3c", stroke: "#51bfd4", icon: <Server size={14} /> },
  logic: { fill: "#292a35", stroke: "#ac9ed0", icon: <Split size={14} /> },
  data: { fill: "#26313b", stroke: "#879bac", icon: <Database size={14} /> },
  test: { fill: "#252a32", stroke: "#f0ae4e", icon: <ShieldCheck size={14} /> },
  behavior: { fill: "#1a2a1a", stroke: "#4fd08b", icon: <Activity size={14} /> },
  external: { fill: "#1a1a2a", stroke: "#607589", icon: <CircleDot size={14} /> },
};

// ============================================================
// Custom React Flow node component
// ============================================================

function ContextOSNode({ data }: { data: { label: string; kind: NodeKind; detail: string; isSelected: boolean } }) {
  const palette = NODE_COLORS[data.kind];
  return (
    <div
      className={`rounded-md border px-3 py-2 min-w-[140px] cursor-pointer transition-all ${
        data.isSelected ? "ring-2 ring-[#35d0dc] ring-opacity-50" : ""
      }`}
      style={{
        backgroundColor: palette.fill,
        borderColor: palette.stroke,
        borderWidth: data.isSelected ? 2 : 1,
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: palette.stroke }}>{palette.icon}</span>
        <span className="text-[12px] font-semibold text-[#d9e6ef] font-['DM_Sans']">{data.label}</span>
      </div>
      <div className="mt-1 text-[9.5px] text-[#7892a8] font-['IBM_Plex_Mono']">{data.detail}</div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  contextOS: ContextOSNode,
};

// ============================================================
// API hooks
// ============================================================

const API_BASE = "";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function useProjects() {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    fetchJson<{ id: string; name: string }[]>("/projects")
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);
  return projects;
}

function useGraph(projectId: string | null) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (runId?: string) => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const params = runId ? `?runId=${runId}` : "";
      const result = await fetchJson<GraphData>(`/projects/${projectId}/graph${params}`);
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) load();
  }, [projectId, load]);

  return { data, loading, error, reload: load };
}

function useRuns(projectId: string | null) {
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  useEffect(() => {
    if (!projectId) return;
    fetchJson<AnalysisRun[]>(`/projects/${projectId}/runs`)
      .then(setRuns)
      .catch(() => setRuns([]));
  }, [projectId]);
  return runs;
}

function useNodeSource(nodeId: string | null) {
  const [source, setSource] = useState<NodeSource | null>(null);
  useEffect(() => {
    if (!nodeId) { setSource(null); return; }
    fetchJson<NodeSource>(`/nodes/${nodeId}/source`)
      .then(setSource)
      .catch(() => setSource(null));
  }, [nodeId]);
  return source;
}

// ============================================================
// Layout helpers
// ============================================================

const NODE_KIND_ORDER = ["behavior", "ui", "handler", "api", "logic", "data", "test", "external"];

function layoutNodes(graphNodes: ApiGraphNode[], graphEdges: ApiGraphEdge[]): { nodes: Node[]; edges: Edge[] } {
  // Group by kind for layered layout
  const byKind = new Map<string, ApiGraphNode[]>();
  for (const gn of graphNodes) {
    const kind = NODE_KIND_MAP[gn.type] || "external";
    if (!byKind.has(kind)) byKind.set(kind, []);
    byKind.get(kind)!.push(gn);
  }

  const X_GAP = 220;
  const Y_GAP = 80;
  const START_X = 50;
  const START_Y = 50;

  const rfNodes: Node[] = [];
  let colIndex = 0;

  for (const kind of NODE_KIND_ORDER) {
    const nodes = byKind.get(kind);
    if (!nodes || nodes.length === 0) continue;
    const x = START_X + colIndex * X_GAP;
    nodes.forEach((gn, rowIndex) => {
      rfNodes.push({
        id: gn.id,
        type: "contextOS",
        position: { x, y: START_Y + rowIndex * Y_GAP },
        data: {
          label: gn.name,
          kind,
          detail: gn.file ? `${gn.file.split("/").pop()}:${gn.lineStart}` : gn.type,
          isSelected: false,
          apiNode: gn,
        },
      });
    });
    colIndex++;
  }

  const nodeIds = new Set(rfNodes.map((n) => n.id));

  const rfEdges: Edge[] = graphEdges
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      animated: e.type === "IMPLEMENTS",
      style: {
        stroke: e.type === "IMPLEMENTS" ? "#4fd08b" : e.type === "ROUTES_TO" ? "#35d0dc" : e.type === "CALLS" ? "#59a9e8" : "#607589",
        strokeWidth: e.type === "IMPLEMENTS" ? 2 : 1.5,
        strokeDasharray: e.confidence < 1 ? "5 5" : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#607589", width: 16, height: 16 },
      label: e.type !== "CALLS" ? e.type.replace("_", " ") : undefined,
      labelStyle: { fontSize: 9, fill: "#7892a8", fontFamily: "IBM Plex Mono" },
    }));

  return { nodes: rfNodes, edges: rfEdges };
}

// ============================================================
// UI Components
// ============================================================

function Topbar({
  projectId,
  setProjectId,
  projects,
  onAnalyze,
  analyzing,
}: {
  projectId: string | null;
  setProjectId: (id: string) => void;
  projects: { id: string; name: string }[];
  onAnalyze: () => void;
  analyzing: boolean;
}) {
  return (
    <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-[#1c2a39] bg-[#0c141f] px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative flex h-7 w-7 items-center justify-center rounded border border-[#2e6872] bg-[#102a35] text-[#35d0dc]">
          <span className="absolute h-3.5 w-px bg-[#35d0dc]" />
          <span className="absolute h-px w-3.5 bg-[#35d0dc]" />
          <CircleDot size={9} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[14px] font-semibold tracking-tight text-[#e5eff4]">ContextOS</span>
          <span className="hidden text-[10px] text-[#5f768c] font-['IBM_Plex_Mono'] sm:inline">
            behavior instrumentation
          </span>
        </div>
        <div className="mx-2 hidden h-5 w-px bg-[#243443] md:block" />
        <label
          className="hidden items-center gap-2 text-[10px] text-[#60798d] font-['IBM_Plex_Mono'] md:flex"
          htmlFor="project-select"
        >
          PROJECT
        </label>
        <div className="relative hidden md:block">
          <select
            id="project-select"
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-7 appearance-none rounded border border-[#263b4d] bg-[#111e2b] py-0 pl-2.5 pr-7 text-[11px] text-[#b8cad6] outline-none focus:border-[#35d0dc]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1.5 text-[#6c8498]" />
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="hidden items-center gap-1.5 text-[10px] text-[#6c8497] font-['IBM_Plex_Mono'] lg:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4fd08b]" /> LIVE
        </div>
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          className="flex items-center gap-2 rounded border border-[#b56f2b] bg-[#3a2819] px-3 py-1.5 text-[10px] font-medium font-['IBM_Plex_Mono'] text-[#f4bd68] transition-colors hover:bg-[#51351e] disabled:opacity-50"
        >
          {analyzing ? <RotateCcw size={13} className="animate-spin" /> : <Zap size={13} />}
          {analyzing ? "Analyzing..." : "Analyze"}
        </button>
      </div>
    </header>
  );
}

function BehaviorRail({
  behaviors,
  selected,
  onSelect,
}: {
  behaviors: Behavior[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="hidden w-[226px] shrink-0 flex-col border-r border-[#1c2a39] bg-[#0b121d] lg:flex">
      <div className="flex h-12 items-center border-b border-[#1c2a39] px-3">
        <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[.16em] text-[#7690a4]">
          Behaviors
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="mb-3 flex items-center justify-between px-2 pt-2 text-[10px] text-[#50677c] font-['IBM_Plex_Mono']">
          <span>BEHAVIORS</span>
          <ListFilter size={12} />
        </div>
        {behaviors.map((b) => {
          const active = selected === b.id;
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b.id)}
              className={`mb-1 flex w-full items-start gap-2.5 rounded border px-2.5 py-2.5 text-left transition-colors ${
                active
                  ? "border-[#265e68] bg-[#102b35]"
                  : "border-transparent hover:border-[#203446] hover:bg-[#111e2b]"
              }`}
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4fd08b]" />
              <span className="min-w-0">
                <span
                  className={`block truncate text-[12px] ${active ? "text-[#e6f3f7]" : "text-[#a8bac8]"}`}
                >
                  {b.name}
                </span>
                <span className="mt-1 block truncate text-[9px] text-[#60778d] font-['IBM_Plex_Mono']">
                  {b.category}
                </span>
              </span>
            </button>
          );
        })}
        <div className="my-4 border-t border-[#1c2a39]" />
        <div className="px-2 text-[10px] uppercase tracking-[.14em] text-[#50677c] font-['IBM_Plex_Mono']">
          Graph layers
        </div>
        <div className="mt-2 space-y-1">
          {["Proven dependencies", "Inferred edges", "Behavior seeds"].map((layer, index) => (
            <div key={layer} className="flex items-center gap-2 px-2 py-1.5 text-[10px] text-[#70879a]">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  index === 0 ? "bg-[#35d0dc]" : index === 1 ? "border border-dashed border-[#879bac]" : "bg-[#4fd08b]"
                }`}
              />
              {layer}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function SourcePanel({ source }: { source: NodeSource | null }) {
  if (!source) {
    return (
      <div className="flex h-full items-center justify-center text-[10px] text-[#587087]">
        Select a node to view source
      </div>
    );
  }

  const lines = source.snippet?.split("\n") || [];
  const fileName = source.file.split("/").pop() || source.file;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[.15em] text-[#607b8d] font-['IBM_Plex_Mono']">
            Implementation node
          </div>
          <div className="mt-1 text-[14px] font-semibold text-[#dce9ef]">{source.id}</div>
        </div>
        <FileCode2 size={16} className="text-[#7692a5]" />
      </div>
      <div className="rounded border border-[#263b4b] bg-[#0a111a] p-3">
        <div className="mb-2 flex items-center justify-between border-b border-[#1c2a39] pb-2">
          <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#8ba3b4]">{source.file}</span>
          <Code2 size={13} className="text-[#5e788e]" />
        </div>
        {lines.length > 0 ? (
          <div className="space-y-1 font-['IBM_Plex_Mono'] text-[10px] leading-[1.55]">
            {lines.map((line, i) => (
              <div key={i}>
                <span className="mr-3 text-[#43596d]">
                  {String(source.lineStart + i).padStart(2, "0")}
                </span>
                <span className="text-[#9b7cc3]">{line}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[10px] text-[#587087]">No snippet available</div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded border border-[#203546] bg-[#111e2b] p-2.5">
          <div className="text-[9px] uppercase text-[#5d7489] font-['IBM_Plex_Mono']">File</div>
          <div className="mt-1 font-['IBM_Plex_Mono'] text-[10px] text-[#a9bdca]">{fileName}</div>
        </div>
        <div className="rounded border border-[#203546] bg-[#111e2b] p-2.5">
          <div className="text-[9px] uppercase text-[#5d7489] font-['IBM_Plex_Mono']">Lines</div>
          <div className="mt-1 font-['IBM_Plex_Mono'] text-[10px] text-[#a9bdca]">
            {source.lineStart}-{source.lineEnd}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextDrawer({
  selectedNode,
  source,
  onClose,
}: {
  selectedNode: string | null;
  source: NodeSource | null;
  onClose: () => void;
}) {
  const [view, setView] = useState<"Source" | "Impact" | "Evidence">("Source");

  return (
    <aside className="hidden w-[326px] shrink-0 flex-col border-l border-[#1c2a39] bg-[#0c141f] lg:flex">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#1c2a39] px-4">
        <div className="flex items-center gap-2">
          <PanelRight size={14} className="text-[#35d0dc]" />
          <span className="text-[11px] font-semibold text-[#c9d8e1]">Context</span>
          {selectedNode && (
            <span className="font-['IBM_Plex_Mono'] text-[9px] text-[#587087]">/ {selectedNode}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded p-1.5 text-[#7892a8] hover:bg-[#172533] hover:text-[#dbe7f2]"
        >
          <ChevronRight size={15} />
        </button>
      </div>
      <div className="flex shrink-0 border-b border-[#1c2a39] px-3">
        {(["Source", "Impact", "Evidence"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setView(item)}
            className={`relative px-2.5 py-3 text-[10px] font-['IBM_Plex_Mono'] ${
              view === item ? "text-[#dceef2]" : "text-[#61798d] hover:text-[#b8cad4]"
            }`}
          >
            {item}
            {view === item && <span className="absolute bottom-0 left-2 right-2 h-px bg-[#35d0dc]" />}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {view === "Source" && <SourcePanel source={source} />}
        {view === "Impact" && (
          <div className="text-center text-[10px] text-[#587087] pt-8">
            Impact analysis available in Phase 2
          </div>
        )}
        {view === "Evidence" && (
          <div className="text-center text-[10px] text-[#587087] pt-8">
            Evidence panel available in Phase 3
          </div>
        )}
      </div>
    </aside>
  );
}

// ============================================================
// Main App
// ============================================================

function App() {
  const projects = useProjects();
  const [projectId, setProjectId] = useState<string | null>(null);
  const { data: graphData, loading, error, reload } = useGraph(projectId);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);

  const source = useNodeSource(selectedNodeId);

  // Set default project
  useEffect(() => {
    if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  // Layout graph when data changes
  useEffect(() => {
    if (graphData) {
      const { nodes, edges } = layoutNodes(graphData.nodes, graphData.edges);
      setRfNodes(nodes);
      setRfEdges(edges);
    }
  }, [graphData, setRfNodes, setRfEdges]);

  const handleNodeClick = useCallback(
    (_: any, node: Node) => {
      setSelectedNodeId(node.id);
      setRfNodes((nds) =>
        nds.map((n) => ({ ...n, data: { ...n.data, isSelected: n.id === node.id } }))
      );
    },
    [setRfNodes]
  );

  const handleAnalyze = useCallback(async () => {
    if (!projectId) return;
    setAnalyzing(true);
    try {
      await fetch(`/projects/${projectId}/analyze`, { method: "POST" });
      await reload();
    } catch (e) {
      console.error("Analysis failed:", e);
    } finally {
      setAnalyzing(false);
    }
  }, [projectId, reload]);

  const behaviors = graphData?.behaviors || [];
  const selectedBehavior = behaviors[0]?.id || "";
  const activeBehavior = behaviors.find((b) => b.id === selectedBehavior);

  return (
    <div className="app-shell noise flex min-h-[100dvh] flex-col overflow-hidden bg-[#0a0f18] text-[#dbe7f2]">
      <Topbar
        projectId={projectId}
        setProjectId={setProjectId}
        projects={projects}
        onAnalyze={handleAnalyze}
        analyzing={analyzing}
      />
      <div className="flex min-h-0 flex-1">
        <BehaviorRail behaviors={behaviors} selected={selectedBehavior} onSelect={() => {}} />
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#1c2a39] bg-[#0e1925] px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#587087]">BEHAVIOR</span>
              <ChevronRight size={12} className="text-[#3c566b]" />
              <span className="text-[13px] font-medium text-[#dce9ef]">
                {activeBehavior?.name || "Select a project"}
              </span>
              {activeBehavior && (
                <span className="truncate rounded border border-[#394d5c] bg-[#152331] px-1.5 py-0.5 text-[9px] text-[#7f98a9] font-['IBM_Plex_Mono']">
                  {activeBehavior.category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded border border-[#315a62] bg-[#102832] px-2 py-1 text-[9px] text-[#65cbd0] font-['IBM_Plex_Mono'] sm:inline">
                {graphData?.nodes.length || 0} nodes · {graphData?.edges.length || 0} edges
              </span>
            </div>
          </div>
          <div className="flex min-h-0 flex-1">
            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-[12px] text-[#587087]">Loading graph...</div>
              </div>
            ) : error ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-[12px] text-[#f16b52]">Error: {error}</div>
              </div>
            ) : (
              <div className="flex-1 grid-texture">
                <ReactFlow
                  nodes={rfNodes}
                  edges={rfEdges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={handleNodeClick}
                  nodeTypes={nodeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.3 }}
                  proOptions={{ hideAttribution: true }}
                  defaultEdgeOptions={{
                    type: "smoothstep",
                    markerEnd: { type: MarkerType.ArrowClosed, color: "#607589" },
                  }}
                >
                  <Background color="#9bb9c7" gap={28} size={1} />
                  <Controls
                    showInteractive={false}
                    style={{ background: "#111e2b", borderColor: "#1c2a39" }}
                  />
                </ReactFlow>
              </div>
            )}
          </div>
        </main>
        <ContextDrawer
          selectedNode={selectedNodeId}
          source={source}
          onClose={() => setSelectedNodeId(null)}
        />
      </div>
    </div>
  );
}

// Need useNodesState and useEdgesState from reactflow
import { useNodesState, useEdgesState } from "reactflow";

export default App;
