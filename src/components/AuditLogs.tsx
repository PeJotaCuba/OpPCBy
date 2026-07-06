/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  History, Search, ShieldCheck, AlertTriangle, XCircle, 
  Trash2, RefreshCw, Filter, ShieldAlert, FileOutput
} from 'lucide-react';
import { Database } from '../dbStore';
import { ActivityLog, UserRole } from '../types';

interface AuditLogsProps {
  currentRole: UserRole;
  currentUsername: string;
}

export default function AuditLogs({ currentRole, currentUsername }: AuditLogsProps) {
  const [logs, setLogs] = useState<ActivityLog[]>(() => Database.getLogs());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Custom in-app warning/confirmation states
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  
  const reloadLogs = () => {
    setLogs(Database.getLogs());
  };

  const handleClearLogs = () => {
    if (currentRole !== 'administrador') {
      setWarningMessage('Permiso Denegado: Únicamente el Administrador Municipal cuenta con facultades para depurar los registros de auditoría estatal.');
      return;
    }
    setShowClearConfirm(true);
  };

  const confirmClearLogs = () => {
    Database.clearLogs();
    Database.logActivity(
      'current_user',
      currentUsername,
      currentRole,
      'Depurar Auditoría',
      'El administrador municipal ejecutó un borrado completo del registro de auditorías.',
      localStorage.getItem('pcc_device_id') || 'DEV_UNKNOWN',
      'advertencia'
    );
    reloadLogs();
    setShowClearConfirm(false);
  };

  // Filter logs logic
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = search === '' || 
        log.userFullName.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.details.toLowerCase().includes(search.toLowerCase()) ||
        log.deviceId.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === '' || log.status === statusFilter;
      const matchesRole = roleFilter === '' || log.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [logs, search, statusFilter, roleFilter]);

  return (
    <div className="space-y-6" id="audit-logs-tab">
      {/* Search & filters panel */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4" id="audit-filters-panel">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <h2 className="text-base font-bold text-white tracking-tight">Filtros de Auditoría Gubernamental</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={reloadLogs}
              className="px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recargar Historial
            </button>
            {currentRole === 'administrador' && (
              <button
                onClick={handleClearLogs}
                className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Vaciar Registro Auditado
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Text Search */}
          <div className="relative">
            <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Buscar en Registro</label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Usuario, acción, dispositivo..."
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500/50 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none placeholder-zinc-650 transition-colors"
                id="audit-search"
              />
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
            </div>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Nivel de Alerta</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500/50 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition-colors cursor-pointer"
              id="audit-status"
            >
              <option value="">-- Todos los Niveles --</option>
              <option value="éxito">Exitosos (Información)</option>
              <option value="advertencia">Advertencias / Bloqueos</option>
              <option value="error">Errores Críticos / Rechazo 2FA</option>
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Cargo Operador</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500/50 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition-colors cursor-pointer"
              id="audit-role"
            >
              <option value="">-- Todos los Roles --</option>
              <option value="administrador">Administradores</option>
              <option value="compilador">Compiladores</option>
              <option value="activista">Activistas</option>
              <option value="sistema">Sistema Automático</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Logs List Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden" id="audit-logs-section">
        <div className="px-6 py-5 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <History className="w-5 h-5 text-rose-500" />
              <span>Bitácora de Seguridad del Estado (Auditoría Continua)</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Registro cronológico inalterable de operaciones locales</p>
          </div>
          <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/5 px-2.5 py-1 border border-rose-500/15 rounded-lg">
            {filteredLogs.length} Registros de Actividad
          </span>
        </div>

        <div className="overflow-x-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-xs flex flex-col items-center justify-center gap-2">
              <ShieldCheck className="w-8 h-8 text-zinc-600 animate-pulse" />
              <span>No se encontraron incidencias en los registros de auditoría bajo estos filtros.</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 text-[10.5px] uppercase tracking-wider font-mono font-bold">
                  <th className="py-3.5 px-4">Estampa Temporal</th>
                  <th className="py-3.5 px-4">Nivel Alerta</th>
                  <th className="py-3.5 px-4">Acción Realizada</th>
                  <th className="py-3.5 px-4">Operador PCC</th>
                  <th className="py-3.5 px-4">Cargo / Rol</th>
                  <th className="py-3.5 px-6 w-1/3">Detalles de Operación</th>
                  <th className="py-3.5 px-4">Dispositivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-zinc-800/20 text-xs text-zinc-350 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-zinc-450">
                      {log.timestamp.replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="py-3.5 px-4">
                      {log.status === 'éxito' && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider font-mono flex items-center gap-1 w-max">
                          <ShieldCheck className="w-3 h-3" /> Éxito
                        </span>
                      )}
                      {log.status === 'advertencia' && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider font-mono flex items-center gap-1 w-max">
                          <AlertTriangle className="w-3 h-3" /> Alerta
                        </span>
                      )}
                      {log.status === 'error' && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider font-mono flex items-center gap-1 w-max">
                          <XCircle className="w-3 h-3" /> Rechazo
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-zinc-150">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-200">
                      {log.userFullName}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-mono uppercase bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 text-zinc-400">
                        {log.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 leading-relaxed font-sans text-zinc-300">
                      {log.details}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-400">
                      {log.deviceId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Custom In-App Modal: Clear Audit Logs Confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm text-left">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500 animate-pulse" />
              <span>Confirmar Depuración Permanente</span>
            </h3>
            <p className="text-xs text-zinc-300 mt-2.5">
              ¿Está absolutamente seguro de borrar permanentemente el historial de auditoría?
            </p>
            <p className="text-[11px] text-rose-400 mt-1.5 italic bg-rose-500/5 px-2.5 py-1.5 border border-rose-500/10 rounded-lg">
              Esta acción es irreversible y se grabará un registro base del sistema sobre esta depuración.
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-950 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmClearLogs}
                className="px-3.5 py-1.5 text-xs text-white bg-rose-650 hover:bg-rose-700 font-bold rounded-lg transition-colors border border-rose-700 cursor-pointer"
              >
                Depurar Todo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom In-App Modal: Warning message */}
      {warningMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm text-left">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>Operación Denegada</span>
            </h3>
            <p className="text-xs text-zinc-300 mt-2.5">
              {warningMessage}
            </p>
            <div className="flex items-center justify-end mt-4">
              <button
                onClick={() => setWarningMessage(null)}
                className="px-4 py-1.5 text-xs text-white bg-zinc-850 hover:bg-zinc-800 font-bold rounded-lg border border-zinc-800 transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
