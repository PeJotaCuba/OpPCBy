/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, UserPlus, Search, Filter, Shield, Phone, KeyRound, 
  Edit2, Trash2, Check, X, AlertTriangle, ToggleLeft, ToggleRight,
  ShieldCheck, ShieldAlert, Download, Eye, EyeOff
} from 'lucide-react';
import { Database } from '../dbStore';
import { User, UserRole } from '../types';

interface UserManagerProps {
  currentUsername: string;
  currentUserId: string;
  deviceId: string;
  onRefresh?: () => void;
}

export default function UserManager({ currentUsername, currentUserId, deviceId, onRefresh }: UserManagerProps) {
  const [users, setUsers] = useState<User[]>(() => Database.getUsers());
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  
  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [codigo, setCodigo] = useState('');
  
  // Fields for creation/editing
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('activista');
  const [userDeviceId, setUserDeviceId] = useState('');
  const [extraDeviceIds, setExtraDeviceIds] = useState<string[]>(['', '']);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [active, setActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  // Feedback alerts
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Custom in-app warning/confirmation modal states
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const reloadUsers = () => {
    const updatedUsers = Database.getUsers();
    setUsers(updatedUsers);
    if (onRefresh) onRefresh();
  };

  const openCreateForm = () => {
    setEditingUser(null);
    setCodigo('');
    setFullName('');
    setUsername('');
    setMobile('');
    setPassword('');
    setRole('activista');
    setUserDeviceId('');
    setTwoFactorEnabled(true);
    setActive(true);
    setError('');
    setSuccess('');
    setIsFormOpen(true);
  };

  const openEditForm = (user: User) => {
    setEditingUser(user);
    setCodigo(user.codigo || '');
    setFullName(user.fullName);
    setUsername(user.username);
    setMobile(user.mobile || '');
    setPassword(user.password || '');
    setRole(user.role);
    setUserDeviceId(user.deviceId || '');
    setExtraDeviceIds(user.extraDeviceIds && user.extraDeviceIds.length > 0 
      ? [...user.extraDeviceIds, '', ''].slice(0, 2) 
      : ['', '']);
    setTwoFactorEnabled(user.twoFactorEnabled);
    setActive(user.active);
    setError('');
    setSuccess('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fullName.trim() || !username.trim() || !password.trim()) {
      setError('Por favor, complete los campos obligatorios: Nombre, Usuario y Contraseña.');
      return;
    }

    if (mobile.trim() && !/^\d{8,12}$/.test(mobile.trim())) {
      setError('El número de teléfono móvil debe contener entre 8 y 12 dígitos numéricos.');
      return;
    }

    const allUsers = Database.getUsers();

    // Check if username already exists for other users
    const usernameConflict = allUsers.some(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && u.id !== (editingUser?.id || '')
    );
    if (usernameConflict) {
      setError('El nombre de usuario ingresado ya se encuentra en uso por otro operador.');
      return;
    }

    // Check if mobile already exists for other users
    if (mobile.trim()) {
      const mobileConflict = allUsers.some(
        u => u.mobile === mobile.trim() && u.id !== (editingUser?.id || '')
      );
      if (mobileConflict) {
        setError('El número de teléfono móvil ingresado ya se encuentra asignado a otro operador.');
        return;
      }
    }

    // Generate/Set device ID if empty
    const finalDeviceId = userDeviceId.trim() || `DEV_PCC_AUTO_${Math.floor(100000 + Math.random() * 900000)}`;

    const userData: User = {
      id: editingUser?.id || `usr_${Date.now()}`,
      codigo: codigo.toUpperCase(),
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      mobile: mobile.trim() || undefined,
      password: password.trim(),
      role,
      deviceId: finalDeviceId,
      extraDeviceIds: role === 'administrador' ? extraDeviceIds.filter(id => id.trim() !== '') : [],
      approvedDevice: editingUser ? editingUser.approvedDevice : true, // Auto approve device for manually created users
      twoFactorSecret: editingUser?.twoFactorSecret || `PCC-${role.toUpperCase()}-SEC-${Math.floor(100 + Math.random() * 900)}`,
      twoFactorEnabled,
      active
    };

    // Save user to DB
    Database.saveUser(userData);

    // Auto register the device if it doesn't exist
    const devices = Database.getDevices();
    const allDevicesToRegister = [finalDeviceId, ...userData.extraDeviceIds!];
    
    allDevicesToRegister.forEach(dId => {
      if (dId && !devices.some(d => d.id === dId)) {
        Database.registerDevice({
          id: dId,
          name: `Dispositivo de ${fullName.trim()}`,
          ownerName: fullName.trim(),
          role,
          status: 'aprobado',
          lastUsed: new Date().toISOString().replace('T', ' ').substring(0, 16)
        });
      }
    });

    // Log the audit action
    Database.logActivity(
      currentUserId || 'usr_admin',
      currentUsername || 'Administrador',
      'administrador',
      editingUser ? 'Edición Usuario' : 'Creación Usuario',
      `Se ${editingUser ? 'modificaron' : 'crearon'} las credenciales de ${fullName.trim()} (${role.toUpperCase()}) con móvil: ${mobile.trim() || 'N/D'}.`,
      deviceId
    );

    setSuccess(editingUser ? 'Usuario modificado con éxito.' : 'Nuevo usuario registrado con éxito.');
    setTimeout(() => {
      setIsFormOpen(false);
      setEditingUser(null);
      reloadUsers();
    }, 1200);
  };

  const handleDeleteUser = (user: User) => {
    if (user.id === currentUserId || user.username === 'oppccadmin') {
      setWarningMessage('Operación Denegada: No es posible eliminar su propio usuario de administración activo por razones de integridad.');
      return;
    }
    setUserToDelete(user);
  };

  const confirmDeleteUser = () => {
    if (!userToDelete) return;
    const user = userToDelete;
    Database.deleteUser(user.id);
    
    // Log the delete action
    Database.logActivity(
      currentUserId || 'usr_admin',
      currentUsername || 'Administrador',
      'administrador',
      'Eliminación Usuario',
      `Se eliminó de forma inalterable el usuario de ${user.fullName} (${user.username}).`,
      deviceId,
      'advertencia'
    );

    // Add safety notification
    Database.addNotification(
      'critica',
      'Credencial de Usuario Eliminada',
      `El administrador de Bayamo revocó de forma inalterable los accesos para el operador ${user.fullName}.`,
      false,
      true
    );

    reloadUsers();
    setUserToDelete(null);
  };

  const handleToggleActive = (user: User) => {
    if (user.id === currentUserId || user.username === 'oppccadmin') {
      setWarningMessage('Operación Denegada: No puede desactivar su propia credencial activa de administración.');
      return;
    }

    const updatedUser = { ...user, active: !user.active };
    Database.saveUser(updatedUser);

    Database.logActivity(
      currentUserId || 'usr_admin',
      currentUsername || 'Administrador',
      'administrador',
      'Modificación Estado Usuario',
      `Estado del usuario ${user.fullName} cambiado a: ${updatedUser.active ? 'ACTIVO' : 'INACTIVO'}.`,
      deviceId
    );

    reloadUsers();
  };

  const handleExportUsers = () => {
    const users = Database.getUsers();
    const dataStr = JSON.stringify({ type: 'users_backup', users, timestamp: new Date().toISOString() }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pcc_usuarios_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportUsers = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          if (data.type === 'users_backup' && Array.isArray(data.users)) {
            Database.importUsers(data.users);
            alert('Usuarios importados con éxito.');
            reloadUsers();
          } else {
            alert('Archivo de usuarios no válido.');
          }
        } catch (err) {
          alert('Error al procesar el archivo.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleGenerateDeviceKey = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const keyData = {
      type: 'admin_device_key',
      deviceId: user.deviceId,
      issuedAt: new Date().toISOString(),
      owner: user.fullName
    };
    const dataStr = JSON.stringify(keyData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pcc_llave_${user.username}_${user.deviceId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filtering users
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.mobile && u.mobile.includes(searchTerm));
    
    const matchesRole = roleFilter === 'todos' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6" id="user-manager-panel">
      {/* Informative Header card */}
      <div className="bg-white dark:bg-zinc-950 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex items-start gap-4 flex-wrap sm:flex-nowrap text-gray-900 dark:text-zinc-100 dark:text-zinc-100 transition-all">
        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/30 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 dark:border-rose-900 text-rose-600 dark:text-rose-500 dark:text-rose-400 rounded-2xl flex items-center justify-center shrink-0">
          <Users className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-gray-950 dark:text-white tracking-tight">Gestión Estatal de Operadores y Credenciales</h2>
          <p className="text-gray-500 dark:text-zinc-400 dark:text-zinc-400 text-xs leading-relaxed">
            Consola centralizada del Comité Municipal de Bayamo para la administración de personal autorizado. Gestione de forma soberana el alta, modificación de teléfonos, contraseñas, privilegios y cese inalterable de accesos para activistas y compiladores.
          </p>
        </div>
      </div>

      {/* Users Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-950 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 dark:border-zinc-800 p-4 rounded-xl shadow-sm text-gray-900 dark:text-zinc-100 dark:text-zinc-100">
          <div className="text-xs font-mono uppercase tracking-wider text-gray-400 dark:text-zinc-500 dark:text-zinc-500 font-bold">Total Operadores</div>
          <div className="text-2xl font-black mt-1 text-rose-600 dark:text-rose-500 dark:text-rose-500">{users.length}</div>
        </div>
        <div className="bg-white dark:bg-zinc-950 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 dark:border-zinc-800 p-4 rounded-xl shadow-sm text-gray-900 dark:text-zinc-100 dark:text-zinc-100">
          <div className="text-xs font-mono uppercase tracking-wider text-gray-400 dark:text-zinc-500 dark:text-zinc-500 font-bold">Activos de Oficio</div>
          <div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-500">
            {users.filter(u => u.active).length}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-950 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 dark:border-zinc-800 p-4 rounded-xl shadow-sm text-gray-900 dark:text-zinc-100 dark:text-zinc-100">
          <div className="text-xs font-mono uppercase tracking-wider text-gray-400 dark:text-zinc-500 dark:text-zinc-500 font-bold">Compiladores</div>
          <div className="text-2xl font-black mt-1 text-indigo-600 dark:text-indigo-400">
            {users.filter(u => u.role === 'compilador').length}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-950 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 dark:border-zinc-800 p-4 rounded-xl shadow-sm text-gray-900 dark:text-zinc-100 dark:text-zinc-100">
          <div className="text-xs font-mono uppercase tracking-wider text-gray-400 dark:text-zinc-500 dark:text-zinc-500 font-bold">Activistas</div>
          <div className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-500">
            {users.filter(u => u.role === 'activista').length}
          </div>
        </div>
      </div>

      {/* Control panel & Action view */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-950 dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 dark:border-zinc-800 shadow-sm transition-all text-gray-900 dark:text-zinc-100 dark:text-zinc-100">
        <div className="flex flex-1 flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar por nombre, usuario, móvil..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-zinc-900 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-700 dark:border-zinc-800 focus:border-rose-600/50 rounded-lg text-xs text-gray-900 dark:text-zinc-100 dark:text-zinc-100 focus:outline-none focus:bg-white dark:bg-zinc-950 dark:focus:bg-zinc-900 transition-all placeholder-gray-400 dark:placeholder-zinc-600"
              id="input-user-search"
            />
          </div>

          {/* Role Filter dropdown */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 pr-8 bg-gray-50 dark:bg-zinc-900 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-700 dark:border-zinc-800 focus:border-rose-600/50 rounded-lg text-xs text-gray-900 dark:text-zinc-100 dark:text-zinc-100 focus:outline-none focus:bg-white dark:bg-zinc-950 dark:focus:bg-zinc-900 transition-all appearance-none cursor-pointer"
              id="select-user-role-filter"
            >
              <option value="todos">Todos los Cargos</option>
              <option value="administrador">Administradores</option>
              <option value="compilador">Compiladores</option>
              <option value="activista">Activistas</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportUsers}
            className="px-3 py-2 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 border border-gray-200 dark:border-zinc-700"
            title="Exportar base de datos de usuarios"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Usuarios
          </button>
          
          <label className="px-3 py-2 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 border border-gray-200 dark:border-zinc-700 cursor-pointer">
            <Download className="w-3.5 h-3.5 rotate-180" />
            Importar Usuarios
            <input type="file" accept=".json" onChange={handleImportUsers} className="hidden" />
          </label>

          {/* Add User button */}
          <button
            onClick={openCreateForm}
            className="w-full md:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 dark:bg-rose-650 dark:hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            id="btn-open-create-user"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Operador</span>
          </button>
        </div>
      </div>

      {/* Form Overlay / Inline card */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white dark:bg-zinc-950 dark:bg-zinc-900 border border-gray-250 dark:border-zinc-700 dark:border-rose-950/30 p-6 rounded-2xl shadow-lg relative overflow-hidden text-gray-900 dark:text-zinc-100 dark:text-zinc-100"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700" />
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 dark:text-rose-500 font-mono">
                {editingUser ? 'Modificación de Oficio' : 'Alta y Registro de Personal'}
              </h3>
              <button
                onClick={handleCloseForm}
                className="p-1 rounded-lg hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-800 text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:text-zinc-300 dark:hover:text-white transition-all cursor-pointer"
                id="btn-close-user-form"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 mb-4 bg-rose-50 dark:bg-rose-950/30 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/50 dark:border-rose-900/40 rounded-xl flex items-start gap-2.5 text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 dark:text-rose-400 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 mb-4 bg-emerald-50 dark:bg-emerald-950/30 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/50 dark:border-emerald-900/40 rounded-xl flex items-start gap-2.5 text-emerald-700 dark:text-emerald-400 dark:text-emerald-400 text-xs">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-650 dark:text-zinc-400 mb-1.5">Código de Operador <span className="text-rose-500">*</span></label>
                <input 
                  type="text"
                  required
                  placeholder="ej. ADM-001 o COM-002"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  className="w-full bg-gray-50 dark:bg-zinc-900 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-700 dark:border-zinc-800 focus:border-rose-600/50 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:bg-white dark:bg-zinc-950 transition-all placeholder-gray-400 font-mono"
                  id="input-form-codigo"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-650 dark:text-zinc-400 mb-1.5">Nombre Completo <span className="text-rose-500">*</span></label>
                <input 
                  type="text"
                  required
                  placeholder="ej. Carlos Manuel de Céspedes"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-900 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-700 dark:border-zinc-800 focus:border-rose-600/50 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-zinc-100 dark:text-zinc-100 focus:outline-none focus:bg-white dark:bg-zinc-950 dark:focus:bg-zinc-900 transition-all placeholder-gray-400 dark:placeholder-zinc-650"
                  id="input-form-fullname"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-650 dark:text-zinc-400 mb-1.5">Nombre de Usuario de Oficio <span className="text-rose-500">*</span></label>
                <input 
                  type="text"
                  required
                  placeholder="ej. activista_bayamo"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-900 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-700 dark:border-zinc-800 focus:border-rose-600/50 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-zinc-100 dark:text-zinc-100 focus:outline-none focus:bg-white dark:bg-zinc-950 dark:focus:bg-zinc-900 transition-all placeholder-gray-400 dark:placeholder-zinc-650"
                  id="input-form-username"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-650 dark:text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-rose-600 dark:text-rose-500" />
                  <span>Teléfono Móvil (Soberano)</span>
                </label>
                <input 
                  type="text"
                  placeholder="ej. 54413935"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-gray-50 dark:bg-zinc-900 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-700 dark:border-zinc-800 focus:border-rose-600/50 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-zinc-100 dark:text-zinc-100 focus:outline-none focus:bg-white dark:bg-zinc-950 dark:focus:bg-zinc-900 transition-all placeholder-gray-400 dark:placeholder-zinc-650"
                  id="input-form-mobile"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-650 dark:text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-rose-600 dark:text-rose-500" />
                  <span>Contraseña de Acceso <span className="text-rose-500">*</span></span>
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Contraseña de alta seguridad"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-900 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-700 dark:border-zinc-800 focus:border-rose-600/50 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-zinc-100 dark:text-zinc-100 focus:outline-none focus:bg-white dark:bg-zinc-950 dark:focus:bg-zinc-900 transition-all placeholder-gray-400 dark:placeholder-zinc-650"
                    id="input-form-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                    id="btn-toggle-mgr-password"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-650 dark:text-zinc-400 mb-1.5">Cargo / Rol en el PCC</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-gray-50 dark:bg-zinc-900 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-700 dark:border-zinc-800 focus:border-rose-600/50 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-zinc-100 dark:text-zinc-100 focus:outline-none focus:bg-white dark:bg-zinc-950 dark:focus:bg-zinc-900 transition-colors cursor-pointer"
                  id="select-form-role"
                >
                  <option value="activista" className="bg-white dark:bg-zinc-950 dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 dark:text-zinc-100">Activista (Mapeador)</option>
                  <option value="compilador" className="bg-white dark:bg-zinc-950 dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 dark:text-zinc-100">Compilador (Consolidador)</option>
                  <option value="administrador" className="bg-white dark:bg-zinc-950 dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 dark:text-zinc-100">Administrador Municipal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-650 dark:text-zinc-400 mb-1.5">ID de Dispositivo (Vínculo Seguro)</label>
                <input 
                  type="text"
                  placeholder="ej. DEV_PCC_MOVIL_5412 (Vacío para autogenerar)"
                  value={userDeviceId}
                  onChange={(e) => setUserDeviceId(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-900 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-700 dark:border-zinc-800 focus:border-rose-600/50 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-zinc-100 dark:text-zinc-100 focus:outline-none focus:bg-white dark:bg-zinc-950 dark:focus:bg-zinc-900 transition-all placeholder-gray-400 dark:placeholder-zinc-650 font-mono"
                  id="input-form-deviceid"
                />
              </div>

              {role === 'administrador' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-650 dark:text-zinc-400 mb-1.5">Dirección ID Adicional 1 (Admin)</label>
                    <input 
                      type="text"
                      placeholder="ID de dispositivo alternativo"
                      value={extraDeviceIds[0]}
                      onChange={(e) => setExtraDeviceIds([e.target.value, extraDeviceIds[1]])}
                      className="w-full bg-gray-50 dark:bg-zinc-900 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-700 dark:border-zinc-800 focus:border-rose-600/50 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-zinc-100 dark:text-zinc-100 focus:outline-none focus:bg-white dark:bg-zinc-950 dark:focus:bg-zinc-900 transition-all placeholder-gray-400 dark:placeholder-zinc-650 font-mono"
                      id="input-form-extra-device-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-650 dark:text-zinc-400 mb-1.5">Dirección ID Adicional 2 (Admin)</label>
                    <input 
                      type="text"
                      placeholder="ID de dispositivo alternativo"
                      value={extraDeviceIds[1]}
                      onChange={(e) => setExtraDeviceIds([extraDeviceIds[0], e.target.value])}
                      className="w-full bg-gray-50 dark:bg-zinc-900 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-700 dark:border-zinc-800 focus:border-rose-600/50 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-zinc-100 dark:text-zinc-100 focus:outline-none focus:bg-white dark:bg-zinc-950 dark:focus:bg-zinc-900 transition-all placeholder-gray-400 dark:placeholder-zinc-650 font-mono"
                      id="input-form-extra-device-2"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-6 p-2 bg-gray-50 dark:bg-zinc-900 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl md:col-span-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                    className="text-rose-650 dark:text-rose-500 hover:opacity-85 transition-opacity cursor-pointer"
                    id="btn-toggle-2fa"
                  >
                    {twoFactorEnabled ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9 text-gray-400 dark:text-zinc-500" />}
                  </button>
                  <div>
                    <span className="block text-xs font-bold text-gray-900 dark:text-zinc-100 dark:text-zinc-100">Doble Factor de Seguridad (2FA)</span>
                    <span className="text-[10px] text-gray-500 dark:text-zinc-400 dark:text-zinc-400">Exige clave criptográfica obligatoria</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setActive(!active)}
                    className="text-rose-650 dark:text-rose-500 hover:opacity-85 transition-opacity cursor-pointer"
                    id="btn-toggle-active"
                  >
                    {active ? <ToggleRight className="w-9 h-9 text-emerald-600" /> : <ToggleLeft className="w-9 h-9 text-gray-400 dark:text-zinc-500" />}
                  </button>
                  <div>
                    <span className="block text-xs font-bold text-gray-900 dark:text-zinc-100 dark:text-zinc-100">Estado de Operador</span>
                    <span className="text-[10px] text-gray-500 dark:text-zinc-400 dark:text-zinc-400">{active ? 'Habilitado de Oficio' : 'Suspendido Temporal'}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 md:col-span-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:bg-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 dark:text-zinc-250 font-bold text-xs rounded-xl transition-all cursor-pointer border border-gray-200 dark:border-zinc-800 dark:border-zinc-700"
                  id="btn-cancel-form"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 dark:bg-rose-650 dark:hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  id="btn-save-form"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingUser ? 'Guardar Cambios' : 'Habilitar Operador'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users Table section */}
      <div className="bg-white dark:bg-zinc-950 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden text-gray-900 dark:text-zinc-100 dark:text-zinc-100 transition-all" id="users-table-container">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-zinc-800 dark:border-zinc-800 bg-white dark:bg-zinc-950 dark:bg-zinc-900 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 dark:text-white">Nómina Homologada de Personal Habilitado</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 dark:text-zinc-400 mt-1">Lista soberana de accesos y credenciales criptográficas de Bayamo</p>
          </div>
          <span className="text-xs font-mono font-bold text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 dark:bg-rose-950/20 px-2.5 py-1 border border-rose-200 dark:border-rose-900/50 dark:border-rose-900/50 rounded-lg">
            {filteredUsers.length} Coincidentes
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-zinc-900 dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 dark:border-zinc-800 text-gray-650 dark:text-zinc-400 text-[10.5px] uppercase tracking-wider font-mono font-bold">
                <th className="py-3.5 px-4">Operador / Usuario</th>
                <th className="py-3.5 px-4">Teléfono Móvil</th>
                <th className="py-3.5 px-4">Privilegio / Cargo</th>
                <th className="py-3.5 px-4">Contraseña</th>
                <th className="py-3.5 px-4">Dispositivo Seguro</th>
                <th className="py-3.5 px-4">Doble Factor</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 px-4 text-center text-xs text-gray-500 dark:text-zinc-400 dark:text-zinc-500 font-mono">
                    No se encontraron registros de operadores que coincidan con los criterios.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className="hover:bg-gray-50 dark:bg-zinc-900/50 dark:hover:bg-zinc-850/20 text-xs transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-gray-900 dark:text-zinc-100 dark:text-white">{user.fullName}</div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-gray-100 dark:bg-zinc-800 border border-gray-250 dark:border-zinc-700 text-gray-600 dark:text-zinc-400">{user.codigo}</span>
                      </div>
                      <div className="text-[10.5px] font-mono text-gray-400 dark:text-zinc-500 dark:text-zinc-500 mt-0.5">{user.username}</div>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-gray-700 dark:text-zinc-300 dark:text-zinc-300">
                      {user.mobile ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-rose-500" />
                          {user.mobile}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-zinc-500 dark:text-zinc-600 font-normal">Sin asignar</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {user.role === 'administrador' && (
                        <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-rose-50 dark:bg-rose-950/30 dark:bg-rose-950/30 text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 dark:text-rose-400 border border-rose-150 dark:border-rose-900/50 dark:border-rose-900/30 uppercase tracking-wider font-mono">
                          ADMINISTRADOR
                        </span>
                      )}
                      {user.role === 'compilador' && (
                        <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-150 dark:border-indigo-900/30 uppercase tracking-wider font-mono">
                          COMPILADOR
                        </span>
                      )}
                      {user.role === 'activista' && (
                        <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-amber-50 dark:bg-amber-950/30 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 dark:border-amber-900/30 uppercase tracking-wider font-mono">
                          ACTIVISTA
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-mono text-gray-600 dark:text-zinc-400 dark:text-zinc-400">
                      {user.password ? (
                        <span className="bg-gray-100 dark:bg-zinc-800 dark:bg-zinc-950 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-800 dark:border-zinc-800 text-[11px] font-semibold text-gray-700 dark:text-zinc-300 dark:text-zinc-300">
                          {user.password}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-zinc-500 dark:text-zinc-600 font-normal italic">Cripto (123456)</span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-mono text-gray-500 dark:text-zinc-400 dark:text-zinc-500">
                      {user.deviceId || 'N/D'}
                    </td>
                    <td className="py-4 px-4">
                      {user.twoFactorEnabled ? (
                        <span className="text-emerald-600 dark:text-emerald-500 font-bold flex items-center gap-1 font-mono text-[10.5px]">
                          <ShieldCheck className="w-3.5 h-3.5" /> SÍ (Clave)
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-zinc-500 dark:text-zinc-600 flex items-center gap-1 font-mono text-[10.5px]">
                          NO (Inseguro)
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className="cursor-pointer hover:opacity-80 transition-all"
                        title={user.active ? "Suspender operador" : "Habilitar operador"}
                        id={`btn-toggle-active-${user.id}`}
                      >
                        {user.active ? (
                          <span className="px-2 py-0.5 text-[9.5px] font-bold rounded bg-emerald-50 dark:bg-emerald-950/30 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/50 dark:border-emerald-900/30 uppercase tracking-widest font-mono">
                            ACTIVO
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9.5px] font-bold rounded bg-gray-100 dark:bg-zinc-800 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 dark:text-zinc-500 border border-gray-200 dark:border-zinc-800 dark:border-zinc-700 uppercase tracking-widest font-mono">
                            INACTIVO
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        {user.role === 'administrador' && (
                          <button
                            onClick={() => handleGenerateDeviceKey(user.id)}
                            className="p-1.5 bg-white dark:bg-zinc-950 dark:bg-zinc-950 hover:bg-amber-50 dark:bg-amber-950/30 dark:hover:bg-amber-950/20 border border-gray-250 dark:border-zinc-700 dark:border-zinc-800 text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 rounded-lg transition-all cursor-pointer"
                            title="Generar Llave de Dispositivo (JSON)"
                            id={`btn-key-user-${user.id}`}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditForm(user)}
                          className="p-1.5 bg-white dark:bg-zinc-950 dark:bg-zinc-950 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-800 border border-gray-250 dark:border-zinc-700 dark:border-zinc-800 text-gray-650 dark:text-zinc-300 hover:text-gray-900 dark:text-zinc-100 dark:hover:text-white rounded-lg transition-all cursor-pointer"
                          title="Editar credenciales"
                          id={`btn-edit-user-${user.id}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-1.5 bg-white dark:bg-zinc-950 dark:bg-zinc-950 hover:bg-rose-50 dark:bg-rose-950/30 dark:hover:bg-rose-950/20 border border-gray-250 dark:border-zinc-700 dark:border-zinc-800 text-rose-600 dark:text-rose-500 dark:text-rose-400 hover:text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 rounded-lg transition-all cursor-pointer"
                          title="Eliminar permanentemente"
                          id={`btn-delete-user-${user.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom In-App Modal: User Deletion Confirmation */}
      {userToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm text-left">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-gray-950 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <span>Confirmar Cese de Credenciales</span>
            </h3>
            <p className="text-xs text-gray-650 mt-2.5">
              ¿Está absolutamente seguro de revocar y eliminar permanentemente al operador <span className="font-bold text-gray-900">"{userToDelete.fullName}"</span> ({userToDelete.username})?
            </p>
            <p className="text-[11px] text-gray-500 mt-1.5 italic">
              Esta operación es irreversible y suspenderá inmediatamente todo acceso del dispositivo vinculado ({userToDelete.deviceId || 'Sin dispositivo'}).
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-3.5 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-3.5 py-1.5 text-xs text-white bg-rose-600 hover:bg-rose-700 font-bold rounded-lg transition-colors border border-rose-750 cursor-pointer"
              >
                Eliminar Operador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom In-App Modal: Warning message */}
      {warningMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm text-left">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-gray-950 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>Operación Denegada</span>
            </h3>
            <p className="text-xs text-gray-650 mt-2.5">
              {warningMessage}
            </p>
            <div className="flex items-center justify-end mt-4">
              <button
                onClick={() => setWarningMessage(null)}
                className="px-4 py-1.5 text-xs text-white bg-gray-800 hover:bg-gray-900 font-bold rounded-lg transition-colors cursor-pointer"
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
