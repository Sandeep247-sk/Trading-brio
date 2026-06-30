"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ScrollText,
  ArrowLeft,
  Filter,
  Clock,
  User,
  Shield,
  Target,
  BarChart3,
  Trash2,
  Download,
  LogIn,
  LogOut,
  Search,
  ChevronDown,
  Activity,
} from "lucide-react";
import Link from "next/link";

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  CREATE: <Target className="h-3.5 w-3.5" />,
  UPDATE: <Activity className="h-3.5 w-3.5" />,
  DELETE: <Trash2 className="h-3.5 w-3.5" />,
  LOGIN: <LogIn className="h-3.5 w-3.5" />,
  LOGOUT: <LogOut className="h-3.5 w-3.5" />,
  EXPORT: <Download className="h-3.5 w-3.5" />,
  ANALYZE: <BarChart3 className="h-3.5 w-3.5" />,
};

const actionColors: Record<string, string> = {
  CREATE: "bg-emerald-950/30 text-emerald-400 border-emerald-800/30",
  UPDATE: "bg-blue-950/30 text-blue-400 border-blue-800/30",
  DELETE: "bg-red-950/30 text-red-400 border-red-800/30",
  LOGIN: "bg-purple-950/30 text-purple-400 border-purple-800/30",
  LOGOUT: "bg-muted text-muted-foreground border-border/30",
  EXPORT: "bg-cyan-950/30 text-cyan-400 border-cyan-800/30",
  ANALYZE: "bg-amber-950/30 text-amber-400 border-amber-800/30",
};

export function AuditLogClient() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      console.error("Failed to fetch audit logs");
    }
    setLoading(false);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchesAction = actionFilter === "ALL" || l.action === actionFilter;
      const matchesEntity = entityFilter === "ALL" || l.entity === entityFilter;
      const matchesSearch =
        !searchQuery ||
        l.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.entityId && l.entityId.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesAction && matchesEntity && matchesSearch;
    });
  }, [logs, actionFilter, entityFilter, searchQuery]);

  const entities = useMemo(() => {
    const set = new Set(logs.map((l) => l.entity));
    return Array.from(set);
  }, [logs]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="h-8 w-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Audit Log
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono uppercase">
              {logs.length} total entries
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 rounded-lg flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search entities, actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-card border border-border rounded text-sm text-foreground/80 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-10 px-3 bg-card border border-border rounded text-xs text-foreground/80 focus:outline-none focus:border-blue-500 font-semibold"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="EXPORT">Export</option>
              <option value="ANALYZE">Analyze</option>
            </select>
          </div>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="h-10 px-3 bg-card border border-border rounded text-xs text-foreground/80 focus:outline-none focus:border-blue-500 font-semibold"
          >
            <option value="ALL">All Entities</option>
            {entities.map((e) => (
              <option key={e} value={e}>
                {e.charAt(0).toUpperCase() + e.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="glass-card p-12 rounded-lg flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Activity className="h-4 w-4 animate-pulse" />
            Loading audit logs...
          </div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-card p-12 rounded-lg text-center space-y-3">
          <ScrollText className="h-10 w-10 text-muted-foreground/50 mx-auto" />
          <p className="text-sm text-muted-foreground">No audit log entries found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => {
            const isExpanded = expandedId === log.id;
            return (
              <div
                key={log.id}
                className="glass-card rounded-lg overflow-hidden hover:border-gray-750 transition"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="w-full p-4 flex items-center gap-4 text-left"
                >
                  {/* Timeline dot */}
                  <div className={`h-8 w-8 shrink-0 rounded-lg border flex items-center justify-center ${actionColors[log.action] || "bg-muted text-muted-foreground border-border"}`}>
                    {actionIcons[log.action] || <Activity className="h-3.5 w-3.5" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${actionColors[log.action] || "bg-muted text-muted-foreground border-border"}`}>
                        {log.action}
                      </span>
                      <span className="text-xs font-semibold text-foreground/80 capitalize">
                        {log.entity}
                      </span>
                      {log.entityId && (
                        <span className="text-[10px] font-mono text-muted-foreground/60 truncate max-w-[120px]">
                          {log.entityId.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono shrink-0">
                    <Clock className="h-3 w-3" />
                    {new Date(log.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  {/* Expand indicator */}
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground/60 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Expanded details */}
                {isExpanded && log.details && (
                  <div className="px-4 pb-4 pt-0 border-t border-border/50">
                    <pre className="text-[10px] text-muted-foreground bg-card rounded p-3 overflow-x-auto font-mono">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
