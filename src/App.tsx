/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, PlusCircle, Smartphone, History, Terminal, 
  LogOut, User as UserIcon, Shield, Sparkles, Lock, ShieldCheck, RefreshCw, Info,
  Users, Download, UserCircle, Menu, X
} from 'lucide-react';
import { Database } from './dbStore';
import { User, UserRole } from './types';

// Component imports
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import OpinionForm from './components/OpinionForm';
import DeviceManager from './components/DeviceManager';
import AuditLogs from './components/AuditLogs';
import SQLConsole from './components/SQLConsole';
import UserManager from './components/UserManager';
import AppLogo from './components/AppLogo';

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [originalUser, setOriginalUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('pcc_original_user');
      if (stored) return JSON.parse(stored);
      
      const session = localStorage.getItem('pcc_user_session');
      if (session) return JSON.parse(session).user;
    } catch (e) {}
    return null;
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('pcc_user_session');
      if (stored) {
        const session = JSON.parse(stored);
        const ageInMs = Date.now() - session.loginTime;
        const maxAgeInMs = 24 * 60 * 60 * 1000; // 24 hours
        if (ageInMs < maxAgeInMs) {
          return session.user;
        } else {
          localStorage.removeItem('pcc_user_session');
          localStorage.removeItem('pcc_original_user');
        }
      }
    } catch (e) {
      console.error("Error restoring session", e);
    }
    return null;
  });
  const [deviceId, setDeviceId] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'form' | 'devices' | 'audit' | 'sql' | 'users'>('dashboard');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isDarkMode = false;

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('pcc_dark_mode', 'false');
  }, []);

  // Sync Device ID & Notification badge count
  useEffect(() => {
    const id = localStorage.getItem('pcc_device_id') || 'DEV_PC_DESKTOP_001';
    setDeviceId(id);
    updateBadge();
  }, []);

  const updateBadge = () => {
    const notifs = Database.getNotifications();
    setUnreadCount(notifs.filter(n => !n.read).length);
  };

  const handleLogin = (user: User, deviceId: string) => {
    setCurrentUser(user);
    setOriginalUser(user);
    setDeviceId(deviceId);
    updateBadge();
    
    // Persist session for 24 hours
    localStorage.setItem('pcc_user_session', JSON.stringify({
      user,
      loginTime: Date.now()
    }));
    localStorage.setItem('pcc_original_user', JSON.stringify(user));
    
    // Auto redirect based on role
    if (user.role === 'activista') {
      setActiveTab('form');
    } else {
      setActiveTab('dashboard');
    }
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    if (currentUser) {
      Database.logActivity(
        currentUser.id,
        currentUser.fullName,
        currentUser.role,
        'Cierre de Sesión',
        'Sesión finalizada por el operador de forma segura.',
        deviceId
      );
    }
    setCurrentUser(null);
    setOriginalUser(null);
    localStorage.removeItem('pcc_user_session');
    localStorage.removeItem('pcc_original_user');
  };

  // Helper to dynamically switch roles for testing inside AI Studio
  const handleTestingRoleSwitch = (role: UserRole) => {
    if (!currentUser) return;
    
    // Check if original logged-in user is actually authorized for demo switcher
    const originalRole = originalUser ? originalUser.role : currentUser.role;
    if (originalRole !== 'administrador') {
      alert('Soporte demo de evaluador desactivado para operadores no administradores.');
      return;
    }
    
    // Query default user of that role
    const users = Database.getUsers();
    const matchingUser = users.find(u => u.role === role && u.active);
    
    if (matchingUser) {
      setCurrentUser(matchingUser);
      // Log switch in audit
      Database.logActivity(
        matchingUser.id,
        matchingUser.fullName,
        matchingUser.role,
        'Cambio Rol (Prueba)',
        `Simulación cambiada temporalmente al operador: ${matchingUser.fullName} (${role}).`,
        deviceId
      );

      // Redirect if role is restricted from current tab
      if (role !== 'administrador' && (activeTab === 'devices' || activeTab === 'audit' || activeTab === 'sql' || activeTab === 'users')) {
        if (role === 'activista') {
          setActiveTab('form');
        } else {
          setActiveTab('dashboard');
        }
      }
      setIsMobileMenuOpen(false);
      
      updateBadge();
    }
  };

  const handleRefresh = () => {
    updateBadge();
    const wantsRestore = window.confirm('¿Desea restaurar la base de datos desde un archivo JSON de respaldo?\n\nCancele si solo desea refrescar el estado actual del sistema.');
    if (wantsRestore) {
      fileInputRef.current?.click();
    } else {
      window.location.reload();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          if (data && (data.opinions || data.users)) {
            Database.restoreBackup(data);
            alert('Base de datos restaurada con éxito. El sistema se reiniciará para aplicar los cambios.');
            
            if (currentUser) {
              Database.logActivity(
                currentUser.id,
                currentUser.fullName,
                currentUser.role,
                'Restauración de Sistema',
                'El operador restauró el sistema desde un archivo de respaldo JSON externo.',
                deviceId,
                'advertencia'
              );
            }
            
            window.location.reload();
          } else {
            alert('El archivo seleccionado no parece ser un respaldo válido del sistema.');
          }
        } catch (err) {
          alert('Error al procesar el archivo de respaldo: Formato JSON no válido.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSystemBackup = () => {
    if (currentUser?.role !== 'administrador') {
      alert('Permiso Denegado: Solo el Administrador Municipal puede respaldar el sistema.');
      return;
    }

    try {
      const backupData = {
        users: Database.getUsers(),
        opinions: Database.getOpinions(),
        devices: Database.getDevices(),
        logs: Database.getLogs(),
        notifications: Database.getNotifications(),
        backupTimestamp: new Date().toISOString(),
        backupBy: currentUser.fullName
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pcc_respaldo_sistema_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      Database.logActivity(
        currentUser.id,
        currentUser.fullName,
        currentUser.role,
        'Respaldo de Sistema',
        'El administrador municipal exportó un respaldo completo de la base de datos del sistema en formato JSON.',
        deviceId,
        'éxito'
      );
    } catch (e) {
      console.error("System backup failed", e);
    }
  };

  const handleOperatorBackup = () => {
    if (!currentUser) return;

    try {
      const opinions = Database.getOpinions();
      const myOpinions = opinions.filter(op => 
        op.contributor === currentUser.fullName || 
        op.deviceId === deviceId ||
        (currentUser.codigo && op.activistCode === currentUser.codigo)
      );

      const backupData = {
        opinions: myOpinions,
        backupTimestamp: new Date().toISOString(),
        backupBy: currentUser.fullName,
        contributorCode: currentUser.codigo || 'N/A'
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pcc_respaldo_opiniones_${currentUser.username}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      Database.logActivity(
        currentUser.id,
        currentUser.fullName,
        currentUser.role,
        'Respaldo de Datos',
        `El ${currentUser.role} exportó un respaldo de sus opiniones registradas (${myOpinions.length} registros) en formato JSON.`,
        deviceId,
        'éxito'
      );
    } catch (e) {
      console.error("Operator backup failed", e);
    }
  };

  if (!currentUser) {
    return (
      <div className="bg-gray-50 min-h-screen text-gray-900">
        <Auth onLoginSuccess={handleLogin} />
      </div>
    );
  }

  const navigate = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-zinc-950 text-[#111827] dark:text-zinc-100 font-sans flex relative overflow-hidden" id="app-shell">
      {/* Absolute background vector mesh */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(220,38,38,0.012)_1px,transparent_1px),linear-gradient(to_right,rgba(220,38,38,0.012)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION PANEL */}
      <aside 
        className={`fixed inset-y-0 left-0 w-[260px] md:w-64 bg-[#1A1A1A] border-r border-rose-900 flex flex-col shrink-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        id="sidebar"
      >
        
        {/* Customized PCC Red/Patriotic Brand Header */}
        <div className="pt-2.5 pb-1.5 px-3 bg-white dark:bg-[#1A1A1A] border-b border-gray-200 dark:border-white/10 flex flex-col items-center relative">
          <AppLogo size="sm" className="w-full justify-center" />
          <p className="mt-0.5 text-[12.5px] font-sans font-black tracking-widest text-[#DC2626] dark:text-[#EF4444] uppercase text-center">
            Comité Municipal Bayamo
          </p>
          <button 
            className="absolute top-2 right-2 md:hidden p-1.5 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white bg-gray-100 dark:bg-zinc-800 rounded-lg"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CURRENT USER SUMMARY PORTRAIT */}
        <div className="py-2.5 px-3.5 border-b border-white/10 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-rose-600/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center justify-center shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{currentUser.fullName}</div>
              <div className="text-[10px] text-zinc-300 flex items-center gap-1 uppercase tracking-wide mt-0.5 font-mono">
                <Shield className="w-3 h-3 text-rose-500" />
                <span>{currentUser.role}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 p-2 bg-black/40 border border-white/5 rounded-lg text-[9px] font-mono text-zinc-400 leading-tight">
            Terminal: <span className="text-zinc-200">{deviceId.substring(0, 16)}...</span>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 overflow-y-auto">
          {/* TAB: TABLERO */}
          <button
            onClick={() => navigate('dashboard')}
            className={`w-full py-2.5 px-4 text-xs font-bold flex items-center gap-2.5 transition-all text-left rounded-none border-l-4 ${activeTab === 'dashboard' ? 'bg-rose-950/40 text-white border-rose-600 font-bold' : 'text-zinc-300 hover:text-white hover:bg-white/10 border-transparent'}`}
            id="nav-dashboard"
          >
            <LayoutDashboard className="w-4.5 h-4.5 shrink-0" />
            <span className="flex-1">Tablero de Control</span>
          </button>

          {/* TAB: REGISTRAR */}
          <button
            onClick={() => navigate('form')}
            className={`w-full py-2.5 px-4 text-xs font-bold flex items-center gap-2.5 transition-all text-left rounded-none border-l-4 ${activeTab === 'form' ? 'bg-rose-950/40 text-white border-rose-600 font-bold' : 'text-zinc-300 hover:text-white hover:bg-white/10 border-transparent'}`}
            id="nav-form"
          >
            <PlusCircle className="w-4.5 h-4.5 shrink-0" />
            <span className="flex-1">Registrar Opiniones</span>
          </button>

          {/* TAB: DISPOSITIVOS (Admin Only) */}
          {currentUser.role === 'administrador' && (
            <button
              onClick={() => navigate('devices')}
              className={`w-full py-2.5 px-4 text-xs font-bold flex items-center gap-2.5 transition-all text-left rounded-none border-l-4 ${activeTab === 'devices' ? 'bg-rose-950/40 text-white border-rose-600 font-bold' : 'text-zinc-300 hover:text-white hover:bg-white/10 border-transparent'}`}
              id="nav-devices"
            >
              <Smartphone className="w-4.5 h-4.5 shrink-0" />
              <span className="flex-1">Dispositivos Autorizados</span>
            </button>
          )}

          {/* TAB: GESTION DE USUARIOS (Admin Only) */}
          {currentUser.role === 'administrador' && (
            <button
              onClick={() => navigate('users')}
              className={`w-full py-2.5 px-4 text-xs font-bold flex items-center gap-2.5 transition-all text-left rounded-none border-l-4 ${activeTab === 'users' ? 'bg-rose-950/40 text-white border-rose-600 font-bold' : 'text-zinc-300 hover:text-white hover:bg-white/10 border-transparent'}`}
              id="nav-users"
            >
              <Users className="w-4.5 h-4.5 shrink-0" />
              <span className="flex-1">Gestión de Usuarios</span>
            </button>
          )}

          {/* TAB: BITÁCORA AUDITORÍA (Admin Only) */}
          {currentUser.role === 'administrador' && (
            <button
              onClick={() => navigate('audit')}
              className={`w-full py-2.5 px-4 text-xs font-bold flex items-center gap-2.5 transition-all text-left rounded-none border-l-4 ${activeTab === 'audit' ? 'bg-rose-950/40 text-white border-rose-600 font-bold' : 'text-zinc-300 hover:text-white hover:bg-white/10 border-transparent'}`}
              id="nav-audit"
            >
              <History className="w-4.5 h-4.5 shrink-0" />
              <span className="flex-1">Bitácora de Auditoría</span>
            </button>
          )}

          {/* TAB: SQL CONSOLE (Admin Only) */}
          {currentUser.role === 'administrador' && (
            <>
              <button
                onClick={() => navigate('sql')}
                className={`w-full py-2.5 px-4 text-xs font-bold flex items-center gap-2.5 transition-all text-left rounded-none border-l-4 ${activeTab === 'sql' ? 'bg-rose-950/40 text-white border-rose-600 font-bold' : 'text-zinc-300 hover:text-white hover:bg-white/10 border-transparent'}`}
                id="nav-sql"
              >
                <Terminal className="w-4.5 h-4.5 shrink-0" />
                <span className="flex-1">Consola Relacional SQL</span>
              </button>

              {/* REFRESH/UPDATE BUTTON (Below SQL for Admin) */}
              <button
                onClick={handleRefresh}
                className={`w-full py-2.5 px-4 text-xs font-bold flex items-center gap-2.5 transition-all text-left rounded-none border-l-4 text-zinc-300 hover:text-white hover:bg-white/10 border-transparent`}
                id="nav-refresh-admin"
                title="Sincronizar y actualizar estado del sistema"
              >
                <RefreshCw className="w-4.5 h-4.5 shrink-0" />
                <span className="flex-1">Actualizar Sistema</span>
              </button>

              {/* BACKUP SYSTEM (Admin Only) */}
              <button
                onClick={handleSystemBackup}
                className={`w-full py-2.5 px-4 text-xs font-bold flex items-center gap-2.5 transition-all text-left rounded-none border-l-4 text-zinc-300 hover:text-white hover:bg-white/10 border-transparent`}
                id="nav-backup-system"
                title="Exportar respaldo completo del sistema (JSON)"
              >
                <Download className="w-4.5 h-4.5 shrink-0" />
                <span className="flex-1">Respaldar Sistema</span>
              </button>
            </>
          )}

          {/* OPERATOR SECTION (Activists/Compilers) */}
          {(currentUser.role === 'activista' || currentUser.role === 'compilador') && (
            <>
              {/* BACKUP DATA */}
              <button
                onClick={handleOperatorBackup}
                className={`w-full py-2.5 px-4 text-xs font-bold flex items-center gap-2.5 transition-all text-left rounded-none border-l-4 text-zinc-300 hover:text-white hover:bg-white/10 border-transparent`}
                id="nav-backup-data"
                title="Exportar sus opiniones registradas (JSON)"
              >
                <Download className="w-4.5 h-4.5 shrink-0" />
                <span className="flex-1">Respaldar Datos</span>
              </button>

              {/* REFRESH/UPDATE BUTTON (At the end for operators) */}
              <button
                onClick={handleRefresh}
                className={`w-full py-2.5 px-4 text-xs font-bold flex items-center gap-2.5 transition-all text-left rounded-none border-l-4 text-zinc-300 hover:text-white hover:bg-white/10 border-transparent`}
                id="nav-refresh-op"
                title="Sincronizar y actualizar estado del sistema"
              >
                <RefreshCw className="w-4.5 h-4.5 shrink-0" />
                <span className="flex-1">Actualizar Sistema</span>
              </button>
            </>
          )}
        </nav>

        {/* LOGOUT AND BRAND STAMP FOOTER */}
        <div className="py-2.5 px-3 border-t border-white/10 bg-black/20 space-y-2">
          {originalUser?.role === 'administrador' && (
            <div className="flex flex-col gap-1.5 p-2 bg-zinc-900/50 rounded-xl mb-2 border border-zinc-800 lg:hidden">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-mono text-center">Modo Demo (Evaluador)</span>
              <div className="flex justify-center gap-1">
                  <button 
                    onClick={() => handleTestingRoleSwitch('administrador')} 
                    className={`flex-1 px-1 py-1 rounded text-[9px] font-bold font-sans transition-all ${currentUser.role === 'administrador' ? 'bg-rose-650 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                  >
                    Admin
                  </button>
                  <button 
                    onClick={() => handleTestingRoleSwitch('compilador')} 
                    className={`flex-1 px-1 py-1 rounded text-[9px] font-bold font-sans transition-all ${currentUser.role === 'compilador' ? 'bg-rose-650 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                  >
                    Compil
                  </button>
                  <button 
                    onClick={() => handleTestingRoleSwitch('activista')} 
                    className={`flex-1 px-1 py-1 rounded text-[9px] font-bold font-sans transition-all ${currentUser.role === 'activista' ? 'bg-rose-650 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                  >
                    Activ
                  </button>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-rose-500 hover:text-rose-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            id="btn-logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>

          <div className="text-center text-[9px] text-zinc-500 leading-normal font-mono uppercase tracking-wider">
            Soberanía • Seguridad <br />
            PCC Localhost v2.1
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto" id="main-content">
        
        {/* SYSTEM APP BAR HEADER */}
        <header className="h-16 border-b border-gray-200 dark:border-zinc-800 px-4 md:px-6 flex items-center justify-between bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shrink-0 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
              title="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-bold tracking-tight text-gray-900 dark:text-white line-clamp-1">
              {activeTab === 'dashboard' && 'Tablero de Control Estadístico en Tiempo Real'}
              {activeTab === 'form' && 'Recepción Directa y Procesado de Opiniones'}
              {activeTab === 'devices' && 'Control Estatal de Dispositivos Autorizados'}
              {activeTab === 'users' && 'Gestión Estatal de Operadores y Credenciales'}
              {activeTab === 'audit' && 'Registro Inalterable de Auditorías del Estado'}
              {activeTab === 'sql' && 'Extractor Relacional de Base de Datos (SQL)'}
              {activeTab === 'notifications' && 'Bandeja y Despacho de Boletines / Alertas'}
            </h2>
          </div>

          {/* DYNAMIC ROLE SWITCHER FOR DEMO TESTING - ONLY FOR ADMINS */}
          {originalUser?.role === 'administrador' && (
            <div className="flex items-center gap-3" id="header-role-switcher">
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-gray-650 font-mono bg-gray-150 px-3 py-1.5 border border-gray-200 rounded-xl">
                <Info className="w-3.5 h-3.5 text-rose-600" />
                <span>Soporte Demo de Evaluador:</span>
                <div className="flex items-center gap-1 ml-1.5">
                  <button 
                    onClick={() => handleTestingRoleSwitch('administrador')} 
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans transition-all ${currentUser.role === 'administrador' ? 'bg-rose-650 text-white' : 'bg-gray-250 text-gray-600 hover:bg-gray-300'}`}
                  >
                    Admin
                  </button>
                  <button 
                    onClick={() => handleTestingRoleSwitch('compilador')} 
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans transition-all ${currentUser.role === 'compilador' ? 'bg-rose-650 text-white' : 'bg-gray-250 text-gray-600 hover:bg-gray-300'}`}
                  >
                    Compilador
                  </button>
                  <button 
                    onClick={() => handleTestingRoleSwitch('activista')} 
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans transition-all ${currentUser.role === 'activista' ? 'bg-rose-650 text-white' : 'bg-gray-250 text-gray-600 hover:bg-gray-300'}`}
                  >
                    Activista
                  </button>
                </div>
              </div>
            </div>
          )}

        </header>

        {/* RENDER ACTIVE TAB */}
        <div className="p-6 flex-1 max-w-7xl w-full mx-auto pb-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && (
                <Dashboard 
                  currentRole={currentUser.role} 
                  currentUsername={currentUser.fullName} 
                  onNavigateToForm={() => setActiveTab('form')}
                />
              )}
              {activeTab === 'form' && (
                <OpinionForm 
                  currentUsername={currentUser.fullName} 
                  currentRole={currentUser.role} 
                  deviceId={deviceId}
                  onSuccess={() => {
                    setActiveTab('dashboard');
                    updateBadge();
                  }}
                />
              )}
              {activeTab === 'devices' && currentUser.role === 'administrador' && (
                <DeviceManager 
                  currentRole={currentUser.role} 
                  currentUsername={currentUser.fullName} 
                  deviceId={deviceId} 
                  onRefresh={updateBadge}
                />
              )}
              {activeTab === 'users' && currentUser.role === 'administrador' && (
                <UserManager 
                  currentUsername={currentUser.fullName}
                  currentUserId={currentUser.id}
                  deviceId={deviceId}
                  onRefresh={updateBadge}
                />
              )}
              {activeTab === 'audit' && currentUser.role === 'administrador' && (
                <AuditLogs currentRole={currentUser.role} currentUsername={currentUser.fullName} />
              )}
              {activeTab === 'sql' && currentUser.role === 'administrador' && (
                <SQLConsole />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      
      {/* Hidden file input for system restoration */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        className="hidden" 
      />
    </div>
  );
}
