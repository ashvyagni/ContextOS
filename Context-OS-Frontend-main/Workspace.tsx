import { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, { Background, Controls, MarkerType, Handle, Position, useNodesState, useEdgesState, addEdge, Panel } from 'reactflow';
import 'reactflow/dist/style.css';
import { Network, Activity, ShieldAlert, Code2, Zap, ChevronDown, FolderGit2, Plus, RotateCcw, PaintBucket, GitCommit, ChevronRight, FileCode2, Maximize2, PanelRightClose, PanelRightOpen, Code, Trash2 } from 'lucide-react';

const BrutalistNode = ({ data, selected }: any) => {
  return (
    <div className={`px-4 py-3 border-4 ${selected ? 'border-white' : 'border-black'} ${data.bgColor} text-black shadow-[6px_6px_0px_rgba(255,255,255,0.15)] min-w-[200px] transition-colors`}>
      <Handle type="target" position={Position.Top} className="w-4 h-4 bg-black rounded-none border-2 border-white -mt-2" />
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{data.role}</span>
        <span className="text-sm font-black tracking-tight leading-tight">{data.label}</span>
      </div>
      {data.expandable && (
        <button onClick={() => data.onExpand(data.targetFlowId)} className="mt-3 w-full bg-black text-white text-[10px] font-black uppercase tracking-widest py-1.5 border-2 border-black hover:bg-white hover:text-black transition-colors flex items-center justify-center gap-2">
          <Maximize2 className="w-3 h-3" /> Expand Flow
        </button>
      )}
      <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-black rounded-none border-2 border-white -mb-2" />
    </div>
  );
};

const nodeTypes = { brutalist: BrutalistNode };

const initialProjectsData: Record<string, any[]> = {
  'Banking': [
    {
      id: 'b_macro',
      name: 'MacroArchitecture.tsx',
      code: 'def initialize_banking_system():\n    print("Starting core services...")\n    connect_to_db("postgres://core")\n    start_auth_service(port=8080)\n    start_withdraw_engine(port=8081)\n    return True',
      nodes: [
        { id: 'm1', type: 'brutalist', position: { x: 250, y: 50 }, data: { label: 'Client Interface', role: 'Frontend', bgColor: 'bg-[#a5f3fc]' } },
        { id: 'm2', type: 'brutalist', position: { x: 250, y: 200 }, data: { label: 'Auth Gateway', role: 'Security', bgColor: 'bg-[#d8b4fe]', expandable: true, targetFlowId: 'b_micro_auth' } },
        { id: 'm3', type: 'brutalist', position: { x: 250, y: 350 }, data: { label: 'Withdraw Engine', role: 'Sub-Workflow', bgColor: 'bg-[#fca5a5]', expandable: true, targetFlowId: 'b_micro_withdraw' } },
        { id: 'm4', type: 'brutalist', position: { x: 250, y: 500 }, data: { label: 'Master Database', role: 'Persistence', bgColor: 'bg-[#d9f99d]' } },
      ],
      edges: [
        { id: 'em1', source: 'm1', target: 'm2', animated: true, type: 'step', style: { stroke: '#a5f3fc', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a5f3fc' } },
        { id: 'em2', source: 'm2', target: 'm3', animated: true, type: 'step', style: { stroke: '#d8b4fe', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#d8b4fe' } },
        { id: 'em3', source: 'm3', target: 'm4', animated: true, type: 'step', style: { stroke: '#fca5a5', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#fca5a5' } },
      ]
    },
    {
      id: 'b_micro_auth',
      name: 'AuthMicro.tsx',
      code: 'def authenticate_user(token: str):\n    if not verify_jwt(token):\n        raise AuthError("Invalid Session")\n    \n    user = db.get_user_by_token(token)\n    return user.id',
      nodes: [
        { id: 'a1', type: 'brutalist', position: { x: 250, y: 50 }, data: { label: 'Login Component', role: 'UI Component', bgColor: 'bg-[#a5f3fc]' } },
        { id: 'a2', type: 'brutalist', position: { x: 250, y: 200 }, data: { label: 'verify_jwt()', role: 'Validation', bgColor: 'bg-[#d8b4fe]' } },
        { id: 'a3', type: 'brutalist', position: { x: 250, y: 350 }, data: { label: 'Session Store', role: 'Redis DB', bgColor: 'bg-[#d9f99d]' } },
      ],
      edges: [
        { id: 'ea1', source: 'a1', target: 'a2', animated: true, type: 'step', style: { stroke: '#a5f3fc', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a5f3fc' } },
        { id: 'ea2', source: 'a2', target: 'a3', animated: true, type: 'step', style: { stroke: '#d8b4fe', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#d8b4fe' } },
      ]
    },
    {
      id: 'b_micro_withdraw',
      name: 'WithdrawMicro.tsx',
      code: 'def withdraw(amount: float):\n    if amount <= 0:\n        raise ValueError("Invalid Amount")\n    if amount > balance:\n        raise InsufficientFunds()\n    \n    balance -= amount\n    log_transaction(amount)\n    return balance',
      nodes: [
        { id: 'w1', type: 'brutalist', position: { x: 250, y: 50 }, data: { label: 'Withdraw.tsx', role: 'Frontend', bgColor: 'bg-[#a5f3fc]' } },
        { id: 'w2', type: 'brutalist', position: { x: 250, y: 200 }, data: { label: 'POST /withdraw', role: 'API Route', bgColor: 'bg-[#d8b4fe]' } },
        { id: 'w3', type: 'brutalist', position: { x: 250, y: 350 }, data: { label: 'withdraw_funds()', role: 'Logic', bgColor: 'bg-[#fca5a5]' } },
        { id: 'w4', type: 'brutalist', position: { x: 250, y: 500 }, data: { label: 'Transactions DB', role: 'Database', bgColor: 'bg-[#d9f99d]' } },
      ],
      edges: [
        { id: 'ew1', source: 'w1', target: 'w2', animated: true, type: 'step', style: { stroke: '#a5f3fc', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a5f3fc' } },
        { id: 'ew2', source: 'w2', target: 'w3', animated: true, type: 'step', style: { stroke: '#fca5a5', strokeWidth: 5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#fca5a5' } },
        { id: 'ew3', source: 'w3', target: 'w4', animated: true, type: 'step', style: { stroke: '#fca5a5', strokeWidth: 5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#fca5a5' } },
      ]
    }
  ],
  'E-commerce': [
    {
      id: 'e_cart',
      name: 'CartLogic.ts',
      code: 'export const addToCart = (productId: string, qty: number) => {\n  if (qty <= 0) return;\n  cart.push({ id: productId, quantity: qty });\n  updateTotal();\n};',
      nodes: [
        { id: 'ec1', type: 'brutalist', position: { x: 250, y: 50 }, data: { label: 'ProductPage.tsx', role: 'UI', bgColor: 'bg-[#a5f3fc]' } },
        { id: 'ec2', type: 'brutalist', position: { x: 250, y: 200 }, data: { label: 'Cart Context', role: 'State', bgColor: 'bg-[#d9f99d]' } },
      ],
      edges: [
        { id: 'ee1', source: 'ec1', target: 'ec2', animated: true, style: { stroke: '#d9f99d', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#d9f99d' } }
      ]
    }
  ]
};

const highlightSyntax = (text: string) => {
  let escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, '<span style="color:#fca5a5">$&</span>')
    .replace(/\b(def|class|function|const|let|var|if|else|return|import|export|from|public|private|static|new|interface|type|raise)\b/g, '<span style="color:#d8b4fe; font-weight:900">$1</span>')
    .replace(/([a-zA-Z_$][\w$]*)\s*(?=\()/g, '<span style="color:#a5f3fc; font-weight:900">$1</span>')
    .replace(/\b(\d+\.?\d*)\b(?![^<]*>)/g, '<span style="color:#d9f99d; font-weight:900">$&</span>');
};

export default function Workspace({ username }: { username: string }) {
  const [db, setDb] = useState(initialProjectsData);
  const [activeTab, setActiveTab] = useState<'source' | 'impact' | 'capability'>('source');
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState('Banking');
  const [newProjectName, setNewProjectName] = useState('');
  const [isAddingProject, setIsAddingProject] = useState(false);
  
  const [activeFileId, setActiveFileId] = useState<string>('b_macro');
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'workspace': true,
    'ContextOS': true,
    'apps': true,
    'frontend': true,
    'workflows': true
  });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [code, setCode] = useState('');
  const [checkpoint, setCheckpoint] = useState('');

  const textRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const currentProjectFiles = db[selectedProject] || [];
    const activeFile = currentProjectFiles.find(f => f.id === activeFileId) || currentProjectFiles[0];
    
    if (activeFile) {
      const boundNodes = activeFile.nodes.map((n: any) => {
        if (n.data.expandable) {
          return { ...n, data: { ...n.data, onExpand: (targetId: string) => setActiveFileId(targetId) } };
        }
        return n;
      });
      
      setNodes(boundNodes);
      setEdges(activeFile.edges);
      setCode(activeFile.code);
      setCheckpoint(activeFile.code);
      if (!currentProjectFiles.find(f => f.id === activeFileId)) {
        setActiveFileId(activeFile.id);
      }
    } else {
      setNodes([]);
      setEdges([]);
      setCode('// No files exist in this project.');
      setCheckpoint('');
    }
  }, [activeFileId, selectedProject, db, setNodes, setEdges]);

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge({ ...params, type: 'step', style: { stroke: '#fff', strokeWidth: 2 } }, eds)), [setEdges]);

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    const projName = newProjectName.trim();
    if (projName && !db[projName]) {
      setDb({ ...db, [projName]: [{ id: `new_${Date.now()}`, name: 'NewFlow.tsx', code: '// Start coding', nodes: [], edges: [] }] });
      setSelectedProject(projName);
      setNewProjectName('');
      setIsAddingProject(false);
      setIsProjectMenuOpen(false);
    }
  };

  const handleAddFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fileName = prompt('Enter new file name:');
    if (fileName) {
      const newFile = { id: `file_${Date.now()}`, name: fileName, code: '// New workflow', nodes: [], edges: [] };
      setDb(prev => ({ ...prev, [selectedProject]: [...(prev[selectedProject] || []), newFile] }));
      setActiveFileId(newFile.id);
    }
  };

  const handleDeleteFile = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    setDb(prev => {
      const updatedFiles = prev[selectedProject].filter(f => f.id !== fileId);
      if (activeFileId === fileId && updatedFiles.length > 0) setActiveFileId(updatedFiles[0].id);
      return { ...prev, [selectedProject]: updatedFiles };
    });
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const updateSelectedNodeColor = (color: string) => setNodes((nds) => nds.map((n) => n.selected ? { ...n, data: { ...n.data, bgColor: color } } : n));
  const updateSelectedEdgeType = (type: string) => setEdges((eds) => eds.map((e) => e.selected ? { ...e, type } : e));
  const toggleSelectedEdgeAnimation = () => setEdges((eds) => eds.map((e) => e.selected ? { ...e, animated: !e.animated } : e));

  const hasSelectedNode = nodes.some(n => n.selected);
  const hasSelectedEdge = edges.some(e => e.selected);

  const handleScroll = () => {
    if (textRef.current && preRef.current) {
      preRef.current.scrollTop = textRef.current.scrollTop;
      preRef.current.scrollLeft = textRef.current.scrollLeft;
    }
  };

  const currentFiles = db[selectedProject] || [];
  const activeFileName = currentFiles.find(f => f.id === activeFileId)?.name || 'Editor';

  return (
    <div className="flex flex-col h-screen w-screen bg-[#050505] text-zinc-100 font-sans overflow-hidden selection:bg-[#d9f99d] selection:text-black">
      
      <header className="h-16 border-b-2 border-zinc-800 bg-[#0a0a0a] flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="bg-[#a5f3fc] p-1.5 border-2 border-black shadow-[2px_2px_0px_rgba(255,255,255,0.2)]">
              <Network className="w-5 h-5 text-black" />
            </div>
            <span className="font-black text-xl tracking-tighter uppercase text-white">ContextOS</span>
          </div>
          
          <div className="relative">
            <button onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)} className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-900 transition-colors border-2 border-zinc-800 rounded-none">
              <span className="font-bold text-sm text-zinc-500 uppercase">{username}</span>
              <span className="text-zinc-600 font-black">/</span>
              <span className="font-black text-sm text-[#a5f3fc] uppercase tracking-wide">{selectedProject}</span>
              <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isProjectMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProjectMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-black border-2 border-zinc-700 shadow-[8px_8px_0px_rgba(255,255,255,0.05)] z-50 rounded-none">
                <div className="px-4 py-3 border-b-2 border-zinc-800 flex justify-between items-center bg-[#0a0a0a]">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Projects</span>
                  <button onClick={() => setIsAddingProject(!isAddingProject)} className="text-zinc-400 hover:text-white"><Plus className="w-5 h-5" /></button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {Object.keys(db).map((proj) => (
                    <button key={proj} onClick={() => { setSelectedProject(proj); setIsProjectMenuOpen(false); setIsAddingProject(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-zinc-900 border-b-2 border-zinc-900 last:border-0 transition-colors">
                      <FolderGit2 className="w-4 h-4 text-zinc-600" />
                      <span className={selectedProject === proj ? 'text-white font-black uppercase tracking-wide' : 'text-zinc-500 font-bold uppercase tracking-wide'}>{proj}</span>
                    </button>
                  ))}
                </div>
                {isAddingProject && (
                  <form onSubmit={handleAddProject} className="p-3 border-t-2 border-zinc-800 bg-zinc-950">
                    <input type="text" placeholder="NEW PROJECT NAME..." value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="w-full bg-black border-2 border-zinc-700 px-3 py-2 text-xs font-black text-white uppercase placeholder-zinc-700 outline-none focus:border-[#a5f3fc] rounded-none" autoFocus />
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest">
          <div className="flex items-center gap-2 text-[#d8b4fe] bg-black px-4 py-2 border-2 border-zinc-800 rounded-none">
            <Activity className="w-4 h-4" />
            <span>Version_17</span>
          </div>
          <div className="flex items-center gap-2 bg-[#d9f99d] text-black px-4 py-2 border-2 border-black shadow-[2px_2px_0px_rgba(255,255,255,0.2)] rounded-none">
            <div className="w-2 h-2 rounded-none bg-black"></div>
            Connected
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        
        <aside className="w-64 bg-[#0a0a0a] border-r-2 border-zinc-800 flex flex-col shrink-0 font-mono text-sm z-20 overflow-hidden">
          <div className="p-4 border-b-2 border-zinc-800 flex items-center justify-between text-zinc-500">
            <span className="font-black uppercase tracking-widest text-[10px]">Explorer</span>
            <FolderGit2 className="w-4 h-4" />
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            
            <div onClick={() => toggleFolder('workspace')} className="flex items-center gap-1 px-2 py-1 text-zinc-300 hover:bg-zinc-900 cursor-pointer select-none">
              <ChevronDown className={`w-4 h-4 shrink-0 text-zinc-500 transition-transform ${!expandedFolders['workspace'] ? '-rotate-90' : ''}`} />
              <span className="font-bold">workspace</span>
            </div>
            
            {expandedFolders['workspace'] && (
              <div className="flex flex-col">
                <div onClick={() => toggleFolder('ContextOS')} className="flex items-center gap-1 pl-6 pr-2 py-1 text-zinc-300 hover:bg-zinc-900 cursor-pointer select-none">
                  <ChevronDown className={`w-4 h-4 shrink-0 text-zinc-500 transition-transform ${!expandedFolders['ContextOS'] ? '-rotate-90' : ''}`} />
                  <span>ContextOS</span>
                </div>
                
                {expandedFolders['ContextOS'] && (
                  <div className="flex flex-col">
                    <div onClick={() => toggleFolder('apps')} className="flex items-center gap-1 pl-10 pr-2 py-1 text-zinc-300 hover:bg-zinc-900 cursor-pointer select-none">
                      <ChevronDown className={`w-4 h-4 shrink-0 text-zinc-500 transition-transform ${!expandedFolders['apps'] ? '-rotate-90' : ''}`} />
                      <span>apps</span>
                    </div>
                    
                    {expandedFolders['apps'] && (
                      <div className="flex flex-col">
                        <div onClick={() => toggleFolder('frontend')} className="flex items-center gap-1 pl-14 pr-2 py-1 text-[#a5f3fc] bg-zinc-900 cursor-pointer border-l-2 border-[#a5f3fc] select-none">
                          <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${!expandedFolders['frontend'] ? '-rotate-90' : ''}`} />
                          <span className="font-bold">frontend</span>
                        </div>
                        
                        {expandedFolders['frontend'] && (
                          <div className="flex flex-col">
                            <div onClick={() => toggleFolder('workflows')} className="flex items-center justify-between pl-18 pr-4 py-1 hover:bg-zinc-900 cursor-pointer group select-none">
                              <div className="flex items-center gap-1 text-[#d8b4fe]">
                                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${!expandedFolders['workflows'] ? '-rotate-90' : ''}`} />
                                <span className="font-bold">workflows ({selectedProject.replace(/\s+/g, '')})</span>
                              </div>
                              <button onClick={handleAddFile} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white transition-opacity"><Plus className="w-4 h-4" /></button>
                            </div>
                            
                            {expandedFolders['workflows'] && (
                              <div className="flex flex-col border-l-2 border-zinc-800 ml-19">
                                {currentFiles.map(file => (
                                  <div key={file.id} onClick={() => setActiveFileId(file.id)} className="flex items-center justify-between pl-6 pr-4 py-1.5 text-zinc-400 hover:bg-zinc-900 cursor-pointer group select-none">
                                    <div className="flex items-center gap-2">
                                      <FileCode2 className={`w-4 h-4 shrink-0 ${activeFileId === file.id ? 'text-[#a5f3fc]' : 'text-zinc-600'}`} />
                                      <span className={`truncate max-w-[120px] ${activeFileId === file.id ? 'text-white font-bold' : ''}`}>{file.name}</span>
                                    </div>
                                    <button onClick={(e) => handleDeleteFile(e, file.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-[#fca5a5] transition-opacity"><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 relative bg-[#050505] flex flex-col">
          <div className="absolute top-6 left-6 z-10">
             <div className="px-4 py-2 bg-black text-white border-2 border-zinc-700 font-black text-xs tracking-widest uppercase shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
                Behavior Graph: {activeFileName}
             </div>
          </div>

          <div className="absolute top-6 right-6 z-10">
            <button onClick={() => setIsPanelOpen(!isPanelOpen)} className="bg-black text-white p-3 border-2 border-zinc-700 hover:bg-zinc-900 transition-colors shadow-[4px_4px_0px_rgba(255,255,255,0.05)] flex items-center gap-2">
              {isPanelOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
              <span className="font-black text-xs tracking-widest uppercase">{isPanelOpen ? 'Hide Editor' : 'Show Editor'}</span>
            </button>
          </div>

          <div className="flex-1 w-full h-full">
            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} fitView className="bg-[#050505]">
              <Background color="#27272a" gap={24} size={2} />
              <Controls className="bg-black border-2 border-zinc-800 shadow-[4px_4px_0px_rgba(255,255,255,0.05)] rounded-none overflow-hidden [&>button]:border-zinc-800 [&>button]:bg-black [&>button]:text-white hover:[&>button]:bg-zinc-900" />
              {(hasSelectedNode || hasSelectedEdge) && (
                <Panel position="bottom-center" className="bg-black border-2 border-zinc-700 p-4 shadow-[4px_4px_0px_rgba(255,255,255,0.1)] flex gap-8 mb-4">
                  {hasSelectedNode && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2"><PaintBucket className="w-3 h-3" /> Node Color</span>
                      <div className="flex gap-2">
                        {['bg-white', 'bg-[#a5f3fc]', 'bg-[#d8b4fe]', 'bg-[#fca5a5]', 'bg-[#d9f99d]'].map(color => (
                          <button key={color} onClick={() => updateSelectedNodeColor(color)} className={`w-8 h-8 ${color} border-2 border-black hover:scale-110 transition-transform`} />
                        ))}
                      </div>
                    </div>
                  )}
                  {hasSelectedNode && hasSelectedEdge && <div className="w-[2px] bg-zinc-800 h-full" />}
                  {hasSelectedEdge && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2"><GitCommit className="w-3 h-3" /> Edge Style</span>
                      <div className="flex gap-2">
                        <button onClick={() => updateSelectedEdgeType('default')} className="px-3 bg-zinc-900 text-white text-[10px] font-bold py-1 border border-zinc-700 hover:bg-zinc-800">SMOOTH</button>
                        <button onClick={() => updateSelectedEdgeType('step')} className="px-3 bg-zinc-900 text-white text-[10px] font-bold py-1 border border-zinc-700 hover:bg-zinc-800">STEP</button>
                        <button onClick={() => updateSelectedEdgeType('straight')} className="px-3 bg-zinc-900 text-white text-[10px] font-bold py-1 border border-zinc-700 hover:bg-zinc-800">LINE</button>
                        <button onClick={toggleSelectedEdgeAnimation} className="ml-2 px-3 bg-[#d8b4fe] text-black text-[10px] font-black py-1 border-2 border-black hover:bg-white transition-colors">ANIMATE</button>
                      </div>
                    </div>
                  )}
                </Panel>
              )}
            </ReactFlow>
          </div>
        </main>

        <aside className={`bg-[#0a0a0a] border-l-2 border-zinc-800 flex flex-col shrink-0 z-10 transition-all duration-500 ease-in-out ${isPanelOpen ? 'w-[550px] translate-x-0' : 'w-[550px] absolute right-0 translate-x-[100%] border-l-0'}`}>
          <div className="flex p-4 gap-3 border-b-2 border-zinc-800 bg-[#050505]">
            <button onClick={() => setActiveTab('source')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest rounded-none border-[3px] transition-all ${activeTab === 'source' ? 'bg-[#a5f3fc] text-black border-black shadow-[4px_4px_0px_rgba(255,255,255,0.2)]' : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600'}`}>
              <Code2 className="w-4 h-4" /> Source
            </button>
            <button onClick={() => setActiveTab('impact')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest rounded-none border-[3px] transition-all ${activeTab === 'impact' ? 'bg-[#fca5a5] text-black border-black shadow-[4px_4px_0px_rgba(255,255,255,0.2)]' : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600'}`}>
              <ShieldAlert className="w-4 h-4" /> Impact
            </button>
            <button onClick={() => setActiveTab('capability')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest rounded-none border-[3px] transition-all ${activeTab === 'capability' ? 'bg-[#d8b4fe] text-black border-black shadow-[4px_4px_0px_rgba(255,255,255,0.2)]' : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600'}`}>
              <Zap className="w-4 h-4" /> Capability
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 flex flex-col bg-[#050505] bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]">
            {activeTab === 'source' && (
              <div className="flex flex-col h-full gap-6">
                <div className="flex flex-col gap-4 bg-black p-5 border-2 border-zinc-800 shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[10px] font-black text-[#a5f3fc] uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Code className="w-3 h-3" /> Live Editor
                      </h3>
                      <p className="text-xl font-black text-white uppercase tracking-tighter">{activeFileName}</p>
                    </div>
                  </div>
                  
                  <div className="h-[2px] w-full bg-zinc-900"></div>

                  <div className="flex justify-end gap-3">
                    <button onClick={() => setCode(checkpoint)} className="bg-[#fca5a5] text-black px-4 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider border-2 border-black hover:bg-white transition-colors shadow-[2px_2px_0px_rgba(255,255,255,0.2)]">
                      <RotateCcw className="w-4 h-4" /> Revert
                    </button>
                    <button onClick={() => {
                        setCheckpoint(code);
                        setDb(prev => ({
                          ...prev,
                          [selectedProject]: prev[selectedProject].map(f => f.id === activeFileId ? { ...f, code } : f)
                        }));
                      }} className="bg-[#d9f99d] text-black px-4 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider border-2 border-black hover:bg-white transition-colors shadow-[2px_2px_0px_rgba(255,255,255,0.2)]">
                      <GitCommit className="w-4 h-4" /> Commit
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 bg-[#0a0a0a] border-4 border-zinc-800 relative shadow-[8px_8px_0px_rgba(255,255,255,0.05)] flex flex-col p-2">
                  <div className="absolute top-2 left-2 bottom-2 w-12 bg-black border-r-2 border-zinc-800 flex flex-col py-6 items-center text-zinc-600 font-mono text-sm select-none pointer-events-none">
                    {code.split('\n').map((_, i) => <span key={i} className="leading-7">{i + 1}</span>)}
                  </div>
                  <div className="relative flex-1 w-full overflow-hidden ml-14">
                    <pre ref={preRef} aria-hidden="true" className="absolute inset-0 m-0 p-6 bg-transparent font-mono text-sm leading-7 text-zinc-400 whitespace-pre-wrap break-words overflow-hidden pointer-events-none">
                      <code dangerouslySetInnerHTML={{ __html: highlightSyntax(code) }} />
                    </pre>
                    <textarea ref={textRef} value={code} onChange={(e) => setCode(e.target.value)} onScroll={handleScroll} spellCheck="false" className="absolute inset-0 w-full h-full p-6 font-mono text-sm leading-7 text-transparent caret-white resize-none outline-none bg-transparent whitespace-pre-wrap break-words overflow-auto" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'impact' && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 bg-[#fca5a5] text-black p-5 border-4 border-black shadow-[6px_6px_0px_rgba(255,255,255,0.2)]">
                  <ShieldAlert className="w-8 h-8 stroke-[3]" />
                  <span className="text-xl font-black tracking-tighter uppercase leading-none mt-1">High Risk<br/>Change</span>
                </div>
                <div className="bg-black border-2 border-zinc-800 p-6 shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
                  <ul className="space-y-6 text-sm font-bold text-zinc-400 uppercase tracking-wide">
                    <li className="flex items-start gap-4"><div className="w-3 h-3 mt-0.5 bg-zinc-700 rounded-none shrink-0 border border-black"></div><span>4 downstream behaviors affected</span></li>
                    <li className="flex items-start gap-4"><div className="w-3 h-3 mt-0.5 bg-zinc-700 rounded-none shrink-0 border border-black"></div><span>2 API routes exposed</span></li>
                    <li className="flex items-start gap-4 text-[#fca5a5]"><div className="w-3 h-3 mt-0.5 bg-[#fca5a5] rounded-none shrink-0 border border-black shadow-[2px_2px_0px_rgba(252,165,165,0.5)]"></div><span className="font-black">Critical financial path compromised</span></li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'capability' && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 bg-[#d8b4fe] text-black p-5 border-4 border-black shadow-[6px_6px_0px_rgba(255,255,255,0.2)]">
                  <Zap className="w-8 h-8 stroke-[3]" />
                  <span className="text-xl font-black tracking-tighter uppercase leading-none mt-1">Capability<br/>Detected</span>
                </div>
                <h3 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Loan<br/>Management</h3>
                <div className="bg-black border-2 border-zinc-800 overflow-hidden shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
                  <ul className="divide-y-2 divide-zinc-900 text-xs font-black uppercase tracking-widest text-zinc-500">
                    <li className="flex items-center justify-between p-5 hover:bg-zinc-900 transition-colors">UI Components <span className="text-[#d9f99d] text-xl leading-none">✓</span></li>
                    <li className="flex items-center justify-between p-5 hover:bg-zinc-900 transition-colors">API Routes <span className="text-[#d9f99d] text-xl leading-none">✓</span></li>
                    <li className="flex items-center justify-between p-5 hover:bg-zinc-900 transition-colors">Business Logic <span className="text-[#d9f99d] text-xl leading-none">✓</span></li>
                    <li className="flex items-center justify-between p-5 hover:bg-zinc-900 transition-colors">Persistence <span className="text-[#d9f99d] text-xl leading-none">✓</span></li>
                    <li className="flex items-center justify-between p-5 bg-zinc-900 text-zinc-300">Test Coverage <span className="text-[#fde047] text-xl leading-none">⚠</span></li>
                  </ul>
                </div>
              </div>
            )}

          </div>
        </aside>
      </div>
    </div>
  );
}