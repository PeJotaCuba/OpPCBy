/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Filter, Calendar, MapPin, Tag, Download, Search, RefreshCw, FileText, 
  CheckCircle, AlertOctagon, TrendingUp, HelpCircle, FileSpreadsheet, Trash2, PlusCircle
} from 'lucide-react';
import { Database, OPINION_SECTORS, CONSEJOS_POPULARES_BAYAMO } from '../dbStore';
import { Opinion, UserRole } from '../types';

interface DashboardProps {
  currentRole: UserRole;
  currentUsername: string;
  onNavigateToForm?: () => void;
}

export default function Dashboard({ currentRole, currentUsername, onNavigateToForm }: DashboardProps) {
  const [opinions, setOpinions] = useState<Opinion[]>(() => Database.getOpinions());
  
  // Filter States
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedConsejo, setSelectedConsejo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSentiment, setSelectedSentiment] = useState('');

  // In-app warning/confirmation modal states
  const [opinionToDelete, setOpinionToDelete] = useState<{ id: string; code: string } | null>(null);
  const [showResetDatabaseConfirm, setShowResetDatabaseConfirm] = useState(false);
  const [deniedMessage, setDeniedMessage] = useState<string | null>(null);

  // Reload data helper
  const reloadData = () => {
    setOpinions(Database.getOpinions());
  };

  // Delete option handler (Only for administrators and compilers)
  const handleDelete = (id: string, code: string) => {
    if (currentRole === 'activista') {
      setDeniedMessage('Permiso denegado: Los activistas no disponen de privilegios de eliminación.');
      return;
    }
    setOpinionToDelete({ id, code });
  };

  const confirmDeleteOpinion = () => {
    if (!opinionToDelete) return;
    const { id, code } = opinionToDelete;
    Database.deleteOpinion(id);
    Database.logActivity(
      'current_user',
      currentUsername,
      currentRole,
      'Eliminar Opinión',
      `Opinión con código ${code} eliminada del registro estatal.`,
      localStorage.getItem('pcc_device_id') || 'DEV_UNKNOWN',
      'advertencia'
    );
    reloadData();
    setOpinionToDelete(null);
  };

  const handleResetDatabase = () => {
    if (currentRole !== 'administrador') {
      setDeniedMessage('Permiso denegado: Únicamente el Administrador Municipal cuenta con privilegios para inicializar el sistema.');
      return;
    }
    setShowResetDatabaseConfirm(true);
  };

  const confirmResetDatabase = () => {
    Database.clearAllSimulationData();
    Database.logActivity(
      'current_user',
      currentUsername,
      currentRole,
      'Reiniciar Base de Datos',
      'Inicialización completa de la base de datos para producción real. Datos de simulación borrados.',
      localStorage.getItem('pcc_device_id') || 'DEV_UNKNOWN',
      'advertencia'
    );
    reloadData();
    setShowResetDatabaseConfirm(false);
  };

  // Filter Logic
  const filteredOpinions = useMemo(() => {
    return opinions.filter(op => {
      // Search
      const matchesSearch = search === '' || 
        op.text.toLowerCase().includes(search.toLowerCase()) ||
        op.code.toLowerCase().includes(search.toLowerCase()) ||
        op.contributor.toLowerCase().includes(search.toLowerCase());

      // Sector
      const matchesSector = selectedSector === '' || op.sector === selectedSector;

      // Municipality
      const matchesMunicipality = selectedConsejo === '' || op.consejoPopular === selectedConsejo;

      // Sentiment
      const matchesSentiment = selectedSentiment === '' || op.sentiment === selectedSentiment;

      // Date range
      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && op.date >= startDate;
      }
      if (endDate) {
        matchesDate = matchesDate && op.date <= endDate;
      }

      return matchesSearch && matchesSector && matchesMunicipality && matchesSentiment && matchesDate;
    });
  }, [opinions, search, selectedSector, selectedConsejo, selectedSentiment, startDate, endDate]);

  // Reset all filters
  const resetFilters = () => {
    setSearch('');
    setSelectedSector('');
    setSelectedConsejo('');
    setStartDate('');
    setEndDate('');
    setSelectedSentiment('');
  };

  // --- STATS COMPUTATION ---
  const stats = useMemo(() => {
    const total = filteredOpinions.length;
    let preocupaciones = 0;
    let propuestas = 0;
    let denuncias = 0;
    let apoyo = 0;
    let oposicion = 0;

    filteredOpinions.forEach(op => {
      const s = op.sentiment;
      if (s === 'Preocupaciones' || s === 'preocupacion' as any || s === 'negativo' as any) preocupaciones++;
      else if (s === 'Propuestas') propuestas++;
      else if (s === 'Denuncias') denuncias++;
      else if (s === 'Apoyo' || s === 'positivo' as any) apoyo++;
      else if (s === 'Oposición' || s === 'oposicion' as any) oposicion++;
      else preocupaciones++;
    });

    return {
      total,
      preocupaciones,
      propuestas,
      denuncias,
      apoyo,
      oposicion
    };
  }, [filteredOpinions]);

  // --- CHART DATA PREPARATION ---
  
  // 1. Sector Distribution (Limit to Top 5 sectors with most opinions)
  const sectorChartData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    OPINION_SECTORS.forEach(s => counts[s] = 0);
    
    filteredOpinions.forEach(op => {
      if (counts[op.sector] !== undefined) {
        counts[op.sector]++;
      } else {
        counts[op.sector] = 1;
      }
    });

    return Object.keys(counts).map(sector => ({
      name: sector,
      cantidad: counts[sector]
    })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);
  }, [filteredOpinions]);

  // 2. Sentiment Distribution
  const sentimentChartData = useMemo(() => {
    return [
      { name: 'Preocupaciones', value: stats.preocupaciones, color: '#F59E0B' }, // Amber
      { name: 'Propuestas', value: stats.propuestas, color: '#3B82F6' }, // Blue
      { name: 'Denuncias', value: stats.denuncias, color: '#EF4444' }, // Red
      { name: 'Apoyo', value: stats.apoyo, color: '#10B981' }, // Emerald
      { name: 'Oposición', value: stats.oposicion, color: '#8B5CF6' } // Purple
    ].filter(item => item.value > 0);
  }, [stats]);

  // 3. Date Trends
  const trendChartData = useMemo(() => {
    const counts: { [key: string]: { preocupaciones: number, propuestas: number, denuncias: number, apoyo: number, oposicion: number, total: number } } = {};
    
    filteredOpinions.forEach(op => {
      const dateStr = op.date;
      if (!counts[dateStr]) {
        counts[dateStr] = { preocupaciones: 0, propuestas: 0, denuncias: 0, apoyo: 0, oposicion: 0, total: 0 };
      }
      
      const s = op.sentiment;
      if (s === 'Preocupaciones' || s === 'preocupacion' as any || s === 'negativo' as any) counts[dateStr].preocupaciones++;
      else if (s === 'Propuestas') counts[dateStr].propuestas++;
      else if (s === 'Denuncias') counts[dateStr].denuncias++;
      else if (s === 'Apoyo' || s === 'positivo' as any) counts[dateStr].apoyo++;
      else if (s === 'Oposición' || s === 'oposicion' as any) counts[dateStr].oposicion++;
      
      counts[dateStr].total++;
    });

    return Object.keys(counts).map(date => ({
      fecha: date,
      ...counts[date]
    })).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(-10); // Show last 10 dates with activity
  }, [filteredOpinions]);

  // --- EXPORT FUNCTIONS ---
  
  // 1. Export CSV
  const handleExportCSV = () => {
    if (filteredOpinions.length === 0) {
      alert('No existen registros que coincidan con los filtros seleccionados para exportar.');
      return;
    }

    let csvContent = 'ID,Codigo Verification,Sector,Municipio,Fecha,Sentimiento,Origen,Opinión,Registrado por\n';
    
    filteredOpinions.forEach(op => {
      const sanitizedText = op.text.replace(/"/g, '""').replace(/\n/g, ' ');
      csvContent += `"${op.id}","${op.code}","${op.sector}","${op.consejoPopular}","${op.date}","${op.sentiment}","${op.source}","${sanitizedText}","${op.contributor}"\n`;
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PCC_Opiniones_Pueblo_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Database.logActivity(
      'current_user',
      currentUsername,
      currentRole,
      'Exportar CSV',
      `Consolidación de opiniones exportada a CSV (${filteredOpinions.length} registros)`,
      localStorage.getItem('pcc_device_id') || 'DEV_UNKNOWN'
    );
  };

  // 2. Export XLSX (Relational Spreadsheet XML)
  const handleExportXLSX = () => {
    if (filteredOpinions.length === 0) {
      alert('No existen registros para exportar.');
      return;
    }

    // Build standard Excel-compatible XML (SpreadsheetML) that opens perfectly as a genuine styled grid!
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="11" ss:Name="Segoe UI"/>
   <Interior ss:Color="#C01010" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:Bold="1" ss:Size="14" ss:Color="#111111" ss:Name="Segoe UI"/>
  </Style>
  <Style ss:ID="Cell">
   <Font ss:Size="10" ss:Name="Segoe UI"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Opiniones del Pueblo">
  <Table>
   <Column ss:Width="80"/>
   <Column ss:Width="60"/>
   <Column ss:Width="120"/>
   <Column ss:Width="100"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="300"/>
   <Column ss:Width="120"/>
   <Row ss:Height="25">
    <Cell ss:StyleID="Title"><Data ss:Type="String">PARTIDO COMUNISTA DE CUBA - CONSOLIDADO OFICIAL</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Fecha de Generación:</Data></Cell>
    <Cell><Data ss:Type="String">${new Date().toISOString().substring(0,10)}</Data></Cell>
   </Row>
   <Row ss:Index="4" ss:Height="20">
    <Cell ss:StyleID="Header"><Data ss:Type="String">ID Registro</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Cód. Único</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Sector / Tema</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Municipio</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Fecha</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Estado Sentimiento</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Método Entrada</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Texto de Opinión Ciudadana</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Activista / Compilador</Data></Cell>
   </Row>`;

    filteredOpinions.forEach(op => {
      xml += `
   <Row ss:Height="18">
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${op.id}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${op.code}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${op.sector}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${op.consejoPopular}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${op.date}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${op.sentiment.toUpperCase()}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${op.source}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${op.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${op.contributor}</Data></Cell>
   </Row>`;
    });

    xml += `
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PCC_Opiniones_Excel_${new Date().toISOString().substring(0,10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Database.logActivity(
      'current_user',
      currentUsername,
      currentRole,
      'Exportar Excel',
      `Opiniones consolidadas exportadas en formato XLSX estructurado (${filteredOpinions.length} registros)`,
      localStorage.getItem('pcc_device_id') || 'DEV_UNKNOWN'
    );
  };

  // 3. Export DOCX (Word Document HTML Wrapper)
  const handleExportDOCX = () => {
    if (filteredOpinions.length === 0) {
      alert('No existen registros para exportar.');
      return;
    }

    let docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<title>Consolidado Opiniones del Pueblo</title>
<style>
body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 20px; }
h1 { color: #be123c; font-size: 18pt; border-bottom: 2px solid #be123c; padding-bottom: 5px; }
h2 { color: #0f172a; font-size: 13pt; margin-top: 25px; }
table { width: 100%; border-collapse: collapse; margin-top: 15px; }
th { background-color: #f1f5f9; color: #be123c; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 10pt; }
td { border: 1px solid #cbd5e1; padding: 8px; font-size: 9.5pt; vertical-align: top; }
.footer { font-size: 8pt; text-align: center; color: #64748b; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
.sentiment { font-weight: bold; text-transform: uppercase; }
.positivo { color: #10b981; }
.neutro { color: #64748b; }
.negativo { color: #f43f5e; }
</style>
</head>
<body>
<h1>PARTIDO COMUNISTA DE CUBA</h1>
<p style="font-size:11pt; font-weight:bold; color:#475569;">Consolidado de Opiniones del Pueblo - Comité Municipal de Bayamo</p>
<p style="font-size:9pt; color:#64748b;"><strong>Fecha de Emisión:</strong> ${new Date().toISOString().substring(0,16).replace('T', ' ')} • <strong>Exportado por:</strong> ${currentUsername} (${currentRole})</p>

<h2>Resumen Estadístico General</h2>
<p>Se recopilaron <strong>${stats.total} opiniones</strong> en total bajo los criterios de búsqueda actuales. Su distribución según el estado de ánimo y valoración del pueblo es la siguiente:</p>
<ul>
  <li>Preocupaciones: <strong>${stats.preocupaciones}</strong></li>
  <li>Propuestas: <strong>${stats.propuestas}</strong></li>
  <li>Denuncias: <strong>${stats.denuncias}</strong></li>
  <li>Apoyo: <strong>${stats.apoyo}</strong></li>
  <li>Oposición: <strong>${stats.oposicion}</strong></li>
</ul>

<h2>Tabla Detallada de Opiniones de la Población</h2>
<table>
  <thead>
    <tr>
      <th style="width:10%;">Código</th>
      <th style="width:15%;">Sector</th>
      <th style="width:15%;">Municipio</th>
      <th style="width:12%;">Fecha</th>
      <th style="width:10%;">Sentimiento</th>
      <th style="width:38%;">Opinión Registrada</th>
    </tr>
  </thead>
  <tbody>`;

    filteredOpinions.forEach(op => {
      docHtml += `
    <tr>
      <td><strong>${op.code}</strong></td>
      <td>${op.sector}</td>
      <td>${op.consejoPopular}</td>
      <td>${op.date}</td>
      <td class="sentiment ${op.sentiment}">${op.sentiment}</td>
      <td>${op.text}</td>
    </tr>`;
    });

    docHtml += `
  </tbody>
</table>

<div class="footer">
  "Patria o Muerte, Venceremos" • Comité Municipal del PCC, Oficina de Opinión del Pueblo • Documento Oficial Encriptado en Localhost
</div>
</body>
</html>`;

    const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PCC_Opiniones_Documento_${new Date().toISOString().substring(0,10)}.docx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Database.logActivity(
      'current_user',
      currentUsername,
      currentRole,
      'Exportar Word',
      `Expediente consolidado de opiniones de la población exportado a DOCX (${filteredOpinions.length} registros)`,
      localStorage.getItem('pcc_device_id') || 'DEV_UNKNOWN'
    );
  };

  // 4. Print / PDF action
  const handlePrintPDF = () => {
    window.print();
    Database.logActivity(
      'current_user',
      currentUsername,
      currentRole,
      'Imprimir PDF',
      `Consolidado impreso o guardado en PDF de forma local para seguridad de datos.`,
      localStorage.getItem('pcc_device_id') || 'DEV_UNKNOWN'
    );
  };

  return (
    <div className="space-y-6" id="dashboard-tab">
      {/* Search and Filters Header Panel */}
      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm relative overflow-hidden" id="filter-panel">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-rose-600 dark:text-rose-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100 tracking-tight">Criterios de Análisis y Filtrado</h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            {onNavigateToForm && (
              <button
                onClick={onNavigateToForm}
                className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md"
                id="btn-navigate-to-form"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Registrar Opinión</span>
              </button>
            )}
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 text-xs text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:border-zinc-700 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Limpiar Filtros
            </button>
            {currentRole === 'administrador' && (
              <button
                onClick={handleResetDatabase}
                className="px-3 py-1.5 text-xs text-white bg-[#DC2626] hover:bg-[#B91C1C] border border-red-700 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-bold shadow-md ring-1 ring-red-500/20"
                title="Inicializar base de datos para producción real"
                id="btn-reset-database"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reiniciar Base de Datos</span>
              </button>
            )}
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Text search */}
          <div className="relative">
            <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Búsqueda Rápida</label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Código, texto, autor..."
                className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 focus:border-rose-500 rounded-xl py-2 pl-9 pr-4 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none placeholder-gray-450 transition-colors"
                id="filter-search"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 absolute left-3 top-3" />
            </div>
          </div>

          {/* Sector filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Sector / Temática</label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 focus:border-rose-500 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none transition-colors cursor-pointer"
              id="filter-sector"
            >
              <option value="">-- Todos los Sectores --</option>
              {OPINION_SECTORS.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          {/* Municipality filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Consejo Popular</label>
            <select
              value={selectedConsejo}
              onChange={(e) => setSelectedConsejo(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 focus:border-rose-500 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none transition-colors cursor-pointer"
              id="filter-consejoPopular"
            >
              <option value="">-- Todos los Consejos --</option>
              {CONSEJOS_POPULARES_BAYAMO.map(mun => (
                <option key={mun} value={mun}>{mun}</option>
              ))}
            </select>
          </div>

          {/* Sentiment filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Estado de Sentimiento</label>
            <select
              value={selectedSentiment}
              onChange={(e) => setSelectedSentiment(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 focus:border-rose-500 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none transition-colors cursor-pointer"
              id="filter-sentiment"
            >
              <option value="">-- Todos los Sentimientos --</option>
              <option value="Preocupaciones">Preocupaciones</option>
   <option value="Propuestas">Propuestas</option>
   <option value="Denuncias">Denuncias</option>
   <option value="Apoyo">Apoyo</option>
   <option value="Oposición">Oposición</option>
            </select>
          </div>

          {/* Start date */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Fecha Inicial</label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 focus:border-rose-500 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none transition-colors cursor-pointer"
                id="filter-start-date"
              />
            </div>
          </div>

          {/* End date */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Fecha Final</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 focus:border-rose-500 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none transition-colors cursor-pointer"
                id="filter-end-date"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Numerical Indicators Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" id="stats-grid">
        {/* Card 1: Total Opinions */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <p className="text-[9px] uppercase tracking-wider text-gray-500 dark:text-zinc-400 font-mono font-bold">Consolidado Total</p>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-black text-gray-900 dark:text-zinc-100">{stats.total}</h3>
            <span className="text-[10px] bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded px-1.5 py-0.5 font-mono">100%</span>
          </div>
        </div>

        {/* Card 2: Preocupaciones */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <p className="text-[9px] uppercase tracking-wider text-amber-600 dark:text-amber-500 font-mono font-bold">Preocupaciones</p>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-500">{stats.preocupaciones}</h3>
            <span className="text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-750 dark:text-amber-400 rounded px-1.5 py-0.5 font-mono">
              {stats.total > 0 ? Math.round((stats.preocupaciones / stats.total) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Card 3: Propuestas */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <p className="text-[9px] uppercase tracking-wider text-blue-600 dark:text-blue-500 font-mono font-bold">Propuestas</p>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-black text-blue-600 dark:text-blue-500">{stats.propuestas}</h3>
            <span className="text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-750 dark:text-blue-400 rounded px-1.5 py-0.5 font-mono">
              {stats.total > 0 ? Math.round((stats.propuestas / stats.total) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Card 4: Denuncias */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <p className="text-[9px] uppercase tracking-wider text-rose-600 dark:text-rose-500 font-mono font-bold">Denuncias</p>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-500">{stats.denuncias}</h3>
            <span className="text-[10px] bg-rose-50 dark:bg-rose-950/30 text-rose-750 dark:text-rose-450 rounded px-1.5 py-0.5 font-mono">
              {stats.total > 0 ? Math.round((stats.denuncias / stats.total) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Card 5: Apoyo */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <p className="text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-500 font-mono font-bold">Apoyo</p>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-500">{stats.apoyo}</h3>
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-750 dark:text-emerald-400 rounded px-1.5 py-0.5 font-mono">
              {stats.total > 0 ? Math.round((stats.apoyo / stats.total) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Card 6: Oposición */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <p className="text-[9px] uppercase tracking-wider text-purple-600 dark:text-purple-500 font-mono font-bold">Oposición</p>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-black text-purple-600 dark:text-purple-500">{stats.oposicion}</h3>
            <span className="text-[10px] bg-purple-50 dark:bg-purple-950/30 text-purple-750 dark:text-purple-400 rounded px-1.5 py-0.5 font-mono">
              {stats.total > 0 ? Math.round((stats.oposicion / stats.total) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="charts-grid">
        {/* Graph 1: Sector count (12 cols grid, span 7) */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex flex-col h-96 text-gray-900 dark:text-zinc-100">
          <h4 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest mb-4">Opiniones registradas por Sector de Población</h4>
          <div className="flex-1 w-full min-h-0">
            {sectorChartData.every(s => s.cantidad === 0) ? (
              <div className="h-full flex items-center justify-center text-gray-400 dark:text-zinc-500 text-xs">
                No hay datos suficientes que graficar con los filtros aplicados.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorChartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={9} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', color: '#111827', borderRadius: '12px' }}
                    labelStyle={{ color: '#111827', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#e11d48', fontSize: '11px' }}
                  />
                  <Bar dataKey="cantidad" fill="#E11D48" radius={[4, 4, 0, 0]} maxBarSize={35}>
                    {sectorChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#E11D48' : '#be123c'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Graph 2: Sentiment distribution ( span 5) */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex flex-col h-96 text-gray-900 dark:text-zinc-100">
          <h4 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest mb-4">Distribución del Estado de Ánimo (Sentimiento)</h4>
          <div className="flex-1 w-full min-h-0 flex flex-col">
            <div className="flex-1 min-h-0">
              {sentimentChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 dark:text-zinc-500 text-xs">
                  Sin valoraciones registradas.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sentimentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: '12px' }}
                      itemStyle={{ fontSize: '11px', color: '#111827' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Manual Legend */}
            <div className="space-y-1.5 pt-4 border-t border-gray-200 dark:border-zinc-800">
              {sentimentChartData.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-xs text-gray-600 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-gray-900 dark:text-zinc-100">{item.value} ({Math.round(item.value / (stats.total || 1) * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trend graph (area) */}
      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex flex-col h-80 text-gray-900 dark:text-zinc-100">
        <h4 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest mb-4">Evolución de Recopilación de Opiniones (Historial Diario)</h4>
        <div className="flex-1 w-full min-h-0">
          {trendChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 dark:text-zinc-500 text-xs">
              No hay datos suficientes con los filtros aplicados.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E11D48" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#E11D48" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="fecha" stroke="#71717a" fontSize={9} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: '12px' }}
                  labelStyle={{ color: '#111827', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="total" name="Total Recibido" stroke="#E11D48" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Main Grid View of opinions with actions */}
      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden text-gray-900 dark:text-zinc-100" id="opinions-list">
        {/* List Header and EXPORT ACTIONS */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-zinc-950">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-rose-600 dark:text-rose-500" />
              <span>Archivo Consolidado de Opiniones de Población</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Registros del sistema bajo estricta auditoría</p>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2 flex-wrap" id="export-buttons-group">
            <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-mono font-bold mr-1">EXPORTAR EXPEDIENTE:</span>
            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 text-xs text-gray-750 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:bg-zinc-900 rounded-lg hover:text-gray-950 transition-colors flex items-center gap-1 cursor-pointer"
              title="Descargar CSV plano"
              id="btn-export-csv"
            >
              <Download className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportXLSX}
              className="px-2.5 py-1.5 text-xs text-gray-750 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:bg-zinc-900 rounded-lg hover:text-gray-950 transition-colors flex items-center gap-1 cursor-pointer"
              title="Descargar en Excel estructurado"
              id="btn-export-xlsx"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel (XLSX)</span>
            </button>
            <button
              onClick={handleExportDOCX}
              className="px-2.5 py-1.5 text-xs text-gray-750 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:bg-zinc-900 rounded-lg hover:text-gray-950 transition-colors flex items-center gap-1 cursor-pointer"
              title="Descargar en Word de oficina"
              id="btn-export-docx"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Word (DOCX)</span>
            </button>
            <button
              onClick={handlePrintPDF}
              className="px-2.5 py-1.5 text-xs text-rose-750 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 rounded-lg hover:text-rose-900 transition-colors flex items-center gap-1 cursor-pointer font-bold"
              title="Imprimir reporte en papel o guardar en PDF"
              id="btn-export-pdf"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-500" />
              <span>Guardar PDF / Imprimir</span>
            </button>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="overflow-x-auto">
          {filteredOpinions.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-zinc-400 text-xs flex flex-col items-center justify-center gap-2">
              <AlertOctagon className="w-8 h-8 text-gray-400 dark:text-zinc-500 animate-pulse" />
              <span>No se encontraron opiniones que coincidan con la búsqueda o criterios definidos.</span>
              <button onClick={resetFilters} className="text-rose-600 dark:text-rose-500 hover:underline mt-1 font-bold">Limpiar filtros de búsqueda</button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 text-[10.5px] uppercase tracking-wider font-mono">
                  <th className="py-3.5 px-4 font-bold">Ref / Cód</th>
                  <th className="py-3.5 px-4 font-bold">Sector de Población</th>
                  <th className="py-3.5 px-4 font-bold">Lugar (Consejo Popular)</th>
                  <th className="py-3.5 px-4 font-bold">Fecha / Origen</th>
                  <th className="py-3.5 px-4 font-bold">Sentimiento</th>
                  <th className="py-3.5 px-6 font-bold w-1/3">Opinión Directa Registrada</th>
                  <th className="py-3.5 px-4 font-bold">Dispositivo / Oficial</th>
                  {currentRole !== 'activista' && <th className="py-3.5 px-4 font-bold text-center">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOpinions.map((op, index) => (
                  <tr key={op.id} className="hover:bg-gray-50 dark:bg-zinc-900 transition-colors text-xs text-gray-750">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-800 dark:text-zinc-200 font-mono bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800 px-2 py-0.5 rounded text-center shrink-0">
                        {op.code}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-gray-900 dark:text-zinc-100">{op.sector}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{op.consejoPopular}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-gray-600 dark:text-zinc-400">{op.date}</div>
                      <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500 tracking-wider mt-0.5 font-mono">{op.source.replace('_', ' ')}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {(op.sentiment === 'Preocupaciones' || op.sentiment === 'preocupacion' as any || op.sentiment === 'negativo' as any) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 uppercase">Preocupación</span>
                      )}
                      {op.sentiment === 'Propuestas' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 uppercase">Propuesta</span>
                      )}
                      {op.sentiment === 'Denuncias' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 uppercase">Denuncia</span>
                      )}
                      {(op.sentiment === 'Apoyo' || op.sentiment === 'positivo' as any) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 uppercase">Apoyo</span>
                      )}
                      {(op.sentiment === 'Oposición' || op.sentiment === 'oposicion' as any) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50 uppercase">Oposición</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 leading-relaxed">
                      <p className="text-gray-800 dark:text-zinc-200 line-clamp-3 hover:line-clamp-none transition-all duration-300">{op.text}</p>
                      {op.fileName && (
                        <div className="text-[10px] text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 font-mono mt-1 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-900/50 inline-block">
                          Doc: {op.fileName}
                        </div>
                      )}
                      {op.audioDuration && (
                        <div className="text-[10px] text-blue-700 dark:text-blue-400 font-mono mt-1 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded border border-blue-100 inline-block">
                          Audio: {op.audioDuration} seg
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-[10px] text-gray-600 dark:text-zinc-400">{op.deviceId}</div>
                      <div className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">Por: {op.contributor}</div>
                    </td>
                    {currentRole !== 'activista' && (
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDelete(op.id, op.code)}
                          className="p-1.5 text-gray-400 dark:text-zinc-500 hover:text-rose-600 dark:text-rose-500 bg-white dark:bg-zinc-950 hover:bg-rose-50 dark:bg-rose-950/30 border border-gray-200 dark:border-zinc-800 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar opinión de forma permanente"
                          id={`btn-delete-${op.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Custom In-App Modal: Deletion Confirmation */}
      {opinionToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm text-left">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-gray-950 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <span>Confirmar Eliminación Permanente</span>
            </h3>
            <p className="text-xs text-gray-650 mt-2.5">
              ¿Está seguro de eliminar de forma permanente la opinión <span className="font-mono font-bold bg-gray-100 px-1.5 py-0.5 rounded text-rose-700">{opinionToDelete.code}</span>?
            </p>
            <p className="text-[11px] text-gray-500 mt-1.5 italic">
              Esta acción es irreversible y será registrada bajo estricta auditoría estatal del PCC.
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                onClick={() => setOpinionToDelete(null)}
                className="px-3.5 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteOpinion}
                className="px-3.5 py-1.5 text-xs text-white bg-rose-600 hover:bg-rose-705 font-bold rounded-lg transition-colors border border-rose-700 cursor-pointer"
              >
                Eliminar Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom In-App Modal: Database Reset Confirmation */}
      {showResetDatabaseConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm text-left">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-gray-950 flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-red-650 animate-pulse" />
              <span>Inicializar Sistema Real (PCC)</span>
            </h3>
            <p className="text-xs text-gray-650 mt-2.5">
              ¿Está absolutamente seguro de borrar permanentemente <strong>TODOS los datos de simulación</strong>?
            </p>
            <p className="text-xs text-gray-650 mt-1.5">
              Esto eliminará de forma irreversible:
            </p>
            <ul className="text-xs text-gray-500 list-disc list-inside mt-1.5 space-y-1">
              <li>Todas las opiniones registradas</li>
              <li>Todas las bitácoras de actividad y auditoría</li>
              <li>Todos los dispositivos autorizados (excepto este administrador)</li>
              <li>Todos los operadores locales creados</li>
            </ul>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                onClick={() => setShowResetDatabaseConfirm(false)}
                className="px-3.5 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmResetDatabase}
                className="px-3.5 py-1.5 text-xs text-white bg-red-600 hover:bg-red-700 font-bold rounded-lg transition-colors border border-red-750 cursor-pointer"
              >
                Inicializar para Producción Real
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom In-App Modal: Permission Denied Warning */}
      {deniedMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm text-left">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-gray-950 flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-amber-500" />
              <span>Acción Denegada</span>
            </h3>
            <p className="text-xs text-gray-650 mt-2.5">
              {deniedMessage}
            </p>
            <div className="flex items-center justify-end mt-4">
              <button
                onClick={() => setDeniedMessage(null)}
                className="px-4 py-1.5 text-xs text-white bg-gray-800 hover:bg-gray-905 font-bold rounded-lg transition-colors cursor-pointer"
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
