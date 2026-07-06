/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database } from '../dbStore';
import { Database as DbIcon, Terminal, Play, Info, CheckCircle, AlertOctagon } from 'lucide-react';

export default function SQLConsole() {
  const [query, setQuery] = useState('SELECT * FROM opiniones WHERE sentiment = \'negativo\' LIMIT 5');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTable, setActiveTable] = useState<'usuarios' | 'opiniones' | 'dispositivos' | 'auditoria'>('opiniones');

  const handleExecute = (customQuery?: string) => {
    setError(null);
    const targetQuery = customQuery || query;
    try {
      const result = Database.executeQuery(targetQuery);
      if (result.error) {
        setError(result.error);
        setColumns([]);
        setRows([]);
      } else {
        setColumns(result.columns);
        setRows(result.rows);
      }
    } catch (e) {
      setError('Error de Sintaxis SQL: Compruebe las comillas y la estructura del SELECT.');
      setColumns([]);
      setRows([]);
    }
  };

  // Preset query buttons
  const presets = [
    {
      label: 'Listar Todos los Usuarios',
      sql: 'SELECT * FROM usuarios'
    },
    {
      label: 'Dispositivos Autorizados',
      sql: 'SELECT * FROM dispositivos WHERE status = \'aprobado\''
    },
    {
      label: 'Opiniones Críticas (Preocupaciones)',
      sql: 'SELECT * FROM opiniones WHERE sentiment = \'negativo\' LIMIT 10'
    },
    {
      label: 'Últimos Logs de Auditoría',
      sql: 'SELECT * FROM auditoria LIMIT 15'
    }
  ];

  return (
    <div className="space-y-6" id="sql-console-tab">
      {/* Introduction Card */}
      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex items-start gap-4 flex-wrap sm:flex-nowrap text-gray-900 dark:text-zinc-100">
        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
          <DbIcon className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-gray-950 tracking-tight">Consola Relacional SQL Local (Soberana)</h2>
          <p className="text-gray-500 dark:text-zinc-400 text-xs leading-relaxed">
            Este módulo integra un motor SQL local interactivo de consulta directa. Ofrece a los oficiales de auditoría del PCC la capacidad de validar y extraer datos mediante sentencias SQL estandarizadas, manteniendo la privacidad absoluta de los datos de la población al ejecutarse enteramente en el terminal de su navegador.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Console & Presets (Spans 8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4 text-gray-900 dark:text-zinc-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                <Terminal className="w-4 h-4 text-rose-600 dark:text-rose-500 animate-pulse" />
                <span>Consola Interactiva SQL</span>
              </h3>
              <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">Dialecto SQLite local</span>
            </div>

            {/* Input area */}
            <div className="relative font-mono">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SELECT * FROM opiniones WHERE sentiment = 'negativo' LIMIT 5"
                rows={3}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-250 dark:border-zinc-700 focus:border-rose-600/50 rounded-xl p-4 text-xs text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 font-semibold leading-relaxed focus:outline-none focus:bg-white dark:bg-zinc-950 transition-colors"
                id="sql-query-input"
              />
              <button
                type="button"
                onClick={() => handleExecute()}
                className="absolute right-3.5 bottom-3.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                id="btn-execute-sql"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Ejecutar Query</span>
              </button>
            </div>

            {/* Preset Query Buttons */}
            <div>
              <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono uppercase tracking-wider block mb-2 font-bold">Consultas Rápidas de Auditoría:</span>
              <div className="flex flex-wrap gap-2">
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { setQuery(p.sql); handleExecute(p.sql); }}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:text-gray-950 rounded-xl text-xs transition-colors text-left cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results table output */}
          <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden min-h-[220px] text-gray-900 dark:text-zinc-100">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 dark:text-zinc-300 font-mono">Resultados de Consulta SQL</span>
              {rows.length > 0 && (
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-bold bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-150 dark:border-emerald-900/50">
                  {rows.length} Filas Retornadas
                </span>
              )}
            </div>

            {error ? (
              <div className="p-8 text-center text-rose-600 dark:text-rose-500 text-xs flex flex-col items-center justify-center gap-1.5">
                <AlertOctagon className="w-6 h-6 text-rose-600 dark:text-rose-500" />
                <span className="font-mono">{error}</span>
              </div>
            ) : columns.length === 0 ? (
              <div className="p-12 text-center text-gray-400 dark:text-zinc-500 text-xs flex flex-col items-center justify-center gap-1.5">
                <Info className="w-5 h-5 text-gray-300" />
                <span>Escriba o seleccione una consulta SQL arriba y pulse Ejecutar.</span>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 text-[10px] uppercase tracking-wider font-mono font-bold">
                      {columns.map(col => (
                        <th key={col} className="py-2.5 px-4 border-r border-gray-200 dark:border-zinc-800 last:border-0">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:bg-zinc-900 text-xs text-gray-800 dark:text-zinc-200 font-mono transition-colors">
                        {columns.map(col => (
                          <td key={col} className="py-2.5 px-4 border-r border-gray-150 last:border-0 truncate max-w-xs" title={String(row[col])}>
                            {String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Schema Inspector (Spans 4) */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4 text-gray-900 dark:text-zinc-100">
          <h3 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest font-mono">Inspector de Esquemas</h3>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 leading-relaxed font-mono">
            La base de datos relacional del sistema cuenta con las siguientes tablas oficiales de control:
          </p>

          <div className="space-y-3">
            {/* Table 1 */}
            <div className="border border-gray-200 dark:border-zinc-800 rounded-xl p-3 bg-gray-50 dark:bg-zinc-900/50">
              <div className="text-xs font-bold text-gray-900 dark:text-zinc-100 font-mono">opiniones</div>
              <div className="text-[10px] text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Almacena las valoraciones y quejas registradas. <br />
                <strong>Columnas:</strong> <code className="text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 font-semibold">id, code, text, sector, date, consejoPopular, deviceId, sentiment</code>
              </div>
            </div>

            {/* Table 2 */}
            <div className="border border-gray-200 dark:border-zinc-800 rounded-xl p-3 bg-gray-50 dark:bg-zinc-900/50">
              <div className="text-xs font-bold text-gray-900 dark:text-zinc-100 font-mono">usuarios</div>
              <div className="text-[10px] text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Personal habilitado y encriptado. <br />
                <strong>Columnas:</strong> <code className="text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 font-semibold">id, username, fullName, role, deviceId, approvedDevice, twoFactorEnabled</code>
              </div>
            </div>

            {/* Table 3 */}
            <div className="border border-gray-200 dark:border-zinc-800 rounded-xl p-3 bg-gray-50 dark:bg-zinc-900/50">
              <div className="text-xs font-bold text-gray-900 dark:text-zinc-100 font-mono">dispositivos</div>
              <div className="text-[10px] text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Terminales móviles y de cómputo auditados. <br />
                <strong>Columnas:</strong> <code className="text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 font-semibold">id, name, ownerName, role, status, lastUsed</code>
              </div>
            </div>

            {/* Table 4 */}
            <div className="border border-gray-200 dark:border-zinc-800 rounded-xl p-3 bg-gray-50 dark:bg-zinc-900/50">
              <div className="text-xs font-bold text-gray-900 dark:text-zinc-100 font-mono">auditoria (logs)</div>
              <div className="text-[10px] text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Bitácora estatal inalterable de seguridad. <br />
                <strong>Columnas:</strong> <code className="text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 font-semibold">id, timestamp, userFullName, action, details, status</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
