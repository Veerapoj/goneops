import { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal as TerminalIcon, ShieldAlert, X, RefreshCw, Trash2 } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const WS_RECONNECT_DELAY = 3000;
const MAX_OUTPUT_LINES = 500;

export default function Terminal() {
  const { selectedProjectId, selectedEnvironmentId, selectedEnvironment } = useProject();

  const envName = selectedEnvironment?.name || 'sandbox';
  const [status, setStatus] = useState('idle');
  const [output, setOutput] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const outputEndRef = useRef(null);
  const inputRef = useRef(null);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const reconnectTimerRef = useRef(null);
  const shouldReconnectRef = useRef(false);

  const appendOutput = useCallback((text) => {
    setOutput((prev) => {
      const next = [...prev, { type: 'stdout', text, ts: Date.now() }];
      return next.length > MAX_OUTPUT_LINES ? next.slice(-MAX_OUTPUT_LINES) : next;
    });
  }, []);

  const appendSystem = useCallback((text) => {
    setOutput((prev) => {
      const next = [...prev, { type: 'system', text, ts: Date.now() }];
      return next.length > MAX_OUTPUT_LINES ? next.slice(-MAX_OUTPUT_LINES) : next;
    });
  }, []);

  const appendError = useCallback((text) => {
    setOutput((prev) => {
      const next = [...prev, { type: 'error', text, ts: Date.now() }];
      return next.length > MAX_OUTPUT_LINES ? next.slice(-MAX_OUTPUT_LINES) : next;
    });
  }, []);

  const connect = useCallback(() => {
    if (!selectedProjectId || !selectedEnvironmentId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/api/projects/${selectedProjectId}/terminal?environment_id=${selectedEnvironmentId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      setError(null);
      shouldReconnectRef.current = true;
      appendSystem('Terminal session established.');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'connected') {
          appendSystem(msg.message);
        } else if (msg.type === 'exited') {
          appendSystem(`Process exited with code ${msg.code}`);
          setStatus('disconnected');
        } else if (msg.type === 'error') {
          appendError(msg.message);
        }
      } catch {
        appendOutput(event.data);
      }
    };

    ws.onclose = (event) => {
      setStatus('disconnected');
      if (event.code >= 4000) {
        setError(`Connection closed: ${event.reason}`);
        appendSystem(`Connection closed: ${event.reason || 'Unknown reason'} (code: ${event.code})`);
        shouldReconnectRef.current = false;
      } else if (shouldReconnectRef.current) {
        appendSystem('Connection lost. Reconnecting...');
        reconnectTimerRef.current = setTimeout(connect, WS_RECONNECT_DELAY);
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection failed');
      setStatus('disconnected');
    };
  }, [selectedProjectId, selectedEnvironmentId, appendOutput, appendSystem, appendError]);

  useEffect(() => {
    connect();
    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  const sendCommand = useCallback((cmd) => {
    if (!cmd.trim()) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      appendError('Not connected to terminal');
      return;
    }
    appendOutput(`$ ${cmd}`);
    wsRef.current.send(cmd + '\n');
    historyRef.current.push(cmd);
    historyIndexRef.current = historyRef.current.length;
  }, [appendOutput, appendError]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndexRef.current > 0) {
        historyIndexRef.current -= 1;
        setInput(historyRef.current[historyIndexRef.current] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndexRef.current < historyRef.current.length) {
        historyIndexRef.current += 1;
        setInput(historyRef.current[historyIndexRef.current] || '');
      }
    }
  }, [input, sendCommand]);

  const clearOutput = () => {
    setOutput([]);
  };

  const reconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    setOutput([]);
    setError(null);
    setStatus('connecting');
    setTimeout(connect, 100);
  };

  if (!selectedProjectId) {
    return (
      <div className="space-y-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Terminal</h1>
          <p className="text-slate-500 text-sm mt-1">Interactive sandbox shell.</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 soft-shadow p-8 text-center">
          <TerminalIcon size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Select a project and environment to open a terminal session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Terminal</h1>
          <p className="text-slate-500 text-sm mt-1">
            Interactive shell attached to{' '}
            <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{envName} web container</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            status === 'connected' ? 'bg-emerald-100 text-emerald-700' :
            status === 'connecting' ? 'bg-amber-100 text-amber-700' :
            'bg-slate-100 text-slate-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              status === 'connected' ? 'bg-emerald-500' : status === 'connecting' ? 'bg-amber-500' : 'bg-slate-400'
            }`} />
            {status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </span>
          <button onClick={clearOutput} className="border border-slate-200 rounded-lg h-9 px-3 text-sm font-semibold flex items-center gap-1.5 hover:bg-slate-50">
            <Trash2 size={14} /> Clear
          </button>
          <button onClick={reconnect} className="border border-slate-200 rounded-lg h-9 px-3 text-sm font-semibold flex items-center gap-1.5 hover:bg-slate-50">
            <RefreshCw size={14} /> Reconnect
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-amber-800 text-sm">{error}</div>
            <p className="text-amber-600 text-xs mt-1">
              Ensure the sandbox is running and Docker is available. The terminal connects to the sandbox web container via <code className="bg-amber-100 px-1 rounded">docker compose exec -T web sh</code>.
            </p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto shrink-0 text-amber-500 hover:text-amber-700">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="bg-slate-900 rounded-2xl border border-slate-700 soft-shadow overflow-hidden">
        <div className="h-8 bg-slate-800 flex items-center gap-2 px-3 border-b border-slate-700">
          <span className="w-2.5 h-2.5 bg-red-400 rounded-full" />
          <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full" />
          <span className="w-2.5 h-2.5 bg-green-400 rounded-full" />
          <div className="ml-3 text-[10px] text-slate-400 bg-white/10 rounded px-3 py-0.5 font-mono">
            goneops-terminal@{envName}
          </div>
        </div>

        <div
          className="h-[480px] overflow-y-auto p-4 font-mono text-sm leading-relaxed"
          style={{ backgroundColor: '#0a1628' }}
          onClick={() => inputRef.current?.focus()}
        >
          {output.length === 0 && status !== 'connected' && (
            <div className="flex items-center justify-center h-full text-slate-500">
              {status === 'connecting' ? 'Connecting to sandbox container...' : 'Waiting for connection...'}
            </div>
          )}
          {output.map((line, i) => (
            <div
              key={i}
              className={
                line.type === 'system' ? 'text-slate-500 italic' :
                line.type === 'error' ? 'text-red-400' :
                'text-emerald-300'
              }
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
            >
              {line.text}
            </div>
          ))}
          <div ref={outputEndRef} />
        </div>

        <div className="bg-slate-800 border-t border-slate-700 flex items-center px-4 py-2 gap-2">
          <span className="text-emerald-400 font-mono text-sm shrink-0">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={status !== 'connected'}
            placeholder={status === 'connected' ? 'Type a command and press Enter...' : 'Not connected'}
            className="flex-1 bg-transparent border-none outline-none text-emerald-300 font-mono text-sm placeholder-slate-600"
            autoFocus
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 soft-shadow p-5">
        <h3 className="font-semibold text-slate-700 mb-2">Quick Commands</h3>
        <div className="flex flex-wrap gap-2">
          {['ls -la', 'cat README.md', 'cat package.json', 'node --version', 'npm --version', 'env', 'ps aux', 'netstat -tulpn', 'df -h', 'uptime'].map((cmd) => (
            <button
              key={cmd}
              onClick={() => sendCommand(cmd)}
              disabled={status !== 'connected'}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-mono text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
