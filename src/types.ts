/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'administrador' | 'compilador' | 'activista';

export interface User {
  codigo: string;
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  deviceId: string;
  extraDeviceIds?: string[];
  approvedDevice: boolean;
  twoFactorSecret: string;
  twoFactorEnabled: boolean;
  active: boolean;
  mobile?: string;
  password?: string;
}

export interface Opinion {
  id: string;
  code: string; // Unique 6-character code
  text: string;
  sector: string; // e.g., 'Salud', 'Educación', 'Transporte', 'Alimentación', 'Energía', 'Vivienda', 'Otros'
  date: string; // ISO date format YYYY-MM-DD
  contributor: string; // Name of recorder
  contributorRole: UserRole;
  source: 'Formulario' | 'Imagen' | 'Txt' | 'Audio' | 'Texto';
  consejoPopular: string;
  deviceId: string;
  deviceApproved: boolean;
  verified: boolean;
  sentiment: 'Preocupaciones' | 'Propuestas' | 'Denuncias' | 'Apoyo' | 'Oposición';
  activistCode?: string;
  audioDuration?: string;
  fileName?: string;
}

export interface Device {
  id: string;
  name: string;
  ownerName: string;
  role: UserRole;
  status: 'aprobado' | 'pendiente' | 'bloqueado';
  lastUsed: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO format
  userId: string;
  userFullName: string;
  role: UserRole | 'sistema';
  action: string; // e.g., 'Inicio de Sesión', 'Verificación 2FA', 'Registro Opinión', 'Aprobación Dispositivo', 'Exportación CSV'
  details: string;
  deviceId: string;
  status: 'éxito' | 'advertencia' | 'error';
}

export interface AppNotification {
  id: string;
  timestamp: string;
  type: 'critica' | 'informacion' | 'exito';
  title: string;
  message: string;
  sentToEmail: boolean;
  sentToToDus: boolean;
  read: boolean;
}

export interface SQLTable {
  name: string;
  columns: string[];
  rows: any[];
}
