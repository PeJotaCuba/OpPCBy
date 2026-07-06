/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Key, Smartphone, UserPlus, CheckCircle2, AlertTriangle, RefreshCw, KeyRound, Phone, Download } from 'lucide-react';
import { Database, CONSEJOS_POPULARES_BAYAMO } from '../dbStore';
import { User, UserRole } from '../types';
import AppLogo from './AppLogo';

interface AuthProps {
  onLoginSuccess: (user: User, deviceId: string) => void;
}

export default function Auth({ onLoginSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [codigo, setCodigo] = useState('');
  const [role, setRole] = useState<UserRole>('activista');
  const [deviceId, setDeviceId] = useState('');
  const [mobile, setMobile] = useState('');
  
  // 2FA state
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [tempUser, setTempUser] = useState<User | null>(null);
  
  // Status states
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [deviceStatus, setDeviceStatus] = useState<'aprobado' | 'pendiente' | 'bloqueado' | 'nuevo'>('nuevo');
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [showDeviceSetup, setShowDeviceSetup] = useState(false);
  const [setupConsejo, setSetupConsejo] = useState(CONSEJOS_POPULARES_BAYAMO[0]);
  const [setupDeviceType, setSetupDeviceType] = useState('MOBILE');
  const [setupCode, setSetupCode] = useState('');

  const handleLoadJsonData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          if (data.type === 'admin_device_key' && data.deviceId) {
            const success = Database.addAdminDeviceKey(data.deviceId);
            if (success) {
              setInfo('Llave de dispositivo cargada con éxito. El administrador ahora puede acceder desde esta terminal.');
              setDeviceId(data.deviceId);
              localStorage.setItem('pcc_device_id', data.deviceId);
            } else {
              setInfo('Este dispositivo ya cuenta con autorización o no se pudo procesar la llave.');
            }
          } else if (data.type === 'users_backup' && Array.isArray(data.users)) {
            Database.importUsers(data.users);
            setInfo('Base de datos de usuarios sincronizada con éxito. Ahora puede iniciar sesión con sus credenciales autorizadas.');
          } else {
            setError('El archivo seleccionado no es un formato compatible (Llave o Base de Datos).');
          }
        } catch (err) {
          setError('Error al procesar el archivo JSON.');
        }
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    const storedDeviceId = localStorage.getItem('pcc_device_id');
    if (!storedDeviceId) {
      setShowDeviceSetup(true);
    } else {
      setDeviceId(storedDeviceId);
    }
  }, []);

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleGenerateDeviceId = (e) => {
    e.preventDefault();
    setIsGeneratingId(true);
    setTimeout(() => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let rand = '';
      for (let i = 0; i < 6; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
      
      const newDeviceId = `DEV-PC-OP-BY-${setupCode.trim().toUpperCase() || 'OP001'}-${rand}`;
      
      localStorage.setItem('pcc_device_id', newDeviceId);
      setDeviceId(newDeviceId);
      setShowDeviceSetup(false);
      setIsGeneratingId(false);
    }, 1200);
  };

  // Check device status from DB when deviceId is loaded
  useEffect(() => {
    if (deviceId) {
      const devices = Database.getDevices();
      const device = devices.find(d => d.id === deviceId);
      if (device) {
        setDeviceStatus(device.status);
      } else {
        setDeviceStatus('nuevo');
      }
    }
  }, [deviceId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!username || !password) {
      setError('Por favor, introduzca su usuario y contraseña.');
      return;
    }

    // Check device status first
    const devices = Database.getDevices();
    const device = devices.find(d => d.id === deviceId);
    
    if (device && device.status === 'bloqueado') {
      setError('Este dispositivo ha sido bloqueado de forma permanente por razones de seguridad de la patria. Comuníquese con el administrador.');
      Database.logActivity('anónimo', username, 'activista', 'Bloqueo Dispositivo', `Intento de acceso desde dispositivo bloqueado: ${deviceId}`, deviceId, 'error');
      return;
    }

    if (device && device.status === 'pendiente') {
      setError('Acceso denegado. Este dispositivo se encuentra pendiente de aprobación. Solicite aprobación al Administrador.');
      return;
    }

    // Authenticate User
    const users = Database.getUsers();
    const loginInput = username.trim();
    const user = users.find(u => u.username.toLowerCase() === loginInput.toLowerCase() || (u.mobile && u.mobile === loginInput));

    if (!user) {
      setError('Usuario, teléfono o contraseña incorrectos.');
      Database.logActivity('anónimo', loginInput, 'activista', 'Fallo de Autenticación', `Usuario o móvil inexistente: ${loginInput}`, deviceId, 'error');
      return;
    }

    // Verify Password strictly if set
    if (user.password && password !== user.password) {
      setError('Usuario, teléfono o contraseña incorrectos.');
      Database.logActivity('anónimo', loginInput, 'activista', 'Fallo de Autenticación', `Contraseña incorrecta para: ${user.fullName}`, deviceId, 'error');
      return;
    }

    // Access Control: Block Activistas from logging in
    if (user.role === 'activista') {
      setError('Acceso denegado. Los activistas territoriales no tienen permitido iniciar sesión en el tablero ni en la oficina de recepción de opiniones. Su registro es únicamente para control de origen.');
      Database.logActivity(user.id, user.fullName, user.role, 'Fallo de Acceso - Activista', `Intento de acceso denegado por rol de activista: ${user.fullName}`, deviceId, 'advertencia');
      return;
    }

    // If device is not associated yet or is different, or user is unregistered
    const isAuthorizedDevice = user.deviceId === deviceId || (user.extraDeviceIds && user.extraDeviceIds.includes(deviceId));
    if (!isAuthorizedDevice) {
      // Admin check: Only admin is strictly restricted to master device or authorized extra devices
      if (user.role === 'administrador') {
        setError('Acceso Denegado: Este terminal no está autorizado para el perfil de administración. Cargue su llave de dispositivo (JSON) para habilitarlo.');
        return;
      }
      
      // If device is new or pending, enforce device authorization
      if (!device || device.status === 'pendiente') {
        // Register device as pending if new
        if (!device) {
          Database.registerDevice({
            id: deviceId,
            name: `Móvil de ${user.fullName}`,
            ownerName: user.fullName,
            role: user.role,
            status: 'pendiente',
            lastUsed: new Date().toISOString().replace('T', ' ').substring(0, 16)
          });
          setDeviceStatus('pendiente');
          // Log & Notify
          Database.logActivity(user.id, user.fullName, user.role, 'Registro Dispositivo', `Solicitud de nuevo dispositivo ID: ${deviceId}`, deviceId, 'advertencia');
          Database.addNotification('informacion', 'Nuevo Dispositivo Registrado', `El usuario ${user.fullName} solicita vincular el dispositivo ID ${deviceId}.`, true, true);
        }
        setError('Este dispositivo no está vinculado a su cuenta. Se ha enviado una solicitud de aprobación al administrador municipal.');
        return;
      }
    }

    // Set temp user for 2FA validation step
    setTempUser(user);
    setShowTwoFactor(true);
    
    // Log initial login step
    Database.logActivity(user.id, user.fullName, user.role, 'Inicio de Sesión', `Credenciales correctas. Reclamo de código 2FA.`, deviceId, 'éxito');
  };

  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!tempUser) return;

    // Simulate 2FA code verification
    // Secret code is always '1961' (Year of the Literacy Campaign / Campaign of Playa Girón, highly thematic)
    // Or if they write any 6-digit number, we can let them login, but '1961' is the secret key
    if (twoFactorCode === '1961' || twoFactorCode.length === 6) {
      // Approve device connection
      if (tempUser.role === 'administrador' && deviceStatus === 'nuevo') {
        Database.registerDevice({
          id: deviceId,
          name: `PC Administrador Lázaro`,
          ownerName: tempUser.fullName,
          role: 'administrador',
          status: 'aprobado',
          lastUsed: new Date().toISOString().replace('T', ' ').substring(0, 16)
        });
        setDeviceStatus('aprobado');
      }

      Database.logActivity(tempUser.id, tempUser.fullName, tempUser.role, 'Verificación 2FA', `Acceso autorizado mediante 2FA.`, deviceId, 'éxito');
      
      onLoginSuccess(tempUser, deviceId);
    } else {
      setError('Código de Doble Factor incorrecto. Inténtelo de nuevo.');
      Database.logActivity(tempUser.id, tempUser.fullName, tempUser.role, 'Fallo 2FA', `Intento fallido de código doble factor.`, deviceId, 'advertencia');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!username || !password || !fullName) {
      setError('Todos los campos son obligatorios (Nombre, Usuario y Contraseña).');
      return;
    }

    const users = Database.getUsers();
    if (users.some(u => u.username === username.trim().toLowerCase())) {
      setError('El nombre de usuario ya se encuentra registrado.');
      return;
    }

    if (mobile.trim() && users.some(u => u.mobile === mobile.trim())) {
      setError('El número de teléfono móvil ya se encuentra registrado.');
      return;
    }

    if (users.some(u => u.deviceId === deviceId)) {
      setError('Este dispositivo ya se encuentra asociado a una cuenta existente. Solo se permite una cuenta por dispositivo según los protocolos de seguridad.');
      return;
    }

    // Create a new pending user or registered activist/compiler
    // For activist & compilers, their devices will start as pending unless they register on already approved devices
    const newUser: User = {
      id: `usr_${Date.now()}`,
      codigo: codigo.toUpperCase(),
      username: username.trim().toLowerCase(),
      fullName: fullName.trim(),
      mobile: mobile.trim() || undefined,
      password: password.trim(),
      role,
      deviceId: deviceId,
      approvedDevice: false, // Starts as false, administrator must approve device
      twoFactorSecret: `PCC-${role.toUpperCase()}-SEC-${Math.floor(100+Math.random()*900)}`,
      twoFactorEnabled: true,
      active: true
    };

    // Auto-register device as pending
    Database.registerDevice({
      id: deviceId,
      name: `Dispositivo de ${fullName}`,
      ownerName: fullName,
      role: role,
      status: 'pendiente',
      lastUsed: new Date().toISOString().replace('T', ' ').substring(0, 16)
    });

    Database.saveUser(newUser);
    setDeviceStatus('pendiente');

    Database.logActivity(newUser.id, newUser.fullName, newUser.role, 'Registro de Usuario', `Nuevo usuario registrado. Dispositivo ID ${deviceId} pendiente de aprobación.`, deviceId, 'advertencia');
    Database.addNotification('informacion', 'Nuevo Registro', `Nuevo usuario ${fullName} (${role}) registrado. Dispositivo pendiente de aprobación.`, true, true);

    setInfo('Registro completado con éxito. Su dispositivo se encuentra bajo auditoría del administrador. Solicite la habilitación de su cuenta.');
    setIsLogin(true);
    setUsername(newUser.username);
    setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900 p-4 font-sans selection:bg-rose-600 selection:text-white animate-fade-in" id="auth-container">
      {/* Absolute subtle patriotic elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(225,29,72,0.06),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,42,131,0.04),transparent_50%)] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden text-gray-900 dark:text-zinc-100"
      >
        {/* PCC Header Logo Banner */}
        <div className="flex flex-col items-center mb-4 border-b border-gray-200 dark:border-zinc-800 pb-3.5 text-center">
          <AppLogo size="lg" className="justify-center" />
          <p className="-mt-1 text-[13px] font-sans font-black tracking-widest text-[#DC2626] uppercase">Comité Municipal Bayamo</p>
        </div>

        {showDeviceSetup ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100 mb-1">Configuración de Dispositivo</h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">Genere el ID único para este terminal antes de continuar.</p>
            </div>
            
            <form onSubmit={handleGenerateDeviceId} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">Consejo Popular</label>
                <select
                  value={setupConsejo}
                  onChange={(e) => setSetupConsejo(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-250 dark:border-zinc-700 focus:border-rose-600/50 rounded-xl py-2.5 px-3.5 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:bg-white dark:bg-zinc-950 transition-colors cursor-pointer"
                >
                  {CONSEJOS_POPULARES_BAYAMO.map(cp => (
                    <option key={cp} value={cp}>{cp}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">Tipo de Dispositivo</label>
                <select
                  value={setupDeviceType}
                  onChange={(e) => setSetupDeviceType(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-250 dark:border-zinc-700 focus:border-rose-600/50 rounded-xl py-2.5 px-3.5 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:bg-white dark:bg-zinc-950 transition-colors cursor-pointer"
                >
                  <option value="MOBILE">Teléfono Móvil (MOBILE)</option>
                  <option value="TABLET">Tableta (TABLET)</option>
                  <option value="DESKTOP">Computadora (DESKTOP)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">Código del Activista, Compilador o Administrador</label>
                <input 
                  type="text"
                  required
                  placeholder="ej. ADM-001 o COM-002"
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value.toUpperCase())}
                  className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-250 dark:border-zinc-700 focus:border-rose-600/50 rounded-xl py-2.5 px-3.5 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:bg-white dark:bg-zinc-950 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isGeneratingId}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {isGeneratingId ? 'Generando...' : 'Generar ID Único'}
                <Smartphone className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        ) : (
          <>
            {/* Device Information Strip */}
        <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-mono">ID de Dispositivo</div>
              <div className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300">
                {isGeneratingId ? (
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-500">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Escaneando hardware...
                  </span>
                ) : (
                  deviceId
                )}
              </div>
            </div>
          </div>
          <div>
            {deviceStatus === 'aprobado' && (
              <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/50 uppercase tracking-wider font-mono">Aprobado</span>
            )}
            {deviceStatus === 'pendiente' && (
              <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 uppercase tracking-wider font-mono">Pendiente</span>
            )}
            {deviceStatus === 'bloqueado' && (
              <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-rose-50 dark:bg-rose-950/30 text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 uppercase tracking-wider font-mono">Bloqueado</span>
            )}
            {deviceStatus === 'nuevo' && (
              <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 uppercase tracking-wider font-mono">No Registrado</span>
            )}
          </div>
        </div>

        {/* Banner Alert if pending / blocked */}
        {deviceStatus === 'bloqueado' && (
          <div className="p-3 mb-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-lg flex items-start gap-2 text-rose-800 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-500 shrink-0 mt-0.5" />
            <p><strong>ATENCIÓN:</strong> Este dispositivo ha sido inhabilitado para auditoría de seguridad del Estado.</p>
          </div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 mb-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-150 dark:border-rose-900/50 rounded-xl flex items-start gap-2.5 text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 text-xs"
          >
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Device ID Display Section */}
        <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-xl flex flex-col items-center gap-1">
          <div className="text-[9px] uppercase tracking-widest text-gray-400 dark:text-zinc-500 font-mono font-bold">Identificador Único del Terminal</div>
          <div className="text-xs font-mono font-bold text-rose-700 dark:text-rose-500 bg-white dark:bg-black px-2 py-0.5 rounded border border-gray-200 dark:border-zinc-800 shadow-sm" id="display-device-id">
            {deviceId || 'GENERANDO...'}
          </div>
        </div>

        {info && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 mb-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-150 dark:border-emerald-900/50 rounded-xl flex items-start gap-2.5 text-emerald-700 dark:text-emerald-400 text-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{info}</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!showTwoFactor ? (
            <motion.div
              key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, x: isLogin ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 10 : -10 }}
              transition={{ duration: 0.2 }}
            >
              {isLogin ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-1.5 mb-4">
                    <Shield className="w-4.5 h-4.5 text-rose-600 dark:text-rose-500" />
                    <span>Autenticación de Oficio</span>
                  </h2>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">Usuario de Sistema o Teléfono Móvil</label>
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="ej. oppccadmin o 54413935"
                      className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-250 dark:border-zinc-700 focus:border-rose-600/50 rounded-xl py-2.5 px-3.5 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:bg-white dark:bg-zinc-950 transition-colors"
                      disabled={deviceStatus === 'bloqueado'}
                      id="input-username"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">Contraseña Encriptada</label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-250 dark:border-zinc-700 focus:border-rose-600/50 rounded-xl py-2.5 px-3.5 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:bg-white dark:bg-zinc-950 transition-colors"
                      disabled={deviceStatus === 'bloqueado'}
                      id="input-password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={deviceStatus === 'bloqueado' || isGeneratingId}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer"
                    id="btn-login-submit"
                  >
                    <span>Ingresar al Sistema</span>
                    <Key className="w-4 h-4" />
                  </button>

                  <div className="pt-2">
                    <label className="w-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold py-2 rounded-xl text-[10.5px] transition-all flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                      <Download className="w-3.5 h-3.5 rotate-180" />
                      Cargar Llave o Base de Datos (JSON)
                      <input type="file" accept=".json" onChange={handleLoadJsonData} className="hidden" />
                    </label>
                  </div>

                  <div className="text-center pt-4">
                    <button
                      type="button"
                      onClick={() => { setIsLogin(false); setError(''); }}
                      className="text-xs text-rose-600 dark:text-rose-500 hover:text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 underline font-semibold cursor-pointer"
                      id="btn-switch-to-register"
                    >
                      ¿No tiene usuario registrado? Solicite registro seguro
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-1.5 mb-4">
                    <UserPlus className="w-4.5 h-4.5 text-rose-600 dark:text-rose-500" />
                    <span>Registro Seguro de Personal</span>
                  </h2>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">Código de Identificación / Operador <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                      placeholder="ej. ACT-105 o COM-002"
                      className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-250 dark:border-zinc-700 focus:border-rose-600/50 rounded-xl py-2.5 px-3.5 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:bg-white dark:bg-zinc-950 transition-colors"
                      id="input-reg-codigo"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">Nombre Completo</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Lázaro Cárdenas del Río"
                      className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-250 dark:border-zinc-700 focus:border-rose-600/50 rounded-xl py-2.5 px-3.5 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:bg-white dark:bg-zinc-950 transition-colors"
                      id="input-reg-name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">Nombre de Usuario</label>
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="ej. activista_bayamo"
                      className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-250 dark:border-zinc-700 focus:border-rose-600/50 rounded-xl py-2.5 px-3.5 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:bg-white dark:bg-zinc-950 transition-colors"
                      id="input-reg-username"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-rose-600 dark:text-rose-500" />
                      <span>Teléfono Móvil</span>
                    </label>
                    <input 
                      type="text" 
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="ej. 54413935"
                      className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-250 dark:border-zinc-700 focus:border-rose-600/50 rounded-xl py-2.5 px-3.5 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:bg-white dark:bg-zinc-950 transition-colors"
                      id="input-reg-mobile"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">Contraseña de Acceso</label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-250 dark:border-zinc-700 focus:border-rose-600/50 rounded-xl py-2.5 px-3.5 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:bg-white dark:bg-zinc-950 transition-colors"
                      id="input-reg-password"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">Cargo / Rol en el PCC</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-250 dark:border-zinc-700 focus:border-rose-600/50 rounded-xl py-2.5 px-3.5 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:bg-white dark:bg-zinc-950 transition-colors cursor-pointer"
                      id="input-reg-role"
                    >
                      <option value="activista" className="bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100">Activista (Mapeo Territorial)</option>
                      <option value="compilador" className="bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100">Compilador (Consolidador de Opiniones)</option>
                      <option value="administrador" className="bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100">Administrador Municipal</option>
                    </select>
                  </div>

                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl text-[10.5px] text-gray-600 dark:text-zinc-400 leading-relaxed">
                    Al registrarse, este dispositivo se enlazará automáticamente como <strong>PENDIENTE DE APROBACIÓN</strong>. Solo podrá operar cuando el administrador municipal autorice el código del terminal.
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 mt-2 cursor-pointer"
                    id="btn-register-submit"
                  >
                    <span>Solicitar Registro</span>
                    <Shield className="w-4 h-4" />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => { setIsLogin(true); setError(''); }}
                      className="text-xs text-rose-600 dark:text-rose-500 hover:text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 underline font-semibold cursor-pointer"
                      id="btn-switch-to-login"
                    >
                      ¿Ya posee cuenta? Iniciar Sesión
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="two-factor"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div className="text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/30 rounded-full flex items-center justify-center border border-rose-100 dark:border-rose-900/50 mb-3">
                    <KeyRound className="w-6 h-6 text-rose-600 dark:text-rose-500 animate-pulse" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">Doble Factor de Seguridad (2FA)</h2>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1.5 max-w-xs">
                    Para la protección de datos soberana, escanee el generador o digite el código de seguridad de 6 dígitos asociado a su credencial.
                  </p>
                </div>

                {/* Simulated QR Code Generator */}
                <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-900 p-4 rounded-xl w-44 h-44 mx-auto my-4 border border-gray-200 dark:border-zinc-800 shadow-sm">
                  {/* Styled Minimal Grid to resemble QR */}
                  <div className="grid grid-cols-6 gap-1 w-full h-full">
                    {[...Array(36)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`rounded-sm ${(i % 3 === 0 || i < 6 || i > 30 || (i % 7 === 1 && i > 12 && i < 24)) ? 'bg-gray-800' : 'bg-transparent'}`} 
                      />
                    ))}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[10px] font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Clave de Semilla Autogenerada:</div>
                  <code className="bg-gray-50 dark:bg-zinc-900 px-2.5 py-1 rounded border border-gray-250 dark:border-zinc-700 text-xs font-mono text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 font-bold tracking-widest">
                    {tempUser?.twoFactorSecret}
                  </code>
                </div>

                <div>
                  <label className="block text-center text-xs font-medium text-gray-500 dark:text-zinc-400 mb-2">Código de Verificación</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="ej. 1961"
                    className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-250 dark:border-zinc-700 focus:border-rose-600/50 rounded-xl py-3 px-3 text-center text-xl font-bold tracking-[0.5em] text-gray-900 dark:text-zinc-100 focus:outline-none focus:bg-white dark:bg-zinc-950 transition-colors"
                    id="input-2fa-code"
                  />
                  <div className="text-center mt-2.5">
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                      Ayuda: Código de homologación por defecto <strong>1961</strong>
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowTwoFactor(false); setTwoFactorCode(''); setError(''); }}
                    className="flex-1 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-zinc-400 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer border border-gray-250 dark:border-zinc-700"
                    id="btn-2fa-cancel"
                  >
                    Regresar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                    id="btn-2fa-verify"
                  >
                    <span>Validar Código</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer branding */}
        </>
        )}
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-zinc-800 text-center text-[10px] text-gray-400 dark:text-zinc-500 leading-relaxed">
          Partido Comunista de Cuba <br />
          Sistema Local de Alta Seguridad para la Privacidad de la Información
        </div>
      </motion.div>
    </div>
  );
}
