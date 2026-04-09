'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Loader2 } from 'lucide-react';
import { auditLogsApi } from '@/lib/api';
import { AuditLog } from '@/types';
import { formatDateTime } from '@/lib/formatters';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => auditLogsApi.list({ page, limit: 50 }),
  });

  const logs: AuditLog[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Auditoria ({total})</h2>
        <p className="text-sm text-gray-500">Registro de todas as ações realizadas no painel.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#C9A4A0] mx-auto" /></div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum registro de auditoria ainda.</p>
            <p className="text-xs text-gray-400 mt-1">Os logs aparecem quando admins fazem alterações via painel.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ação</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entidade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">IP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-gray-800">{l.adminEmail}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{l.action}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{l.entityType ? `${l.entityType}/${l.entityId?.slice(0,8)}…` : '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{l.ipAddress ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/60">
            <p className="text-xs text-gray-500">{total} registros</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7 px-3 border border-gray-200 rounded text-xs disabled:opacity-40">← Anterior</button>
              <span className="h-7 px-3 flex items-center text-xs">{page}/{totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-7 px-3 border border-gray-200 rounded text-xs disabled:opacity-40">Próxima →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
