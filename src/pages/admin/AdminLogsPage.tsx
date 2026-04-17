import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { listLogs, type OperationLog } from '@/lib/api';

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getActionTone(action: string) {
  if (action === 'delete') return 'bg-rose-100 text-rose-700';
  if (action === 'create' || action === 'upload' || action === 'publish' || action === 'start') {
    return 'bg-emerald-100 text-emerald-700';
  }
  return 'bg-slate-100 text-slate-700';
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await listLogs();
        setLogs(data);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const filteredLogs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return logs;

    return logs.filter((entry) => {
      const metadata = entry.metadata ? JSON.stringify(entry.metadata).toLowerCase() : '';
      return (
        entry.action.toLowerCase().includes(needle) ||
        entry.entity.toLowerCase().includes(needle) ||
        entry.message.toLowerCase().includes(needle) ||
        entry.actorName.toLowerCase().includes(needle) ||
        metadata.includes(needle)
      );
    });
  }, [logs, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">System Logs</h1>
        <p className="text-gray-500">Track operations happening across the whole infrastructure from one admin view.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Activity Stream</CardTitle>
            <CardDescription>Includes authentication, scheduling, attendance, materials, finance, and academic operations.</CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
              placeholder="Search logs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
              Loading logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
              No log entries match the current filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getActionTone(entry.action)}`}>
                          {entry.action}
                        </span>
                        <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                          {entry.entity}
                        </span>
                      </div>
                      <p className="mt-2 font-medium text-gray-900">{entry.message}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {entry.actorName} • {entry.actorRole}
                      </p>
                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {Object.entries(entry.metadata).map(([key, value]) => (
                            <span key={key} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Activity className="h-4 w-4" />
                      {formatDateTime(entry.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
