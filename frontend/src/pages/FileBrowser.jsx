import { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { fetchFiles, fetchFileContent } from '../api/client';
import {
  FolderOpen, File, Loader2, AlertCircle, ChevronRight, ChevronDown, RefreshCw,
} from 'lucide-react';

function FileTree({ nodes, onSelect, selected, depth = 0 }) {
  const [open, setOpen] = useState({});

  const toggle = (name) => setOpen((o) => ({ ...o, [name]: !o[name] }));

  if (!nodes || nodes.length === 0) return null;

  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => {
        const isDir = node.type === 'directory' || node.children;
        const isOpen = open[node.name];
        const isSelected = selected === node.path;

        return (
          <li key={node.path || node.name}>
            <button
              onClick={() => {
                if (isDir) toggle(node.name);
                else onSelect(node);
              }}
              className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors text-left ${
                isSelected
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              style={{ paddingLeft: `${8 + depth * 16}px` }}
            >
              {isDir ? (
                <>
                  {isOpen ? (
                    <ChevronDown size={13} className="text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight size={13} className="text-slate-400 shrink-0" />
                  )}
                  <FolderOpen size={13} className="text-amber-500 shrink-0" />
                </>
              ) : (
                <>
                  <span className="w-[13px] shrink-0" />
                  <File size={13} className="text-slate-400 shrink-0" />
                </>
              )}
              <span className="truncate">{node.name}</span>
            </button>
            {isDir && isOpen && node.children && (
              <FileTree
                nodes={node.children}
                onSelect={onSelect}
                selected={selected}
                depth={depth + 1}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function detectLang(path) {
  if (!path) return '';
  const ext = path.split('.').pop()?.toLowerCase();
  const map = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', go: 'go', rs: 'rust', java: 'java',
    json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml',
    md: 'markdown', sh: 'bash', dockerfile: 'dockerfile', sql: 'sql',
  };
  return map[ext] || '';
}

export default function FileBrowser() {
  const { selectedProjectId, selectedEnvironmentId } = useProject();
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(null);

  const load = async () => {
    if (!selectedProjectId || !selectedEnvironmentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFiles(selectedProjectId, selectedEnvironmentId);
      setTree(Array.isArray(data) ? data : (data.files || data.tree || []));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedProjectId, selectedEnvironmentId]);

  const handleSelect = async (node) => {
    setSelectedFile(node.path);
    setFileContent('');
    setFileError(null);
    setFileLoading(true);
    try {
      const data = await fetchFileContent(selectedProjectId, selectedEnvironmentId, node.path);
      setFileContent(typeof data === 'string' ? data : (data.content || JSON.stringify(data, null, 2)));
    } catch (e) {
      setFileError(e.response?.data?.error || e.message);
    } finally {
      setFileLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">File Browser</h1>
          <p className="text-slate-500 text-sm mt-1">Browse the generated project files.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {!selectedEnvironmentId ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 text-slate-400 gap-3">
          <FolderOpen size={32} />
          <p className="font-medium">Select an environment first</p>
        </div>
      ) : (
        <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
          {/* File tree */}
          <div className="w-64 shrink-0 bg-white rounded-2xl border border-slate-200 soft-shadow overflow-auto p-3">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={20} className="animate-spin text-blue-500" />
              </div>
            ) : error ? (
              <div className="p-3 text-xs text-red-600 flex items-start gap-1.5">
                <AlertCircle size={13} className="shrink-0 mt-0.5" /> {error}
              </div>
            ) : tree.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-2">
                <FolderOpen size={24} />
                <p className="text-xs">No files found</p>
              </div>
            ) : (
              <FileTree nodes={tree} onSelect={handleSelect} selected={selectedFile} />
            )}
          </div>

          {/* File content */}
          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 soft-shadow overflow-hidden flex flex-col">
            {selectedFile ? (
              <>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  <File size={14} className="text-slate-400" />
                  <span className="text-sm font-mono text-slate-600 truncate">{selectedFile}</span>
                </div>
                <div className="flex-1 overflow-auto">
                  {fileLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 size={20} className="animate-spin text-blue-500" />
                    </div>
                  ) : fileError ? (
                    <div className="p-4 text-sm text-red-600 flex items-start gap-2">
                      <AlertCircle size={15} className="shrink-0 mt-0.5" /> {fileError}
                    </div>
                  ) : (
                    <pre className="p-4 text-xs font-mono text-slate-700 leading-relaxed whitespace-pre overflow-auto h-full">
                      {fileContent}
                    </pre>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                <File size={32} />
                <p className="text-sm">Select a file to view its contents</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
