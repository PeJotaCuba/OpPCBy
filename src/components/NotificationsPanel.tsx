/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Bell, Mail, Send, Radio, MessageSquareCode, CheckCircle, 
  AlertCircle, ShieldAlert, Eye, RefreshCw
} from 'lucide-react';
import { Database } from '../dbStore';
import { AppNotification, UserRole } from '../types';

interface NotificationsPanelProps {
  currentRole: UserRole;
  currentUsername: string;
  onRefreshBadge: () => void;
}

export default function NotificationsPanel({ currentRole, currentUsername, onRefreshBadge }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => Database.getNotifications());
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'critica' | 'informacion' | 'exito'>('informacion');
  
  // Channels
  const [sendEmail, setSendEmail] = useState(true);
  const [sendToDus, setSendToDus] = useState(true);

  const [isSending, setIsSending] = useState(false);
  const [successStatus, setSuccessStatus] = useState('');

  const reloadNotifications = () => {
    setNotifications(Database.getNotifications());
    onRefreshBadge();
  };

  const handleMarkAllRead = () => {
    Database.markAllNotificationsAsRead();
    reloadNotifications();
  };

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert('Por favor, redacte el título y mensaje de la alerta.');
      return;
    }

    setIsSending(true);
    setSuccessStatus('');

    // Simulate network delivery to Cuban ToDus and Email servers
    setTimeout(() => {
      // Write to Database
      const newNot = Database.addNotification(
        type,
        title.trim(),
        message.trim(),
        sendEmail,
        sendToDus
      );

      // Audit activity
      Database.logActivity(
        'current_user',
        currentUsername,
        currentRole,
        'Despacho Alerta',
        `Nueva alerta crítica despachada. Título: ${title.trim()}. Canales: ${sendEmail ? 'Email' : ''} ${sendToDus ? 'ToDus App' : ''}`,
        localStorage.getItem('pcc_device_id') || 'DEV_UNKNOWN'
      );

      setIsSending(false);
      setSuccessStatus(`¡Alerta despachada correctamente! Canales enlazados: ${sendEmail ? '📧 Email' : ''} ${sendToDus ? '💬 ToDus Cubana' : ''}.`);
      
      // Clear fields
      setTitle('');
      setMessage('');
      
      // Reload lists
      reloadNotifications();

      setTimeout(() => {
        setSuccessStatus('');
      }, 4000);

    }, 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans" id="notifications-panel-tab">
      
      {/* Left side: Received Notifications Feed (Spans 7) */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Bell className="w-4.5 h-4.5 text-rose-500 animate-swing" />
              <span>Bandeja de Alertas del Sistema</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllRead}
                className="px-2.5 py-1 text-[10.5px] bg-zinc-950 border border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors"
                id="btn-mark-all-read"
              >
                Marcar leídos
              </button>
              <button
                onClick={reloadNotifications}
                className="p-1.5 bg-zinc-950 border border-zinc-850 text-zinc-400 hover:text-white rounded-lg transition-colors"
                title="Recargar bandeja"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-xs flex flex-col items-center justify-center gap-2">
                <CheckCircle className="w-8 h-8 text-zinc-700" />
                <span>No existen notificaciones activas en este momento.</span>
              </div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  className={`p-4 rounded-xl border transition-all relative ${n.read ? 'bg-zinc-950/40 border-zinc-900/60' : 'bg-zinc-950/90 border-zinc-800 shadow-md'}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon status */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${n.type === 'critica' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : n.type === 'exito' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                      {n.type === 'critica' ? (
                        <ShieldAlert className="w-4.5 h-4.5" />
                      ) : (
                        <Radio className="w-4.5 h-4.5" />
                      )}
                    </div>

                    <div className="space-y-1 flex-1 pr-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-zinc-100">{n.title}</span>
                        {!n.read && (
                          <span className="px-1.5 py-0.5 text-[8px] font-extrabold bg-rose-600 text-white rounded uppercase font-mono tracking-wider">Nuevo</span>
                        )}
                      </div>
                      <p className="text-zinc-300 text-xs leading-relaxed">{n.message}</p>
                      <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-3 pt-1">
                        <span>{n.timestamp.substring(11, 16)} • {n.timestamp.substring(0, 10)}</span>
                        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[8.5px]">
                          {n.sentToEmail && <span className="text-zinc-400">📧 Enviado Email</span>}
                          {n.sentToToDus && <span className="text-rose-400">💬 Enviado ToDus</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right side: New Alerts Dispatcher (Spans 5) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
              <Send className="w-4.5 h-4.5 text-rose-500" />
              <span>Despachador de Alertas Críticas</span>
            </h3>
            <p className="text-zinc-500 text-xs mt-1">Sincronización simultánea en la web y canales externos</p>
          </div>

          {currentRole === 'activista' ? (
            <div className="p-4 bg-zinc-950/60 border border-zinc-850 text-xs text-zinc-400 leading-relaxed rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p>
                <strong>Privilegios Insuficientes:</strong> Los activistas municipales no disponen de autorizaciones estatales para emitir boletines ni despachar alertas críticas al canal masivo de ToDus ni por correo. Utilice el registro de opiniones para notificar quejas prioritarias.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendNotification} className="space-y-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nivel de Alerta</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('informacion')}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-colors ${type === 'informacion' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-zinc-950 border-zinc-850 text-zinc-500'}`}
                  >
                    Informativo
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('exito')}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-colors ${type === 'exito' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-850 text-zinc-500'}`}
                  >
                    Solucionado
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('critica')}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-colors ${type === 'critica' ? 'bg-rose-500/10 border-rose-500 text-rose-400' : 'bg-zinc-950 border-zinc-850 text-zinc-500'}`}
                  >
                    Alerta Crítica
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Título del Boletín / Alerta</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ej. Afectación Abasto de Agua Aeropuerto Viejo"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500/50 rounded-xl py-2 px-3.5 text-xs text-white focus:outline-none placeholder-zinc-650"
                  id="notif-dispatch-title"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Mensaje Corto</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Redacte la síntesis de la problemática de forma clara y objetiva para conocimiento de la estructura municipal del partido..."
                  rows={4}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500/50 rounded-xl p-3 text-xs text-white focus:outline-none placeholder-zinc-650"
                  id="notif-dispatch-message"
                />
              </div>

              {/* Channels checkboxes */}
              <div className="space-y-2 pt-2 border-t border-zinc-850">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Canales de Comunicación Externa:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="accent-rose-600 rounded"
                    />
                    <span>Correo del Partido (@pcc.cu)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={sendToDus}
                      onChange={(e) => setSendToDus(e.target.checked)}
                      className="accent-rose-600 rounded"
                    />
                    <span>Red ToDus Cubana</span>
                  </label>
                </div>
              </div>

              {/* Status dispatching banner */}
              {isSending && (
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center gap-2 text-xs text-rose-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="font-mono">Estableciendo túnel de comunicaciones encriptado...</span>
                </div>
              )}

              {successStatus && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                  {successStatus}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSending || !title.trim() || !message.trim()}
                className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-xs transition-colors shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                id="btn-dispatch-alert"
              >
                <span>Despachar Alerta General</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>

        {/* Informative Cuban Platform details */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-2">
          <h4 className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <MessageSquareCode className="w-4 h-4 text-rose-500" />
            <span>Infraestructura ToDus</span>
          </h4>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            La mensajería <strong>ToDus</strong> opera sobre la red nacional de telecomunicaciones de ETECSA de forma local. Este despachador automatiza el enlace seguro enviando paquetes a través de los nodos municipales mediante certificados locales para resguardar la privacidad del pueblo cubano.
          </p>
        </div>
      </div>
      
    </div>
  );
}
