/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Opinion, Device, ActivityLog, AppNotification, UserRole } from './types';

// Default seed data for Consejos Populares of Bayamo
export const CONSEJOS_POPULARES_BAYAMO = [
  'Aeropuerto Viejo',
  'Barranca',
  'Camilo Cienfuegos',
  'El Almirante',
  'El Dátil',
  'El Horno',
  'El Valle',
  'Entronque de Bueycito',
  'Francisco Vicente Aguilera',
  'Guasimilla',
  'Jesús Menéndez',
  'Julia',
  'Las Mangas',
  'Las Tamaras',
  'Mabaya',
  'Molino Rojo',
  'Bomba',
  'Rosa la Bayamesa',
  'San Juan el Cristo',
  'Santa María',
  'Siboney',
  'Guillermo Soler'
];

export const OPINION_SECTORS = [
  'Alimentación',
  'Servicios Públicos',
  'Energía y Combustibles',
  'Transporte',
  'Salud Pública',
  'Educación',
  'Vivienda',
  'Opinión Política'
];

// Initial pre-populated Users
const DEFAULT_USERS: User[] = [
  {
    id: 'user_1_admin',
    codigo: 'ADM-001',
    username: 'oppccadmin',
    fullName: 'Administrador Municipal',
    role: 'administrador',
    deviceId: 'DEV-PC-OP-BY-ADM-001-JMYFQD',
    extraDeviceIds: [],
    approvedDevice: true,
    twoFactorSecret: 'KRQW643FMNZG2YLTOB2W43C5MFZGQ53S',
    twoFactorEnabled: false,
    active: true,
    mobile: '54413935',
    password: 'OpinionBy0426'
  },
  {
    id: 'user_2_comp',
    codigo: 'COM-001',
    username: 'compilador_demo',
    fullName: 'Compilador de Prueba',
    role: 'compilador',
    deviceId: 'DEV-PC-OP-BY-COM-001-XXXXXX',
    approvedDevice: true,
    twoFactorSecret: 'KRQW643FMNZG2YLTOB2W43C5MFZGQ53S',
    twoFactorEnabled: false,
    active: true,
    mobile: '55522222',
    password: 'demo'
  },
  {
    id: 'user_3_act',
    codigo: 'ACT-001',
    username: 'activista_demo',
    fullName: 'Activista de Prueba',
    role: 'activista',
    deviceId: 'DEV-PC-OP-BY-ACT-001-XXXXXX',
    approvedDevice: true,
    twoFactorSecret: 'KRQW643FMNZG2YLTOB2W43C5MFZGQ53S',
    twoFactorEnabled: false,
    active: true,
    mobile: '55533333',
    password: 'demo'
  }
];

// Seed Opinions spanning May - July 2026
const DEFAULT_OPINIONS: Opinion[] = [];

// Initial Devices
const DEFAULT_DEVICES: Device[] = [
  { id: 'DEV-PC-OP-BY-ADM-001-JMYFQD', name: 'PC Oficina Municipal PCC', ownerName: 'Administrador Municipal', role: 'administrador', status: 'aprobado', lastUsed: new Date().toISOString() },
  { id: 'DEV-PC-OP-BY-COM-001-XXXXXX', name: 'Terminal Compilador Demo', ownerName: 'Compilador de Prueba', role: 'compilador', status: 'aprobado', lastUsed: new Date().toISOString() },
  { id: 'DEV-PC-OP-BY-ACT-001-XXXXXX', name: 'Terminal Activista Demo', ownerName: 'Activista de Prueba', role: 'activista', status: 'aprobado', lastUsed: new Date().toISOString() }
];

// Initial Logs
const DEFAULT_LOGS: ActivityLog[] = [];

// Initial Notifications
const DEFAULT_NOTIFICATIONS: AppNotification[] = [];

// Database operations class targeting Local Storage
export class Database {
  public static restoreBackup(data: any): void {
    if (data.users) this.setStored('users', data.users);
    if (data.opinions) this.setStored('opinions', data.opinions);
    if (data.devices) this.setStored('devices', data.devices);
    if (data.logs) this.setStored('logs', data.logs);
    if (data.notifications) this.setStored('notifications', data.notifications);
  }

  private static getStored<T>(key: string, defaults: T[]): T[] {
    const data = localStorage.getItem(`pcc_db_${key}`);
    if (!data) {
      localStorage.setItem(`pcc_db_${key}`, JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(data);
  }

  private static setStored<T>(key: string, data: T[]): void {
    localStorage.setItem(`pcc_db_${key}`, JSON.stringify(data));
  }

  // --- USERS ---
  public static getUsers(): User[] {
    const users = this.getStored<User>('users', DEFAULT_USERS);
    
    // Safety check: ensure demo and correct admin users exist
    const hasCompilador = users.some(u => u.username === 'compilador_demo');
    const hasActivista = users.some(u => u.username === 'activista_demo');
    const adminUser = users.find(u => u.role === 'administrador');
    
    if (!hasCompilador || !hasActivista || (adminUser && adminUser.username !== 'oppccadmin')) {
      if (!hasCompilador) users.push(DEFAULT_USERS.find(u => u.username === 'compilador_demo')!);
      if (!hasActivista) users.push(DEFAULT_USERS.find(u => u.username === 'activista_demo')!);
      
      // Force update admin if old credentials exist
      if (adminUser && adminUser.username !== 'oppccadmin') {
        const newAdmin = DEFAULT_USERS.find(u => u.role === 'administrador')!;
        const adminIdx = users.findIndex(u => u.role === 'administrador');
        users[adminIdx] = newAdmin;
      }

      this.setStored('users', users);
    }
    
    return users;
  }

  public static importUsers(newUsers: User[]): void {
    const currentUsers = this.getUsers();
    newUsers.forEach(nu => {
      const idx = currentUsers.findIndex(u => u.id === nu.id || u.username === nu.username);
      if (idx !== -1) {
        // Only update non-admin users from import to prevent accidental lockouts of the local admin
        if (currentUsers[idx].role !== 'administrador') {
          currentUsers[idx] = nu;
        }
      } else {
        currentUsers.push(nu);
      }
    });
    this.setStored('users', currentUsers);
  }

  public static addAdminDeviceKey(deviceId: string): boolean {
    const users = this.getUsers();
    const admin = users.find(u => u.role === 'administrador');
    if (admin) {
      if (!admin.extraDeviceIds) admin.extraDeviceIds = [];
      if (!admin.extraDeviceIds.includes(deviceId) && admin.deviceId !== deviceId) {
        admin.extraDeviceIds.push(deviceId);
        this.saveUser(admin);
        return true;
      }
    }
    return false;
  }

  public static saveUser(user: User): void {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    this.setStored('users', users);
  }

  public static deleteUser(id: string): void {
    const users = this.getUsers();
    const updated = users.filter(u => u.id !== id);
    this.setStored('users', updated);
  }

  // --- OPINIONS ---
  public static getOpinions(): Opinion[] {
    return this.getStored<Opinion>('opinions', DEFAULT_OPINIONS);
  }

  public static addOpinion(opinion: Omit<Opinion, 'id' | 'code'>): Opinion {
    const opinions = this.getOpinions();
    const id = `op_${Date.now()}`;
    const code = `OP${Math.floor(1000 + Math.random() * 9000)}`;
    const newOpinion: Opinion = {
      ...opinion,
      id,
      code
    };
    opinions.unshift(newOpinion);
    this.setStored('opinions', opinions);
    return newOpinion;
  }

  public static deleteOpinion(id: string): void {
    const opinions = this.getOpinions();
    const updated = opinions.filter(op => op.id !== id);
    this.setStored('opinions', updated);
  }

  // --- DEVICES ---
  public static getDevices(): Device[] {
    const devices = this.getStored<Device>('devices', DEFAULT_DEVICES);
    
    // Ensure demo devices and admin device are present
    const hasAdminDevice = devices.some(d => d.id === 'DEV-PC-OP-BY-ADM-001-JMYFQD');
    const hasCompDevice = devices.some(d => d.id === 'DEV-PC-OP-BY-COM-001-XXXXXX');
    const hasActDevice = devices.some(d => d.id === 'DEV-PC-OP-BY-ACT-001-XXXXXX');
    
    if (!hasAdminDevice || !hasCompDevice || !hasActDevice) {
      if (!hasAdminDevice) devices.push(DEFAULT_DEVICES.find(d => d.id === 'DEV-PC-OP-BY-ADM-001-JMYFQD')!);
      if (!hasCompDevice) devices.push(DEFAULT_DEVICES.find(d => d.id === 'DEV-PC-OP-BY-COM-001-XXXXXX')!);
      if (!hasActDevice) devices.push(DEFAULT_DEVICES.find(d => d.id === 'DEV-PC-OP-BY-ACT-001-XXXXXX')!);
      this.setStored('devices', devices);
    }
    
    return devices;
  }

  public static updateDeviceStatus(deviceId: string, status: 'aprobado' | 'pendiente' | 'bloqueado'): void {
    const devices = this.getDevices();
    const device = devices.find(d => d.id === deviceId);
    if (device) {
      device.status = status;
      this.setStored('devices', devices);

      // Update associated users' device approval
      const users = this.getUsers();
      users.forEach(u => {
        if (u.deviceId === deviceId || u.extraDeviceIds?.includes(deviceId)) {
          u.approvedDevice = (status === 'aprobado');
          this.saveUser(u);
        }
      });
    }
  }

  public static registerDevice(device: Device): void {
    const devices = this.getDevices();
    const idx = devices.findIndex(d => d.id === device.id);
    if (idx >= 0) {
      devices[idx] = device;
    } else {
      devices.push(device);
    }
    this.setStored('devices', devices);
  }

  // --- ACTIVITY LOGS ---
  public static getLogs(): ActivityLog[] {
    return this.getStored<ActivityLog>('logs', DEFAULT_LOGS);
  }

  public static logActivity(
    userId: string,
    fullName: string,
    role: UserRole | 'sistema',
    action: string,
    details: string,
    deviceId: string,
    status: 'éxito' | 'advertencia' | 'error' = 'éxito'
  ): void {
    const logs = this.getLogs();
    const newLog: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      userId,
      userFullName: fullName,
      role,
      action,
      details,
      deviceId,
      status
    };
    logs.unshift(newLog);
    this.setStored('logs', logs);
  }

  public static clearLogs(): void {
    this.setStored('logs', []);
  }

  public static clearAllSimulationData(): void {
    this.setStored('opinions', []);
    this.setStored('logs', []);
    this.setStored('devices', DEFAULT_DEVICES);
    this.setStored('users', DEFAULT_USERS);
    this.setStored('notifications', []);
  }

  // --- NOTIFICATIONS ---
  public static getNotifications(): AppNotification[] {
    return this.getStored<AppNotification>('notifications', DEFAULT_NOTIFICATIONS);
  }

  public static addNotification(
    type: 'critica' | 'informacion' | 'exito',
    title: string,
    message: string,
    sendEmail = false,
    sendToDus = false
  ): AppNotification {
    const notifications = this.getNotifications();
    const newNot: AppNotification = {
      id: `not_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      title,
      message,
      sentToEmail: sendEmail,
      sentToToDus: sendToDus,
      read: false
    };
    notifications.unshift(newNot);
    this.setStored('notifications', notifications);
    return newNot;
  }

  public static markAllNotificationsAsRead(): void {
    const notifications = this.getNotifications();
    notifications.forEach(n => n.read = true);
    this.setStored('notifications', notifications);
  }

  // --- RELATIONAL SQL SIMULATOR ---
  // Returns raw table structures to support the SQL queries visualizer requested by the user
  public static getSQLTables(): { [key: string]: { columns: string[]; rows: any[] } } {
    const users = this.getUsers();
    const opinions = this.getOpinions();
    const devices = this.getDevices();
    const logs = this.getLogs();

    return {
      usuarios: {
        columns: ['id', 'username', 'fullName', 'role', 'deviceId', 'approvedDevice', 'twoFactorEnabled'],
        rows: users.map(u => ({
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          role: u.role,
          deviceId: u.deviceId,
          approvedDevice: u.approvedDevice ? 'TRUE' : 'FALSE',
          twoFactorEnabled: u.twoFactorEnabled ? 'TRUE' : 'FALSE'
        }))
      },
      opiniones: {
        columns: ['id', 'code', 'text_excerpt', 'sector', 'date', 'consejoPopular', 'deviceId', 'sentiment'],
        rows: opinions.map(o => ({
          id: o.id,
          code: o.code,
          text_excerpt: o.text.substring(0, 30) + '...',
          sector: o.sector,
          date: o.date,
          consejoPopular: o.consejoPopular,
          deviceId: o.deviceId,
          sentiment: o.sentiment
        }))
      },
      dispositivos: {
        columns: ['id', 'name', 'ownerName', 'role', 'status', 'lastUsed'],
        rows: devices.map(d => ({
          id: d.id,
          name: d.name,
          ownerName: d.ownerName,
          role: d.role,
          status: d.status,
          lastUsed: d.lastUsed
        }))
      },
      auditoria: {
        columns: ['id', 'timestamp', 'userFullName', 'action', 'details', 'status'],
        rows: logs.slice(0, 30).map(l => ({
          id: l.id,
          timestamp: l.timestamp.substring(11, 19),
          userFullName: l.userFullName,
          action: l.action,
          details: l.details,
          status: l.status
        }))
      }
    };
  }

  // A light interactive local SQL engine to perform basic selects for the "SQL tab"
  public static executeQuery(query: string): { columns: string[]; rows: any[]; error?: string } {
    const q = query.trim().toLowerCase();
    const tables = this.getSQLTables();

    if (!q.startsWith('select')) {
      return {
        columns: [],
        rows: [],
        error: 'Este simulador local admite únicamente consultas seguras de tipo "SELECT * FROM <tabla>" para auditoría.'
      };
    }

    let tableName = '';
    if (q.includes('from usuarios')) tableName = 'usuarios';
    else if (q.includes('from opiniones')) tableName = 'opiniones';
    else if (q.includes('from dispositivos')) tableName = 'dispositivos';
    else if (q.includes('from auditoria')) tableName = 'auditoria';
    else {
      return {
        columns: [],
        rows: [],
        error: 'Tabla no encontrada. Las tablas válidas de la base de datos SQL son: "usuarios", "opiniones", "dispositivos", "auditoria".'
      };
    }

    const table = tables[tableName];
    let filteredRows = [...table.rows];

    // Simple WHERE filters implementation for simulation (e.g. where status = 'aprobado' or where role = 'administrador')
    if (q.includes('where')) {
      const parts = q.split('where');
      const condition = parts[1].trim();

      if (condition.includes('status') && condition.includes('aprobado')) {
        filteredRows = filteredRows.filter(r => r.status?.toLowerCase() === 'aprobado');
      } else if (condition.includes('role') && condition.includes('administrador')) {
        filteredRows = filteredRows.filter(r => r.role?.toLowerCase() === 'administrador');
      } else if (condition.includes('sentiment') && condition.includes('negativo')) {
        filteredRows = filteredRows.filter(r => r.sentiment?.toLowerCase() === 'negativo');
      } else if (condition.includes('sector')) {
        const sectorMatch = condition.match(/['"](.+?)['"]/);
        if (sectorMatch) {
          const sectorName = sectorMatch[1].toLowerCase();
          filteredRows = filteredRows.filter(r => r.sector?.toLowerCase() === sectorName);
        }
      }
    }

    // Simple limit
    if (q.includes('limit')) {
      const parts = q.split('limit');
      const limitVal = parseInt(parts[1].trim(), 10);
      if (!isNaN(limitVal)) {
        filteredRows = filteredRows.slice(0, limitVal);
      }
    }

    return {
      columns: table.columns,
      rows: filteredRows
    };
  }
}
