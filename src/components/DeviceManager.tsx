/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Laptop, Smartphone, Check, Ban, AlertTriangle, ShieldCheck, 
  User, RefreshCw, Key, ShieldAlert
} from 'lucide-react';
import { Database } from '../dbStore';
import { Device, UserRole } from '../types';

interface DeviceManagerProps {
  currentRole: UserRole;
  currentUsername: string;
  deviceId: string;
  onRefresh: () => void;
}

export default function DeviceManager({ currentRole, currentUsername, deviceId, onRefresh }: DeviceManagerProps) {
  const [devices, setDevices] = useState<Device[]>(() => Database.getDevices());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const reloadDevices = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setDevices(Database.getDevices());
      setIsRefreshing(false);
      onRefresh();
    }, 600);
  };

  const handleUpdateStatus = (id: string, newStatus: 'aprobado' | 'bloqueado' | 'pendiente') => {
    if (currentRole !== 'administrador') {
      setWarningMessage('Permiso Denegado: Solo el Administrador Municipal puede autorizar o inhabilitar dispositivos del sistema.');
      return;
    }

    if (id === deviceId && newStatus !== 'aprobado') {
      setWarningMessage('Operación Inválida: No puede bloquear ni desautorizar su propio dispositivo activo de administración.');
      return;
    }

    const device = devices.find(d => d.id === id);
    if (!device) return;

    Database.updateDeviceStatus(id, newStatus);
    
    // Log the approval action
    Database.logActivity(
      'current_user',
      currentUsername,
      currentRole,
      'Gestión Dispositivo',
      `Estado del dispositivo ID ${id} (${device.name}) cambiado a: ${newStatus.toUpperCase()}.`,
      deviceId,
      newStatus === 'bloqueado' ? 'error' : 'éxito'
    );

    // If a device was blocked or approved, send notification
    if (newStatus === 'bloqueado') {
      Database.addNotification(
        'critica',
        'Terminal Bloqueado por Seguridad',
        `El terminal ID ${id} perteneciente a ${device.ownerName} ha sido bloqueado por el administrador municipal.`,
        true,
        true
      );
    } else if (newStatus === 'aprobado') {
      Database.addNotification(
        'exito',
        'Terminal Autorizado',
        `Se autorizó exitosamente el terminal ID ${id} (${device.name}) para el ingreso seguro de opiniones.`,
        false,
        true
      );
    }

    reloadDevices();
  };

  return (
    <div className="space-y-6" id="device-manager-tab">
      {/* Informative Header card */}
      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex items-start gap-4 flex-wrap sm:flex-nowrap text-gray-900 dark:text-zinc-100">
        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-500 rounded-2xl flex items-center justify-center shrink-0">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-gray-950 tracking-tight">Soberanía Tecnológica y Control de Dispositivos</h2>
          <p className="text-gray-500 dark:text-zinc-400 text-xs leading-relaxed">
            De acuerdo con los protocolos estatales de protección de datos, únicamente las opiniones registradas desde dispositivos autorizados por el administrador municipal se consolidarán en los tabuladores oficiales. Los terminales pendientes o bloqueados verán el acceso restringido.
          </p>
        </div>
      </div>

      {/* Current Device Highlight card */}
      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center justify-between flex-wrap gap-4 text-gray-900 dark:text-zinc-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-rose-600 dark:text-rose-500 rounded-xl flex items-center justify-center">
            <Smartphone className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono uppercase tracking-wider font-bold">Su Dispositivo Actual:</span>
            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 font-mono">{deviceId}</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Operado por: <span className="text-gray-800 dark:text-zinc-200 font-semibold">{currentUsername} ({currentRole})</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/50 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" />
            VINCULADO Y AUTORIZADO
          </span>
          <button
            onClick={reloadDevices}
            disabled={isRefreshing}
            className="p-2 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 hover:border-gray-400 rounded-xl text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:text-zinc-200 transition-all disabled:opacity-50 cursor-pointer"
            title="Recargar lista de dispositivos"
            id="btn-refresh-devices"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Devices List Table */}
      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden text-gray-900 dark:text-zinc-100" id="devices-list-section">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Registro General de Terminales Habilitados</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Gestione las credenciales de dispositivos de activistas y compiladores</p>
          </div>
          <span className="text-xs font-mono font-bold text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 border border-rose-200 dark:border-rose-900/50 rounded-lg">
            {devices.length} Terminales en Archivo
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 text-[10.5px] uppercase tracking-wider font-mono font-bold">
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">ID de Hardware</th>
                <th className="py-3.5 px-4">Etiqueta Dispositivo</th>
                <th className="py-3.5 px-4">Operador Asignado</th>
                <th className="py-3.5 px-4">Rol PCC</th>
                <th className="py-3.5 px-4">Última Actividad</th>
                <th className="py-3.5 px-4">Estado Seguridad</th>
                <th className="py-3.5 px-4 text-center">Acciones de Oficio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {devices.map(device => {
                const isCurrent = (device.id === deviceId);
                return (
                  <tr key={device.id} className={`hover:bg-gray-50 dark:bg-zinc-900 text-xs text-gray-750 transition-colors ${isCurrent ? 'bg-rose-50/40' : ''}`}>
                    <td className="py-3.5 px-4">
                      {device.id.includes('PC') || device.id.includes('DESKTOP') ? (
                        <Laptop className="w-4 h-4 text-rose-600 dark:text-rose-500" />
                      ) : (
                        <Smartphone className="w-4 h-4 text-blue-600" />
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900 dark:text-zinc-100">
                      <span>{device.id}</span>
                      {isCurrent && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-[8.5px] bg-rose-600 text-white rounded font-sans uppercase">Actual</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-gray-900 dark:text-zinc-100">{device.name}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-gray-800 dark:text-zinc-200">
                        <User className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                        <span>{device.ownerName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-mono uppercase bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-gray-250 dark:border-zinc-700 text-gray-800 dark:text-zinc-200">
                        {device.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 dark:text-zinc-400 font-mono">
                      {device.lastUsed}
                    </td>
                    <td className="py-3.5 px-4">
                      {device.status === 'aprobado' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/50 uppercase">Autorizado</span>
                      )}
                      {device.status === 'pendiente' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 uppercase">Pendiente</span>
                      )}
                      {device.status === 'bloqueado' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/30 text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 uppercase">Bloqueado</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {device.status !== 'aprobado' && (
                          <button
                            onClick={() => handleUpdateStatus(device.id, 'aprobado')}
                            disabled={currentRole !== 'administrador' || isCurrent}
                            className="p-1.5 text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 bg-white dark:bg-zinc-950 hover:bg-emerald-50 dark:bg-emerald-950/30 border border-gray-300 dark:border-zinc-700 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                            title="Aprobar / Autorizar dispositivo"
                            id={`btn-approve-device-${device.id}`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {device.status !== 'bloqueado' && (
                          <button
                            onClick={() => handleUpdateStatus(device.id, 'bloqueado')}
                            disabled={currentRole !== 'administrador' || isCurrent}
                            className="p-1.5 text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 hover:text-rose-900 bg-white dark:bg-zinc-950 hover:bg-rose-50 dark:bg-rose-950/30 border border-gray-300 dark:border-zinc-700 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                            title="Bloquear / Denegar dispositivo"
                            id={`btn-block-device-${device.id}`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {device.status === 'bloqueado' && (
                          <button
                            onClick={() => handleUpdateStatus(device.id, 'pendiente')}
                            disabled={currentRole !== 'administrador' || isCurrent}
                            className="p-1.5 text-amber-700 dark:text-amber-400 hover:text-amber-900 bg-white dark:bg-zinc-950 hover:bg-amber-50 dark:bg-amber-950/30 border border-gray-300 dark:border-zinc-700 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                            title="Desbloquear y pasar a pendiente"
                            id={`btn-pending-device-${device.id}`}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom In-App Modal: Warning message */}
      {warningMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm text-left">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-gray-900">
            <h3 className="text-sm font-bold text-gray-950 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>Operación Inválida</span>
            </h3>
            <p className="text-xs text-gray-650 mt-2.5">
              {warningMessage}
            </p>
            <div className="flex items-center justify-end mt-4">
              <button
                onClick={() => setWarningMessage(null)}
                className="px-4 py-1.5 text-xs text-white bg-gray-800 hover:bg-gray-900 font-bold rounded-lg transition-colors cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
