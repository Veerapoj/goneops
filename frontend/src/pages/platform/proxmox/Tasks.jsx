import { useState, useEffect, useCallback } from 'react';
import { ListChecks, AlertTriangle, Loader2, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { fetchTasks, listApprovals, approveRequest, rejectRequest } from '../../../api/client';

export default function ProxmoxTasks() {
  const [tasks, setTasks] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [acting, setActing] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [taskData, approvalData] = await Promise.all([
        fetchTasks(200),
        listApprovals(),
      ]);
      setTasks(Array.isArray(taskData) ? taskData : []);
      setApprovals(Array.isArray(approvalData) ? approvalData : []);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleApprove(id) {
    setActing({ id, action: 'approve' });
    try {
      await approveRequest(id);
      await loadData();
    } catch (e) {
      alert('Approval failed: ' + (e.response?.data?.error?.message || e.message));
    } finally {
      setActing(null);
    }
  }

  async function handleReject(id) {
    setActing({ id, action: 'reject' });
    try {
      await rejectRequest(id);
      await loadData();
    } catch (e) {
      alert('Reject failed: ' + (e.response?.data?.error?.message || e.message));
    } finally {
      setActing(null);
    }
  }

  function statusBadge(status) {
    switch (status) {
      case 'running':
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600"><Clock size={12} /> running</span>;
      case 'OK':
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 size={12} /> OK</span>;
      case 'error':
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600"><XCircle size={12} /> error</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600"><Clock size={12} /> pending</span>;
      case 'approved':
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 size={12} /> approved</span>;
      case 'executed':
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600"><CheckCircle2 size={12} /> executed</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600"><XCircle size={12} /> rejected</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600"><XCircle size={12} /> failed</span>;
      default:
        return <span className="text-xs text-slate-600">{status}</span>;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-slate-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle size={28} className="text-red-400" />
        <p className="text-slate-600 text-sm">{error}</p>
        <button onClick={loadData} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition-colors">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-800">Tasks & Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">Proxmox async task history and pending approval requests</p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 flex items-center gap-1.5"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'tasks' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Tasks ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'approvals' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Approvals {approvals.filter((a) => a.status === 'pending').length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
              {approvals.filter((a) => a.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'tasks' && (
        tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <ListChecks size={28} className="text-slate-300" />
            <p className="text-slate-500 text-sm">No tasks recorded yet.</p>
            <p className="text-slate-400 text-xs">Tasks appear when you start/stop/reboot/clone/snapshot VMs.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden soft-shadow">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">UPID</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">VMID</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Node</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Exit</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-sm text-slate-600 font-mono truncate max-w-[200px]" title={task.upid}>
                      {task.upid ? task.upid.slice(0, 40) + '...' : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700 capitalize">{task.action ? task.action.replace(/_/g, ' ') : '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{task.vmid || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{task.node || '-'}</td>
                    <td className="py-3 px-4">{statusBadge(task.status)}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{task.exit_status || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-500">{task.created_at ? new Date(task.created_at).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {activeTab === 'approvals' && (
        approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <ListChecks size={28} className="text-slate-300" />
            <p className="text-slate-500 text-sm">No approval requests.</p>
            <p className="text-slate-400 text-xs">Approval requests appear when operators request clone or rollback actions.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden soft-shadow">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Requested By</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Resource</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((ar) => (
                  <tr key={ar.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-sm text-slate-600">#{ar.id}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{ar.requested_by || 'system'}</td>
                    <td className="py-3 px-4 text-sm text-slate-700 capitalize">{ar.action ? ar.action.replace(/_/g, ' ') : '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{ar.resource_type} #{ar.resource_id}</td>
                    <td className="py-3 px-4">{statusBadge(ar.status)}</td>
                    <td className="py-3 px-4 text-sm text-slate-500">{ar.created_at ? new Date(ar.created_at).toLocaleString() : '-'}</td>
                    <td className="py-3 px-4">
                      {ar.status === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleApprove(ar.id)}
                            disabled={acting !== null}
                            className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            {acting?.id === ar.id && acting?.action === 'approve' ? <Loader2 size={10} className="animate-spin" /> : null}
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(ar.id)}
                            disabled={acting !== null}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            {acting?.id === ar.id && acting?.action === 'reject' ? <Loader2 size={10} className="animate-spin" /> : null}
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
