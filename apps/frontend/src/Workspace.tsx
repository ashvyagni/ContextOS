import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import ReactFlow, {
  Background, Controls, MarkerType, Handle, Position,
  useNodesState, useEdgesState, Panel,
  type Node, type Edge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  Network, Activity, ShieldAlert, Code2, Zap, ChevronDown,
  FolderGit2, Plus, RotateCcw, GitCommit, ChevronRight,
  FileCode2, PanelRightClose, PanelRightOpen, Code,
  Play, CheckCircle, XCircle, AlertTriangle, Shield, Eye,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// API types
// ─────────────────────────────────────────────────────────────

type ApiGraphNode = {
  id: string; type: string; name: string; file: string
  lineStart: number; lineEnd: number; language: string
  behaviorId?: string; analysisRunId: string
  metadata: Record<string, unknown>
}

type ApiGraphEdge = {
  id: string; source: string; target: string; type: string
  confidence: number; analysisRunId: string; sourceRef: string
  metadata: Record<string, unknown>
}

type Behavior = {
  id: string; name: string; category: string
  entrypoints: string[]; projectId: string
}

type GraphData = {
  runId: string; nodes: ApiGraphNode[]; edges: ApiGraphEdge[]; behaviors: Behavior[]
}

type NodeSource = {
  id: string; file: string; lineStart: number; lineEnd: number
  snippet?: string | null; error?: string
}

type ChangeSet = {
  id: string; analysisRunId: string; changedFiles: string[]
  addedNodeIds: string[]; removedNodeIds: string[]; modifiedNodeIds: string[]
  addedEdgeCount: number; removedEdgeCount: number
}

type ImpactReport = {
  id: string; changeSetId: string; affectedBehaviorIds: string[]
  affectedNodeIds: string[]; riskScore: number; riskExplanation: string
  path: ApiGraphEdge[]
}

type ScenarioResult = {
  id: string; scenarioId: string; analysisRunId: string
  status: string; durationMs: number; stdout: string; stderr: string
  confirmedRegression: boolean
}

type Evidence = {
  id: string; scenarioResultId: string; capabilityCandidateId: string | null
  summary: string; kind: string; details: Record<string, unknown>
}

type Explanation = {
  id: string; impactReportId: string; changeSetId: string
  overallConclusion: string
  behaviorExplanations: { behaviorId: string; behaviorName: string; name: string; summary: string; explanation: string }[]
  evidenceSummary: { summary: string; kind: string }[]
}

type Scenario = {
  id: string; name: string; behaviorId: string; kind: string
  entrypoint: string; expectedOutcome: string
}

// ─────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

function useProjects() {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    fetchJson<{ id: string; name: string }[]>('/projects')
      .then(setProjects).catch(() => setProjects([]))
  }, [])
  return projects
}

function useGraph(projectId: string | null) {
  const [data, setData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (runId?: string) => {
    if (!projectId) return
    setLoading(true); setError(null)
    try {
      const params = runId ? `?runId=${runId}` : ''
      const result = await fetchJson<GraphData>(`/projects/${projectId}/graph${params}`)
      setData(result)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { if (projectId) load() }, [projectId, load])
  return { data, loading, error, reload: load }
}

function useNodeSource(nodeId: string | null) {
  const [source, setSource] = useState<NodeSource | null>(null)
  useEffect(() => {
    if (!nodeId) { setSource(null); return }
    fetchJson<NodeSource>(`/nodes/${nodeId}/source`)
      .then(setSource).catch(() => setSource(null))
  }, [nodeId])
  return source
}

function useImpact(projectId: string | null) {
  const [data, setData] = useState<ImpactReport | null>(null)
  const load = useCallback(async () => {
    if (!projectId) return
    try {
      const d = await fetchJson<ImpactReport | null>(`/projects/${projectId}/impact`)
      setData(d && (d as any).id ? d : null)
    } catch { setData(null) }
  }, [projectId])
  useEffect(() => { load() }, [load])
  return { data, reload: load }
}

function useChangeSet(projectId: string | null) {
  const [data, setData] = useState<ChangeSet | null>(null)
  useEffect(() => {
    if (!projectId) return
    fetchJson<ChangeSet | null>(`/projects/${projectId}/changesets`)
      .then(d => setData(d && (d as any).id ? d : null))
      .catch(() => setData(null))
  }, [projectId])
  return data
}

function useExplanation(projectId: string | null) {
  const [data, setData] = useState<Explanation | null>(null)
  const load = useCallback(async () => {
    if (!projectId) return
    try {
      const res = await fetch(`/projects/${projectId}/explain`, { method: 'POST' })
      if (res.ok) {
        const d = await res.json()
        if (d.overallConclusion) setData(d)
      }
    } catch { }
  }, [projectId])
  useEffect(() => { load() }, [load])
  return { data, reload: load }
}

function useScenarios(projectId: string | null) {
  const [data, setData] = useState<Scenario[]>([])
  useEffect(() => {
    if (!projectId) return
    fetchJson<Scenario[]>(`/projects/${projectId}/scenarios`)
      .then(setData).catch(() => setData([]))
  }, [projectId])
  return data
}

function useScenarioResults(projectId: string | null) {
  const [data, setData] = useState<ScenarioResult[]>([])
  const load = useCallback(async () => {
    if (!projectId) return
    fetchJson<ScenarioResult[]>(`/projects/${projectId}/scenario-results`)
      .then(setData).catch(() => setData([]))
  }, [projectId])
  useEffect(() => { load() }, [load])
  return { data, reload: load }
}

function useEvidence(projectId: string | null) {
  const [data, setData] = useState<Evidence[]>([])
  const load = useCallback(async () => {
    if (!projectId) return
    fetchJson<Evidence[]>(`/projects/${projectId}/evidence`)
      .then(setData).catch(() => setData([]))
  }, [projectId])
  useEffect(() => { load() }, [load])
  return { data, reload: load }
}

// ─────────────────────────────────────────────────────────────
// Syntax highlighter (matches original Context-OS-Frontend-main)
// ─────────────────────────────────────────────────────────────

function highlightSyntax(text: string): string {
  let escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped
    .replace(/(['"`])(?:(?=(\\?))\2.)*?\1/g, '<span class="code-string">$&</span>')
    .replace(/\b(def|class|function|const|let|var|if|else|return|import|export|from|public|private|static|new|interface|type|raise|async|await)\b/g,
      '<span class="code-keyword">$1</span>')
    .replace(/([a-zA-Z_$][\w$]*)\s*(?=\()/g, '<span class="code-function">$1</span>')
    .replace(/\b(\d+\.?\d*)\b(?![^<]*>)/g, '<span class="code-number">$&</span>')
    .replace(/(#.*)$/gm, '<span class="code-comment">$1</span>')
    .replace(/(\/\/.*)$/gm, '<span class="code-comment">$1</span>')
}

// ─────────────────────────────────────────────────────────────
// Node colour map  (matches original brutalist palette)
// ─────────────────────────────────────────────────────────────

const NODE_BG: Record<string, string> = {
  behavior:  'bg-[#a5f3fc]',
  component: 'bg-[#a5f3fc]',
  handler:   'bg-[#fca5a5]',
  route:     'bg-[#d8b4fe]',
  function:  'bg-[#fca5a5]',
  service:   'bg-[#fca5a5]',
  data:      'bg-[#d9f99d]',
  scenario:  'bg-[#fde047]',
  external:  'bg-zinc-600',
}

const NODE_ROLE: Record<string, string> = {
  behavior:  'Behavior',
  component: 'Frontend',
  handler:   'Handler',
  route:     'API Route',
  function:  'Logic',
  service:   'Service',
  data:      'Persistence',
  scenario:  'Test',
  external:  'External',
}

const NODE_STROKE: Record<string, string> = {
  behavior:  '#a5f3fc',
  component: '#a5f3fc',
  handler:   '#fca5a5',
  route:     '#d8b4fe',
  function:  '#fca5a5',
  service:   '#fca5a5',
  data:      '#d9f99d',
  scenario:  '#fde047',
  external:  '#71717a',
}

// ─────────────────────────────────────────────────────────────
// Brutalist React Flow node (matches original visual exactly)
// ─────────────────────────────────────────────────────────────

function BrutalistNode({ data, selected }: any) {
  const isImpacted = data.isImpacted
  const isHighlighted = data.isBehaviorHighlighted

  return (
    <div
      className={`px-4 py-3 border-4 min-w-[180px] transition-all
        ${selected ? 'border-white shadow-[0_0_0_2px_white]' : isImpacted ? 'border-[#fca5a5]' : isHighlighted ? 'border-[#a5f3fc]' : 'border-black'}
        ${data.bgColor || 'bg-zinc-700'}
        text-black shadow-[6px_6px_0px_rgba(255,255,255,0.15)]`}
    >
      <Handle type="target" position={Position.Top}
        className="w-4 h-4 bg-black rounded-none border-2 border-white -mt-2" />
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">
          {data.role}
        </span>
        <span className="text-sm font-black tracking-tight leading-tight">
          {data.label}
        </span>
      </div>
      {isImpacted && (
        <div className="mt-1 text-[9px] font-black uppercase tracking-widest text-red-700 flex items-center gap-1">
          <AlertTriangle className="w-2.5 h-2.5" /> IMPACTED
        </div>
      )}
      <Handle type="source" position={Position.Bottom}
        className="w-4 h-4 bg-black rounded-none border-2 border-white -mb-2" />
    </div>
  )
}

const nodeTypes = { brutalist: BrutalistNode }

// ─────────────────────────────────────────────────────────────
// Graph layout
// ─────────────────────────────────────────────────────────────

function layoutGraph(
  apiNodes: ApiGraphNode[],
  apiEdges: ApiGraphEdge[],
  selectedBehavior: string | null,
  impactedNodeIds: Set<string>,
  onExpand: (nodeId: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const ORDER = ['behavior', 'component', 'handler', 'route', 'function', 'service', 'data', 'scenario', 'external']
  const byKind = new Map<string, ApiGraphNode[]>()
  for (const n of apiNodes) {
    const k = ORDER.includes(n.type) ? n.type : 'external'
    if (!byKind.has(k)) byKind.set(k, [])
    byKind.get(k)!.push(n)
  }

  const X_GAP = 240, Y_GAP = 90, START_X = 80, START_Y = 60
  const rfNodes: Node[] = []
  let col = 0
  for (const kind of ORDER) {
    const group = byKind.get(kind)
    if (!group || group.length === 0) continue
    group.forEach((gn, row) => {
      const isImpacted = impactedNodeIds.has(gn.id)
      const isBehaviorHighlighted = selectedBehavior
        ? gn.behaviorId === selectedBehavior || gn.id.includes(`behavior:${selectedBehavior}`)
        : false
      rfNodes.push({
        id: gn.id,
        type: 'brutalist',
        position: { x: START_X + col * X_GAP, y: START_Y + row * Y_GAP },
        data: {
          label: gn.name,
          role: NODE_ROLE[gn.type] || gn.type,
          bgColor: NODE_BG[gn.type] || 'bg-zinc-700',
          apiNode: gn,
          isImpacted,
          isBehaviorHighlighted,
          expandable: false,
          onExpand,
        },
      })
    })
    col++
  }

  const nodeIds = new Set(rfNodes.map(n => n.id))
  const rfEdges: Edge[] = apiEdges
    .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map(e => {
      const srcType = apiNodes.find(n => n.id === e.source)?.type || 'external'
      const stroke = NODE_STROKE[srcType] || '#71717a'
      const isBehaviorEdge = selectedBehavior && (
        apiNodes.find(n => n.id === e.source)?.behaviorId === selectedBehavior ||
        apiNodes.find(n => n.id === e.target)?.behaviorId === selectedBehavior
      )
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'step',
        animated: e.type === 'IMPLEMENTS' || !!isBehaviorEdge,
        style: {
          stroke: isBehaviorEdge ? '#a5f3fc' : stroke,
          strokeWidth: isBehaviorEdge ? 3 : 2,
          strokeDasharray: e.confidence < 1 ? '5 5' : undefined,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: isBehaviorEdge ? '#a5f3fc' : stroke },
      }
    })

  return { nodes: rfNodes, edges: rfEdges }
}

// ─────────────────────────────────────────────────────────────
// Workspace
// ─────────────────────────────────────────────────────────────

export default function Workspace({ username }: { username: string }) {
  // ── project / graph state ──
  const projects = useProjects()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const { data: graphData, loading, error, reload } = useGraph(selectedProjectId || null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<ApiGraphNode | null>(null)
  const [selectedBehavior, setSelectedBehavior] = useState<string | null>(null)

  // ── UI state ──
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'source' | 'impact' | 'capability'>('source')
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isRunningScenarios, setIsRunningScenarios] = useState(false)
  const [watcherActive, setWatcherActive] = useState(false)

  // ── editor code mirror ──
  const [currentCode, setCurrentCode] = useState('')
  const [savedCode, setSavedCode] = useState('')
  const textRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)

  // ── React Flow ──
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([])
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([])

  // ── data hooks ──
  const source = useNodeSource(selectedNodeId)
  const { data: impactData, reload: reloadImpact } = useImpact(selectedProjectId || null)
  const changeSetData = useChangeSet(selectedProjectId || null)
  const { data: explanation, reload: reloadExplanation } = useExplanation(selectedProjectId || null)
  const scenarios = useScenarios(selectedProjectId || null)
  const { data: scenarioResults, reload: reloadScenarioResults } = useScenarioResults(selectedProjectId || null)
  const { data: evidence, reload: reloadEvidence } = useEvidence(selectedProjectId || null)

  // ── auto-select first project ──
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  // ── clear state when project switches ──
  useEffect(() => {
    setSelectedNodeId(null)
    setSelectedNode(null)
    setCurrentCode('')
    setSavedCode('')
    setSelectedBehavior(null)
    setActiveTab('source')
  }, [selectedProjectId])

  // ── sync source → code editor ──
  useEffect(() => {
    if (source?.snippet) {
      setCurrentCode(source.snippet)
      setSavedCode(source.snippet)
    }
  }, [source])

  // ── build React Flow graph ──
  const impactedNodeIds = useMemo(() => new Set(impactData?.affectedNodeIds || []), [impactData])

  const handleExpandNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
  }, [])

  useEffect(() => {
    if (!graphData) { setRfNodes([]); setRfEdges([]); return }
    const { nodes, edges } = layoutGraph(
      graphData.nodes, graphData.edges, selectedBehavior, impactedNodeIds, handleExpandNode
    )
    setRfNodes(nodes)
    setRfEdges(edges)
  }, [graphData, selectedBehavior, impactedNodeIds, setRfNodes, setRfEdges, handleExpandNode])

  // ── editor scroll sync ──
  const handleEditorScroll = () => {
    if (textRef.current && preRef.current) {
      preRef.current.scrollTop = textRef.current.scrollTop
      preRef.current.scrollLeft = textRef.current.scrollLeft
    }
  }

  // ── handlers ──
  const handleNodeClick = useCallback((_: any, node: Node) => {
    const apiNode = node.data.apiNode as ApiGraphNode
    setSelectedNodeId(node.id)
    setSelectedNode(apiNode)
    setActiveTab('source')
    setIsPanelOpen(true)
    setRfNodes(nds => nds.map(n => ({ ...n, selected: n.id === node.id })))
  }, [setRfNodes])

  const handleBehaviorClick = useCallback((behaviorId: string) => {
    setSelectedBehavior(prev => prev === behaviorId ? null : behaviorId)
  }, [])

  const handleAnalyze = useCallback(async () => {
    if (!selectedProjectId) return
    setIsAnalyzing(true)
    try {
      await fetch(`/projects/${selectedProjectId}/analyze`, { method: 'POST' })
      await reload()
      reloadImpact()
      reloadExplanation()
      reloadScenarioResults()
      reloadEvidence()
    } catch (e) { console.error('Analysis failed:', e) }
    finally { setIsAnalyzing(false) }
  }, [selectedProjectId, reload, reloadImpact, reloadExplanation, reloadScenarioResults, reloadEvidence])

  const handleRunScenarios = useCallback(async () => {
    if (!selectedProjectId) return
    setIsRunningScenarios(true)
    try {
      await fetch(`/projects/${selectedProjectId}/scenarios/run-all`, { method: 'POST' })
      reloadScenarioResults()
      reloadEvidence()
      reloadExplanation()
    } catch (e) { console.error('Scenario execution failed:', e) }
    finally { setIsRunningScenarios(false) }
  }, [selectedProjectId, reloadScenarioResults, reloadEvidence, reloadExplanation])

  const handleToggleWatcher = useCallback(async () => {
    if (!selectedProjectId) return
    try {
      if (watcherActive) {
        await fetch(`/watcher/stop/${selectedProjectId}`, { method: 'POST' })
        setWatcherActive(false)
      } else {
        await fetch(`/watcher/start/${selectedProjectId}`, { method: 'POST' })
        setWatcherActive(true)
      }
    } catch (e) { console.error('Watcher toggle failed:', e) }
  }, [selectedProjectId, watcherActive])

  // ── watcher polling ──
  useEffect(() => {
    if (!watcherActive) return
    const interval = setInterval(() => {
      reload()
      reloadImpact()
      reloadExplanation()
      reloadScenarioResults()
      reloadEvidence()
    }, 2000)
    return () => clearInterval(interval)
  }, [watcherActive, reload, reloadImpact, reloadExplanation, reloadScenarioResults, reloadEvidence])

  // ── derived ──
  const nodeCount = graphData?.nodes.length || 0
  const edgeCount = graphData?.edges.length || 0
  const behaviorCount = graphData?.behaviors.length || 0
  const regressionCount = scenarioResults.filter(r => r.confirmedRegression).length
  const currentProjectName = projects.find(p => p.id === selectedProjectId)?.name || selectedProjectId
  const activeFileName = selectedNode ? selectedNode.name : 'Editor'

  const hasImpact = !!(impactData && impactData.id)

  // ── file explorer: derive folder tree from graph nodes ──
  const filePaths = useMemo(() => {
    if (!graphData) return []
    return [...new Set(graphData.nodes.map(n => n.file).filter(Boolean))]
  }, [graphData])

  return (
    <div className="flex flex-col h-screen w-screen bg-[#050505] text-zinc-100 font-sans overflow-hidden selection:bg-[#d9f99d] selection:text-black">

      {/* ── Header ── */}
      <header className="h-16 border-b-2 border-zinc-800 bg-[#0a0a0a] flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-[#a5f3fc] p-1.5 border-2 border-black shadow-[2px_2px_0px_rgba(255,255,255,0.2)]">
              <Network className="w-5 h-5 text-black" />
            </div>
            <span className="font-black text-xl tracking-tighter uppercase text-white">ContextOS</span>
          </div>

          {/* Project selector */}
          <div className="relative">
            <button
              onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-900 transition-colors border-2 border-zinc-800"
            >
              <span className="font-bold text-sm text-zinc-500 uppercase">{username}</span>
              <span className="text-zinc-600 font-black">/</span>
              <span className="font-black text-sm text-[#a5f3fc] uppercase tracking-wide">{currentProjectName}</span>
              <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isProjectMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProjectMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-black border-2 border-zinc-700 shadow-[8px_8px_0px_rgba(255,255,255,0.05)] z-50">
                <div className="px-4 py-3 border-b-2 border-zinc-800 bg-[#0a0a0a]">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Projects</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {projects.map(proj => (
                    <button
                      key={proj.id}
                      onClick={() => { setSelectedProjectId(proj.id); setIsProjectMenuOpen(false) }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-zinc-900 border-b-2 border-zinc-900 last:border-0 transition-colors"
                    >
                      <FolderGit2 className="w-4 h-4 text-zinc-600" />
                      <span className={selectedProjectId === proj.id ? 'text-white font-black uppercase tracking-wide' : 'text-zinc-500 font-bold uppercase tracking-wide'}>
                        {proj.name}
                      </span>
                    </button>
                  ))}
                  {projects.length === 0 && (
                    <div className="px-4 py-3 text-xs text-zinc-600 font-mono">
                      Backend offline — start the API
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest">
          {/* Watch toggle */}
          <button
            onClick={handleToggleWatcher}
            disabled={!selectedProjectId}
            className={`flex items-center gap-2 px-4 py-2 border-2 transition-colors disabled:opacity-30
              ${watcherActive
                ? 'bg-[#d9f99d] text-black border-black'
                : 'bg-black text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}
          >
            <div className={`w-2 h-2 rounded-full ${watcherActive ? 'bg-black animate-pulse' : 'bg-zinc-600'}`} />
            {watcherActive ? 'Watching' : 'Watch'}
          </button>

          {/* Run Tests */}
          <button
            onClick={handleRunScenarios}
            disabled={isRunningScenarios || !selectedProjectId}
            className="flex items-center gap-2 bg-black text-zinc-400 px-4 py-2 border-2 border-zinc-700 hover:border-zinc-500 transition-colors disabled:opacity-30"
          >
            {isRunningScenarios
              ? <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
              : <Play className="w-3 h-3" />}
            {isRunningScenarios ? 'Running...' : 'Run Tests'}
          </button>

          {/* Analyze */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !selectedProjectId}
            className="flex items-center gap-2 bg-[#a5f3fc] text-black px-4 py-2 border-2 border-black shadow-[2px_2px_0px_rgba(255,255,255,0.2)] hover:bg-white transition-colors disabled:opacity-50"
          >
            {isAnalyzing
              ? <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
              : <Activity className="w-4 h-4" />}
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>

          {/* Connection status */}
          <div className="flex items-center gap-2 text-[#d8b4fe] bg-black px-4 py-2 border-2 border-zinc-800">
            <div className="w-2 h-2 rounded-full bg-[#d8b4fe] animate-pulse-dot" />
            <span>{loading ? 'Loading...' : 'Connected'}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Explorer sidebar ── */}
        <aside className="w-64 bg-[#0a0a0a] border-r-2 border-zinc-800 flex flex-col shrink-0 font-mono text-sm z-20 overflow-hidden">
          <div className="p-4 border-b-2 border-zinc-800 flex items-center justify-between text-zinc-500">
            <span className="font-black uppercase tracking-widest text-[10px]">Explorer</span>
            <FolderGit2 className="w-4 h-4" />
          </div>

          <div className="flex-1 overflow-y-auto py-2 scroll-thin">
            {/* workspace tree */}
            <div className="flex items-center gap-1 px-2 py-1 text-zinc-300 cursor-default select-none">
              <ChevronDown className="w-4 h-4 text-zinc-500" />
              <span className="font-bold">workspace</span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1 pl-4 pr-2 py-1 text-[#a5f3fc] bg-zinc-900 border-l-2 border-[#a5f3fc] select-none">
                <ChevronDown className="w-4 h-4" />
                <span className="font-bold">{currentProjectName}</span>
              </div>

              {/* File list from graph */}
              <div className="flex flex-col border-l-2 border-zinc-800 ml-6">
                {filePaths.length === 0 && (
                  <div className="px-4 py-2 text-[10px] text-zinc-600">Run Analyze to load files</div>
                )}
                {filePaths.map(fp => {
                  const fname = fp.split('/').pop() || fp
                  const nodesForFile = graphData?.nodes.filter(n => n.file === fp) || []
                  return (
                    <div
                      key={fp}
                      onClick={() => {
                        const first = nodesForFile[0]
                        if (first) { setSelectedNodeId(first.id); setSelectedNode(first); setActiveTab('source'); setIsPanelOpen(true) }
                      }}
                      className="flex items-center gap-2 pl-4 pr-4 py-1.5 text-zinc-400 hover:bg-zinc-900 cursor-pointer group select-none"
                    >
                      <FileCode2 className="w-4 h-4 shrink-0 text-zinc-600" />
                      <span className="truncate max-w-[140px] text-xs">{fname}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Behaviors */}
            {graphData?.behaviors && graphData.behaviors.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-1 pl-2 py-1 text-[#d8b4fe] select-none">
                  <ChevronDown className="w-4 h-4" />
                  <span className="font-black text-[10px] uppercase tracking-widest">Behaviors</span>
                </div>
                <div className="border-l-2 border-zinc-800 ml-4">
                  {graphData.behaviors.map(b => (
                    <button
                      key={b.id}
                      onClick={() => handleBehaviorClick(b.id)}
                      className={`w-full flex items-center gap-2 pl-4 pr-2 py-1.5 text-left hover:bg-zinc-900 transition-colors
                        ${selectedBehavior === b.id ? 'text-white font-black' : 'text-zinc-500'}`}
                    >
                      <div className={`w-2 h-2 rounded-none shrink-0
                        ${selectedBehavior === b.id ? 'bg-[#a5f3fc]'
                          : impactData?.affectedBehaviorIds.includes(b.id) ? 'bg-[#fca5a5]'
                          : 'bg-zinc-600'}`}
                      />
                      <span className="text-xs uppercase tracking-wide truncate">{b.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Graph stats */}
            <div className="mt-4 px-3 py-3 border-t-2 border-zinc-900">
              <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2">Graph Stats</div>
              <div className="space-y-1 text-[11px] font-mono text-zinc-500">
                <div>Nodes: <span className="text-zinc-300">{nodeCount}</span></div>
                <div>Edges: <span className="text-zinc-300">{edgeCount}</span></div>
                <div>Behaviors: <span className="text-zinc-300">{behaviorCount}</span></div>
                {regressionCount > 0 && (
                  <div className="text-[#fca5a5] font-black">Regressions: {regressionCount}</div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main graph canvas ── */}
        <main className="flex-1 relative bg-[#050505] flex flex-col">
          {/* Graph label */}
          <div className="absolute top-6 left-6 z-10">
            <div className="px-4 py-2 bg-black text-white border-2 border-zinc-700 font-black text-xs tracking-widest uppercase shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
              {selectedBehavior
                ? `Behavior: ${graphData?.behaviors.find(b => b.id === selectedBehavior)?.name || selectedBehavior}`
                : selectedNode
                  ? `Node: ${selectedNode.name}`
                  : `Behavior Graph: ${currentProjectName}`}
            </div>
          </div>

          {/* Panel toggle */}
          <div className="absolute top-6 right-6 z-10">
            <button
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              className="bg-black text-white p-3 border-2 border-zinc-700 hover:bg-zinc-900 transition-colors shadow-[4px_4px_0px_rgba(255,255,255,0.05)] flex items-center gap-2"
            >
              {isPanelOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
              <span className="font-black text-xs tracking-widest uppercase">
                {isPanelOpen ? 'Hide Editor' : 'Show Editor'}
              </span>
            </button>
          </div>

          <div className="flex-1 w-full h-full">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-zinc-500 font-mono text-sm animate-pulse">Analyzing graph...</div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Network className="w-12 h-12 text-zinc-700" />
                <div className="text-zinc-400 font-mono text-sm text-center">
                  {error.includes('404') ? 'No graph data loaded yet.' : error}
                  <br />
                  <span className="text-zinc-600 text-xs font-mono">
                    Click Analyze to generate the behavioral graph.
                  </span>
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="mt-2 bg-[#a5f3fc] text-black px-6 py-2 font-black text-xs border-2 border-black hover:bg-white transition-colors"
                >
                  {isAnalyzing ? 'ANALYZING...' : 'ANALYZE NOW'}
                </button>
              </div>
            ) : rfNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Network className="w-12 h-12 text-zinc-800" />
                <div className="text-zinc-600 font-mono text-sm text-center">
                  No graph data yet.<br />Click <span className="text-[#a5f3fc] font-black">Analyze</span> to generate the behavioral map.
                </div>
              </div>
            ) : (
              <ReactFlow
                nodes={rfNodes} edges={rfEdges}
                onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                nodeTypes={nodeTypes}
                fitView fitViewOptions={{ padding: 0.3 }}
                proOptions={{ hideAttribution: true }}
                className="bg-[#050505]"
              >
                <Background color="#27272a" gap={24} size={2} />
                <Controls className="bg-black border-2 border-zinc-800 rounded-none overflow-hidden" />
              </ReactFlow>
            )}
          </div>
        </main>

        {/* ── Right panel ── */}
        <aside
          className={`bg-[#0a0a0a] border-l-2 border-zinc-800 flex flex-col shrink-0 z-10
            transition-all duration-500 ease-in-out
            ${isPanelOpen ? 'w-[520px] translate-x-0' : 'w-[520px] absolute right-0 translate-x-[100%]'}`}
        >
          {/* Tab switcher — original brutalist style */}
          <div className="flex p-4 gap-3 border-b-2 border-zinc-800 bg-[#050505]">
            <button
              onClick={() => setActiveTab('source')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest border-[3px] transition-all
                ${activeTab === 'source'
                  ? 'bg-[#a5f3fc] text-black border-black shadow-[4px_4px_0px_rgba(255,255,255,0.2)]'
                  : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600'}`}
            >
              <Code2 className="w-4 h-4" /> Source
            </button>
            <button
              onClick={() => setActiveTab('impact')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest border-[3px] transition-all relative
                ${activeTab === 'impact'
                  ? 'bg-[#fca5a5] text-black border-black shadow-[4px_4px_0px_rgba(255,255,255,0.2)]'
                  : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600'}`}
            >
              <ShieldAlert className="w-4 h-4" /> Impact
              {hasImpact && activeTab !== 'impact' && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#fca5a5]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('capability')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest border-[3px] transition-all
                ${activeTab === 'capability'
                  ? 'bg-[#d8b4fe] text-black border-black shadow-[4px_4px_0px_rgba(255,255,255,0.2)]'
                  : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600'}`}
            >
              <Zap className="w-4 h-4" /> Capability
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col bg-[#050505] graph-grid-bg scroll-thin">

            {/* ── SOURCE TAB ── */}
            {activeTab === 'source' && (
              <div className="flex flex-col h-full gap-5">
                {/* Header card */}
                <div className="flex flex-col gap-3 bg-black p-5 border-2 border-zinc-800 shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[10px] font-black text-[#a5f3fc] uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Code className="w-3 h-3" /> Live Editor
                      </h3>
                      <p className="text-xl font-black text-white uppercase tracking-tighter">{activeFileName}</p>
                    </div>
                  </div>
                  <div className="h-[2px] w-full bg-zinc-900" />
                  {source && (
                    <div className="text-[10px] font-mono text-zinc-500">
                      {source.file}:{source.lineStart}–{source.lineEnd}
                    </div>
                  )}
                  {selectedNode && (
                    <div className="flex gap-2 text-[10px] font-mono">
                      <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-400">{selectedNode.type}</span>
                      <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-400">{selectedNode.language}</span>
                    </div>
                  )}
                  {/* Revert / Commit */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setCurrentCode(savedCode)}
                      className="bg-[#fca5a5] text-black px-4 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider border-2 border-black hover:bg-white transition-colors shadow-[2px_2px_0px_rgba(255,255,255,0.2)]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Revert
                    </button>
                    <button
                      onClick={() => setSavedCode(currentCode)}
                      className="bg-[#d9f99d] text-black px-4 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider border-2 border-black hover:bg-white transition-colors shadow-[2px_2px_0px_rgba(255,255,255,0.2)]"
                    >
                      <GitCommit className="w-3.5 h-3.5" /> Commit
                    </button>
                  </div>
                </div>

                {/* Code editor */}
                {currentCode ? (
                  <div className="flex-1 bg-[#0a0a0a] border-4 border-zinc-800 relative shadow-[8px_8px_0px_rgba(255,255,255,0.05)] flex flex-col p-2 min-h-[200px]">
                    {/* Line numbers */}
                    <div className="absolute top-2 left-2 bottom-2 w-10 bg-black border-r-2 border-zinc-800 flex flex-col py-4 items-center text-zinc-600 font-mono text-xs select-none pointer-events-none">
                      {currentCode.split('\n').map((_, i) => (
                        <span key={i} className="leading-7">{i + 1}</span>
                      ))}
                    </div>
                    {/* Highlight layer + textarea */}
                    <div className="relative flex-1 w-full overflow-hidden ml-12">
                      <pre
                        ref={preRef}
                        aria-hidden="true"
                        className="absolute inset-0 m-0 p-4 bg-transparent font-mono text-sm leading-7 text-zinc-400 whitespace-pre-wrap break-words overflow-hidden pointer-events-none"
                      >
                        <code dangerouslySetInnerHTML={{ __html: highlightSyntax(currentCode) }} />
                      </pre>
                      <textarea
                        ref={textRef}
                        value={currentCode}
                        onChange={e => setCurrentCode(e.target.value)}
                        onScroll={handleEditorScroll}
                        spellCheck={false}
                        className="absolute inset-0 w-full h-full p-4 font-mono text-sm leading-7 text-transparent caret-white resize-none outline-none bg-transparent whitespace-pre-wrap break-words overflow-auto"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center border-4 border-zinc-900 min-h-[200px]">
                    <div className="text-center">
                      <Eye className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
                      <p className="text-zinc-600 font-mono text-sm">Click a node to inspect its source</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── IMPACT TAB ── */}
            {activeTab === 'impact' && (
              <div className="space-y-6 animate-fade-in">
                {hasImpact ? (
                  <>
                    {/* Risk banner */}
                    <div className={`flex items-center gap-4 p-5 border-4 border-black shadow-[6px_6px_0px_rgba(255,255,255,0.2)]
                      ${impactData!.riskScore > 0.6 ? 'bg-[#fca5a5] text-black'
                        : impactData!.riskScore > 0.3 ? 'bg-[#fde047] text-black'
                        : 'bg-[#d9f99d] text-black'}`}
                    >
                      <ShieldAlert className="w-8 h-8 stroke-[3] shrink-0" />
                      <div>
                        <div className="text-xl font-black tracking-tighter uppercase leading-none">
                          {impactData!.riskScore > 0.6 ? 'High Risk' : impactData!.riskScore > 0.3 ? 'Medium Risk' : 'Low Risk'}<br />Change
                        </div>
                        <div className="text-sm font-bold opacity-70 mt-1">
                          {(impactData!.riskScore * 100).toFixed(0)}% risk score
                        </div>
                      </div>
                    </div>

                    {/* Risk explanation */}
                    <div className="bg-black border-2 border-zinc-800 p-5 shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Explanation</div>
                      <p className="text-sm font-bold text-zinc-300 leading-relaxed">{impactData!.riskExplanation}</p>
                    </div>

                    {/* Affected behaviors */}
                    {impactData!.affectedBehaviorIds.length > 0 && (
                      <div className="bg-black border-2 border-zinc-800 p-5 shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Affected Behaviors</div>
                        <ul className="space-y-3">
                          {impactData!.affectedBehaviorIds.map(bid => {
                            const b = graphData?.behaviors.find(b => b.id === bid)
                            return (
                              <li key={bid} className="flex items-center gap-3 text-sm font-bold text-[#fca5a5] uppercase tracking-wide">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                {b?.name || bid}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}

                    {/* Changed files */}
                    {changeSetData && changeSetData.changedFiles.length > 0 && (
                      <div className="bg-black border-2 border-zinc-800 p-5 shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Changed Files</div>
                        <ul className="space-y-1">
                          {changeSetData.changedFiles.map(f => (
                            <li key={f} className="text-xs font-mono text-zinc-400 flex items-center gap-2">
                              <span className="text-[#fca5a5]">~</span> {f.split('/').pop()}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* AI explanation */}
                    {explanation && (
                      <div className="bg-black border-2 border-zinc-800 p-5 shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">AI Analysis</div>
                        <p className="text-sm font-bold text-zinc-400 leading-relaxed">{explanation.overallConclusion}</p>
                        {explanation.behaviorExplanations.map(be => (
                          <div key={be.behaviorId} className="mt-3 pt-3 border-t border-zinc-800">
                            <div className="text-xs font-black text-zinc-300 uppercase">{be.name}</div>
                            <div className="text-xs text-zinc-500 mt-1">{be.summary}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Scenario results */}
                    {scenarioResults.length > 0 && (
                      <div className="bg-black border-2 border-zinc-800 overflow-hidden shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
                        <div className="px-5 py-3 border-b-2 border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          Scenario Results
                        </div>
                        <ul className="divide-y-2 divide-zinc-900">
                          {scenarioResults.map(sr => (
                            <li
                              key={sr.id}
                              className={`flex items-center justify-between px-5 py-3 text-xs font-bold uppercase tracking-wide
                                ${sr.confirmedRegression ? 'text-[#fca5a5] bg-[#1a0505]' : 'text-zinc-400 hover:bg-zinc-900'}`}
                            >
                              <div className="flex items-center gap-3">
                                {sr.confirmedRegression
                                  ? <XCircle className="w-4 h-4 text-[#fca5a5]" />
                                  : <CheckCircle className="w-4 h-4 text-[#d9f99d]" />}
                                <span className="truncate max-w-[200px]">{sr.scenarioId}</span>
                              </div>
                              <span className={sr.confirmedRegression ? 'font-black' : 'text-[#d9f99d]'}>
                                {sr.confirmedRegression ? 'REGRESSION' : sr.status.toUpperCase()}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Evidence */}
                    {evidence.length > 0 && (
                      <div className="bg-black border-2 border-zinc-800 p-5 shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Evidence</div>
                        <ul className="space-y-2">
                          {evidence.slice(0, 5).map(ev => (
                            <li key={ev.id} className="text-xs font-bold text-zinc-400 flex items-start gap-2">
                              <Shield className="w-3 h-3 text-[#d8b4fe] shrink-0 mt-0.5" />
                              {ev.summary}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  /* No impact yet */
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4">
                    <div className="flex items-center gap-4 bg-zinc-900 text-zinc-400 p-5 border-4 border-zinc-800">
                      <ShieldAlert className="w-8 h-8 stroke-[3]" />
                      <span className="text-xl font-black tracking-tighter uppercase">No Impact<br />Data Yet</span>
                    </div>
                    <p className="text-sm font-bold text-zinc-600 text-center max-w-xs">
                      Analyze the project, then edit a source file and analyze again to see the change impact.
                    </p>
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="bg-[#a5f3fc] text-black px-6 py-2 font-black text-xs border-2 border-black hover:bg-white transition-colors"
                    >
                      {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── CAPABILITY TAB ── */}
            {activeTab === 'capability' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-4 bg-[#d8b4fe] text-black p-5 border-4 border-black shadow-[6px_6px_0px_rgba(255,255,255,0.2)]">
                  <Zap className="w-8 h-8 stroke-[3]" />
                  <span className="text-xl font-black tracking-tighter uppercase leading-none">Capability<br />Detection</span>
                </div>
                <h3 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Loan<br />Management</h3>
                <div className="bg-black border-2 border-zinc-800 overflow-hidden shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
                  <ul className="divide-y-2 divide-zinc-900 text-xs font-black uppercase tracking-widest text-zinc-500">
                    {[
                      { label: 'UI Components', ok: true },
                      { label: 'API Routes', ok: true },
                      { label: 'Business Logic', ok: true },
                      { label: 'Persistence', ok: true },
                      { label: 'Test Coverage', ok: false },
                    ].map(({ label, ok }) => (
                      <li key={label} className={`flex items-center justify-between p-5 hover:bg-zinc-900 transition-colors ${!ok ? 'bg-zinc-900 text-zinc-300' : ''}`}>
                        {label}
                        <span className={`text-xl leading-none ${ok ? 'text-[#d9f99d]' : 'text-[#fde047]'}`}>
                          {ok ? '✓' : '⚠'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs font-mono text-zinc-600">
                  Structural capability detection requires the Loan feature diff. Available in Phase 4.
                </p>
              </div>
            )}

          </div>
        </aside>

      </div>

      {/* ── Behavior footer bar ── */}
      {graphData?.behaviors && graphData.behaviors.length > 0 && (
        <footer className="h-10 border-t-2 border-zinc-800 bg-[#0a0a0a] flex items-center gap-6 px-6 overflow-x-auto shrink-0 scroll-thin">
          <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest shrink-0">Behaviors</span>
          {graphData.behaviors.map(b => (
            <button
              key={b.id}
              onClick={() => handleBehaviorClick(b.id)}
              className={`flex items-center gap-2 px-2 py-0.5 rounded transition-colors whitespace-nowrap
                ${selectedBehavior === b.id ? 'bg-zinc-800' : 'hover:bg-zinc-900'}`}
            >
              <div className={`w-2 h-2 rounded-none
                ${selectedBehavior === b.id ? 'bg-[#a5f3fc]'
                  : impactData?.affectedBehaviorIds.includes(b.id) ? 'bg-[#fca5a5]'
                  : 'bg-[#d9f99d]'}`}
              />
              <span className={`text-[10px] font-black uppercase tracking-wide
                ${selectedBehavior === b.id ? 'text-white' : 'text-zinc-500'}`}>
                {b.name}
              </span>
              <span className="text-[9px] text-zinc-700 font-mono">[{b.category}]</span>
            </button>
          ))}
        </footer>
      )}

    </div>
  )
}
