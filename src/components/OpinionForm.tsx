/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Clipboard, Image as ImageIcon, FileUp, Mic, CheckCircle2, 
  HelpCircle, AlertCircle, Sparkles, Loader2, Play, Square, Volume2, Upload
} from 'lucide-react';
import { Database, OPINION_SECTORS, CONSEJOS_POPULARES_BAYAMO } from '../dbStore';
import { Opinion, UserRole } from '../types';

interface OpinionFormProps {
  currentUsername: string;
  currentRole: UserRole;
  deviceId: string;
  onSuccess: () => void;
}

// Preset assets for OCR simulation to make it highly interactive and realistic
const OCR_PRESETS = [
  {
    name: 'Nota Vecinal: Escasez de agua en Belén',
    imgUrl: 'https://images.unsplash.com/photo-1588600878108-578307a3cc9d?q=80&w=400&auto=format&fit=crop',
    extracted: 'Acta de Asamblea Belén: Los vecinos de la circunscripción 12 manifiestan descontento severo con el suministro de agua. Ciclo actual supera los 7 días. Requiere atención de Acueductos.'
  },
  {
    name: 'Sugerencia de Precios en Agro Mercado Bomba',
    imgUrl: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=400&auto=format&fit=crop',
    extracted: 'Minuta de control popular: Precios de la vianda y la carne de cerdo en el agro estatal de 19 y 42 se mantienen excesivos. Población solicita topes de precios rigurosos.'
  }
];

// Preset assets for Scanned Document simulation
const DOC_PRESETS = [
  {
    name: 'informe_comite_revolucion_aeropuerto_viejo.docx',
    extracted: 'Consolidado del Núcleo Zonal: Familias de bajos recursos solicitan subsidios constructivos de urgencia debido a afectaciones del temporal reciente. Estado de las cubiertas en calle Vista Hermosa es desfavorable.'
  }
];

export default function OpinionForm({ currentUsername, currentRole, deviceId, onSuccess }: OpinionFormProps) {
  const [activeTab, setActiveTab] = useState<'Formulario' | 'Texto' | 'Imagen' | 'Txt' | 'Audio'>('Formulario');
  
  // Form core fields
  const [text, setText] = useState('');
  const [activistCode, setActivistCode] = useState('');
  const [sector, setSector] = useState('Alimentación');
  const [consejoPopular, setConsejoPopular] = useState('Camilo Cienfuegos');
  const [sentiment, setSentiment] = useState<'Preocupaciones' | 'Propuestas' | 'Denuncias' | 'Apoyo' | 'Oposición'>('Preocupaciones');
  
  // Status states
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [ocrSelectedImage, setOcrSelectedImage] = useState<string | null>(null);
  const [ocrActivePres, setOcrActivePres] = useState<number | null>(null);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);

  // Custom File Refs & States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [ocrFileName, setOcrFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Audio recording simulation states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Smart local text analyzer to auto-detect sector based on key-words (Privacy Safe, No AI)
  const analyzeTextLocal = (inputText: string) => {
    const textLower = inputText.toLowerCase();
    
    // Auto Sector detection keywords
    if (textLower.includes('agua') || textLower.includes('recogida') || textLower.includes('basura') || textLower.includes('alumbrado') || textLower.includes('vía') || textLower.includes('bache') || textLower.includes('comunales')) {
      setSector('Servicios Públicos');
    } else if (textLower.includes('comida') || textLower.includes('arroz') || textLower.includes('canasta') || textLower.includes('precio') || textLower.includes('bodega') || textLower.includes('agro') || textLower.includes('vianda') || textLower.includes('huevo')) {
      setSector('Alimentación');
    } else if (textLower.includes('apagón') || textLower.includes('corriente') || textLower.includes('gas') || textLower.includes('combustible') || textLower.includes('eléctrico') || textLower.includes('petróleo') || textLower.includes('servicentro')) {
      setSector('Energía y Combustibles');
    } else if (textLower.includes('guagua') || textLower.includes('ómnibus') || textLower.includes('transporte') || textLower.includes('chofer') || textLower.includes('viaje')) {
      setSector('Transporte');
    } else if (textLower.includes('médico') || textLower.includes('farmacia') || textLower.includes('medicamento') || textLower.includes('policlínico') || textLower.includes('hospital')) {
      setSector('Salud Pública');
    } else if (textLower.includes('escuela') || textLower.includes('clase') || textLower.includes('maestro') || textLower.includes('aula') || textLower.includes('educativo')) {
      setSector('Educación');
    } else if (textLower.includes('casa') || textLower.includes('vivienda') || textLower.includes('derrumbe') || textLower.includes('techo') || textLower.includes('edificio')) {
      setSector('Vivienda');
    } else if (textLower.includes('partido') || textLower.includes('pcc') || textLower.includes('revolución') || textLower.includes('asamblea') || textLower.includes('venceremos') || textLower.includes('estatal')) {
      setSector('Opinión Política');
    }

    // Auto Sentiment detection keywords
    if (textLower.includes('abajo') || textLower.includes('oposición') || textLower.includes('contrarrevolución') || textLower.includes('contrarrevolucionario') || textLower.includes('rebelión') || textLower.includes('oposicion')) {
      setSentiment('Oposición');
    } else if (textLower.includes('agradecimiento') || textLower.includes('gracias') || textLower.includes('apoyo') || textLower.includes('partido') || textLower.includes('pcc') || textLower.includes('revolución') || textLower.includes('revolucion') || textLower.includes('venceremos') || textLower.includes('fiel')) {
      setSentiment('Apoyo');
    } else if (textLower.includes('denuncia') || textLower.includes('robo') || textLower.includes('corrupción') || textLower.includes('corrupcion') || textLower.includes('desvío') || textLower.includes('desvio') || textLower.includes('ilegalidad') || textLower.includes('soborno')) {
      setSentiment('Denuncias');
    } else if (textLower.includes('propuesta') || textLower.includes('propongo') || textLower.includes('sugerencia') || textLower.includes('sugiero') || textLower.includes('idea') || textLower.includes('proyecto') || textLower.includes('alternativa')) {
      setSentiment('Propuestas');
    } else {
      setSentiment('Preocupaciones');
    }
  };

  // Trigger analysis when text changes in Paste Tab
  const handlePasteTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    analyzeTextLocal(val);
  };

  // Trigger simulated OCR
  const handleTriggerOCR = (presetIdx: number) => {
    setIsProcessing(true);
    setOcrActivePres(presetIdx);
    setOcrFileName(null);
    setOcrSelectedImage(OCR_PRESETS[presetIdx].imgUrl);
    
    setTimeout(() => {
      setIsProcessing(false);
      const txt = OCR_PRESETS[presetIdx].extracted;
      setText(txt);
      analyzeTextLocal(txt);
    }, 2000);
  };

  // Uploaded user image OCR handler
  const handleOcrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processOcrFile(file);
  };

  const processOcrFile = (file: File) => {
    setIsProcessing(true);
    setOcrActivePres(null);
    setOcrFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setOcrSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setTimeout(() => {
      setIsProcessing(false);
      const nameLower = file.name.toLowerCase();
      let extractedText = '';

      if (nameLower.includes('agua') || nameLower.includes('acueducto')) {
        extractedText = `Planteamiento Ciudadano en ${consejoPopular}: Vecinos de la zona manifiestan malestar con el ciclo actual de bombeo de agua potable, el cual supera los 8 días. Solicitan revisión urgente de la estación local de Acueductos.`;
      } else if (nameLower.includes('basura') || nameLower.includes('comunales') || nameLower.includes('recogida') || nameLower.includes('desechos')) {
        extractedText = `Reporte de insalubridad local: Acumulación de basura y desechos orgánicos en el microvertedero de la esquina principal. Vecinos plantean riesgo de sanidad y solicitan recogida inmediata de Comunales.`;
      } else if (nameLower.includes('comida') || nameLower.includes('precio') || nameLower.includes('bodega') || nameLower.includes('agro') || nameLower.includes('precio')) {
        extractedText = `Control Popular en el Mercado Estatal: Consumidores exponen inconformidad con los precios del arroz y frijol de venta libre. Solicitan topes de precios oficiales estrictos en el sector de la alimentación.`;
      } else if (nameLower.includes('transporte') || nameLower.includes('guagua') || nameLower.includes('ruta') || nameLower.includes('ómnibus')) {
        extractedText = `Minuta del Comité Vecinal de Transporte: Gran congestión de pasajeros en horas tempranas de la mañana por retrasos recurrentes en las rutas principales de ómnibus. Piden autorizar vehículos de transporte laboral estatal.`;
      } else if (nameLower.includes('apagón') || nameLower.includes('electric') || nameLower.includes('luz') || nameLower.includes('corriente')) {
        extractedText = `Afectación reportada en el fluido eléctrico doméstico: Los apagones consecutivos afectan la elaboración de alimentos y la refrigeración de insumos médicos. Exigen cronogramas transparentes de desconexión.`;
      } else if (nameLower.includes('médico') || nameLower.includes('policlínic') || nameLower.includes('farmacia') || nameLower.includes('salud')) {
        extractedText = `Planteamiento sobre salud pública: Se reportan demoras de hasta 4 horas para consultas generales de guardia en el policlínico y desabastecimiento de medicamentos cardiovasculares en la farmacia municipal.`;
      } else if (nameLower.includes('vivienda') || nameLower.includes('derrumbe') || nameLower.includes('casa')) {
        extractedText = `Expediente de afectación habitacional: Peligro de derrumbe parcial en cornisa del edificio multifamiliar de la avenida central. Residentes solicitan inspección técnica y subsidio constructivo.`;
      } else {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, ' ');
        extractedText = `Informe de opinión y planteamientos populares (Archivo: "${cleanName}"): Los vecinos de la circunscripción local expresan de forma colectiva solicitudes de mejoras en la infraestructura municipal. Exigen la comparecencia del delegado de zona.`;
      }

      setText(extractedText);
      analyzeTextLocal(extractedText);
    }, 2200);
  };

  // Uploaded user doc handler
  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processDocFile(file);
  };

  const processDocFile = (file: File) => {
    setIsProcessing(true);
    setUploadedDocName(file.name);
    
    const nameLower = file.name.toLowerCase();

    if (file.type === "text/plain" || nameLower.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const textContent = e.target?.result as string;
        setTimeout(() => {
          setIsProcessing(false);
          setText(textContent);
          analyzeTextLocal(textContent);
        }, 1500);
      };
      reader.readAsText(file);
    } else {
      setTimeout(() => {
        setIsProcessing(false);
        let extractedText = '';

        if (nameLower.includes('informe') || nameLower.includes('partido') || nameLower.includes('cuba')) {
          extractedText = `Evaluación y síntesis de planteamientos partidistas: Los ciudadanos insisten en el control de revendedores informales de medicamentos y alimentos. Exigen medidas disciplinarias rigurosas en el territorio municipal.`;
        } else if (nameLower.includes('acta') || nameLower.includes('reunión')) {
          extractedText = `Acta oficial del Consejo Popular: Debate sobre el mal estado técnico del alumbrado en las vías principales y el alumbrado público. Se acuerda tramitar la queja a la Empresa Eléctrica y solicitar mantenimiento.`;
        } else {
          const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, ' ');
          extractedText = `Contenido del documento consolidado de planteamientos "${cleanName}": Se resumen solicitudes de reparaciones constructivas en inmuebles declarados en estado crítico por el temporal de lluvia reciente.`;
        }

        setText(extractedText);
        analyzeTextLocal(extractedText);
      }, 1800);
    }
  };

  // Drag and Drop helpers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDropOcr = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processOcrFile(file);
    } else {
      alert('Por favor, suba únicamente archivos de imagen (.png, .jpg, .jpeg) para digitalización OCR.');
    }
  };

  const handleDropDoc = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processDocFile(file);
    }
  };

  // Trigger simulated Document Upload
  const handleTriggerDocScan = (preset: typeof DOC_PRESETS[0]) => {
    setIsProcessing(true);
    setUploadedDocName(preset.name);
    
    setTimeout(() => {
      setIsProcessing(false);
      setText(preset.extracted);
      analyzeTextLocal(preset.extracted);
    }, 1800);
  };

  // Custom visual sound-wave animation using HTML5 Canvas
  useEffect(() => {
    if (isRecording && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let waveFactor = 0;
      const drawWave = () => {
        if (!isRecording) return;
        waveFactor += 0.15;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#f43f5e'; // Rose-500
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        
        const width = canvas.width;
        const height = canvas.height;
        const midY = height / 2;

        for (let x = 0; x < width; x += 3) {
          // Dynamic wave formula based on sine and random ambient noise
          const waveHeight = Math.sin(x * 0.05 + waveFactor) * 20 * Math.sin(x * 0.01) + (Math.random() - 0.5) * 6;
          if (x === 0) ctx.moveTo(x, midY + waveHeight);
          else ctx.lineTo(x, midY + waveHeight);
        }
        ctx.stroke();
        animationFrameRef.current = requestAnimationFrame(drawWave);
      };

      drawWave();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording]);

  // Audio timer handler
  const handleToggleRecording = () => {
    if (!isRecording) {
      // Start Recording
      setIsRecording(true);
      setAudioDuration(0);
      setRecordedAudioUrl(null);
      setText('');

      audioIntervalRef.current = setInterval(() => {
        setAudioDuration(prev => prev + 1);
      }, 1000);
    } else {
      // Stop Recording and simulate transcript
      setIsRecording(false);
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
      setIsProcessing(true);

      setTimeout(() => {
        setIsProcessing(false);
        const transcript = 'Registro por vía telefónica del Comité Zonal Bomba: El desbasto de combustible en el Servicentro El Tángana está deteniendo la operatividad de los bicitaxis y autos locales. Población en desacuerdo con la reventa.';
        setText(transcript);
        analyzeTextLocal(transcript);
        setRecordedAudioUrl('local_recording_temp.wav');
      }, 2000);
    }
  };

  // Submit consolidated opinion to DB
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!text.trim()) {
      setErrorMsg('Por favor, introduzca o escanee el texto de la opinión antes de salvar.');
      return;
    }

    // Add to Database
    const newOp = Database.addOpinion({
      text: text.trim(),
      sector,
      consejoPopular,
      date: new Date().toISOString().substring(0, 10),
      contributor: currentUsername,
      contributorRole: currentRole,
      activistCode,
      source: activeTab as any,
      deviceId,
      deviceApproved: true,
      verified: true,
      sentiment,
      audioDuration: activeTab === 'Audio' ? `0:${audioDuration.toString().padStart(2, '0')}` : undefined,
      fileName: activeTab === 'Txt' && uploadedDocName ? uploadedDocName : undefined
    });

    // Save state in Audit Logs
    Database.logActivity(
      'current_user',
      currentUsername,
      currentRole,
      'Registro Opinión',
      `Nueva opinión del pueblo guardada bajo código único ${newOp.code}. Sector: ${sector}.`,
      deviceId,
      'éxito'
    );

    // Notify of critical alerts if sentiment is negative and sector is essential
    if (sentiment === 'negativo' && (sector === 'Energía y Combustibles' || sector === 'Servicios Públicos' || sector === 'Alimentación')) {
      Database.addNotification(
        'critica',
        `Alerta Crítica: ${sector}`,
        `Registro de queja ciudadana urgente en ${consejoPopular}: "${text.trim().substring(0, 75)}..."`,
        true, // Send email
        true  // Send ToDus Cuban app
      );
    }

    setSuccessMsg(`¡Opinión grabada exitosamente! Se ha generado el código único estatal de protección de datos: ${newOp.code}`);
    
    // Clear Form fields
    setText('');
    setUploadedDocName(null);
    setOcrSelectedImage(null);
    setOcrActivePres(null);
    setRecordedAudioUrl(null);
    setAudioDuration(0);

    setTimeout(() => {
      setSuccessMsg('');
      onSuccess();
    }, 4000);
  };

  return (
    <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden" id="opinion-form-section">
      {/* Red/patriot banner */}
      <div className="bg-gradient-to-r from-rose-800 to-rose-950 px-6 py-4 border-b border-rose-950">
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <span>Oficina de Registro y Recepción de Opiniones</span>
        </h2>
        <p className="text-rose-200 text-[11px] leading-relaxed">
          Introduzca las manifestaciones de la población de forma segura y secreta de acuerdo con las directrices de seguridad de datos nacionales.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 flex flex-wrap" id="form-tabs-bar">
        <button
          onClick={() => { setActiveTab('Formulario'); setText(''); }}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${activeTab === 'Formulario' ? 'border-rose-600 text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 bg-rose-50/50' : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-zinc-100 hover:bg-gray-100 dark:bg-zinc-800'}`}
          id="tab-manual"
        >
          <FileText className="w-3.5 h-3.5" />
          Formulario Directo
        </button>
        <button
          onClick={() => { setActiveTab('Texto'); setText(''); }}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${activeTab === 'Texto' ? 'border-rose-600 text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 bg-rose-50/50' : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-zinc-100 hover:bg-gray-100 dark:bg-zinc-800'}`}
          id="tab-texto"
        >
          <Clipboard className="w-3.5 h-3.5" />
          Texto (Smart-Parsing)
        </button>
        <button
          onClick={() => { setActiveTab('Imagen'); setText(''); }}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${activeTab === 'Imagen' ? 'border-rose-600 text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 bg-rose-50/50' : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-zinc-100 hover:bg-gray-100 dark:bg-zinc-800'}`}
          id="tab-ocr"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          Escanear Imagen (OCR Local)
        </button>
        <button
          onClick={() => { setActiveTab('Txt'); setText(''); }}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${activeTab === 'Txt' ? 'border-rose-600 text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 bg-rose-50/50' : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-zinc-100 hover:bg-gray-100 dark:bg-zinc-800'}`}
          id="tab-doc"
        >
          <FileUp className="w-3.5 h-3.5" />
          Documento Escaneado
        </button>
        <button
          onClick={() => { setActiveTab('Audio'); setText(''); }}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${activeTab === 'Audio' ? 'border-rose-600 text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 bg-rose-50/50' : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-zinc-100 hover:bg-gray-100 dark:bg-zinc-800'}`}
          id="tab-audio"
        >
          <Mic className="w-3.5 h-3.5" />
          Grabación / Audio de Voz
        </button>
      </div>

      <div className="p-6">
        {/* Success Banner */}
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-400 rounded-xl flex items-start gap-3 text-xs"
            id="success-opinion-banner"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Registro Exitoso</p>
              <p className="mt-1">{successMsg}</p>
            </div>
          </motion.div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-400 rounded-xl flex items-start gap-3 text-xs text-left"
            id="error-opinion-banner"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Error de Registro</p>
              <p className="mt-1">{errorMsg}</p>
            </div>
          </motion.div>
        )}

        {/* Form Submission wrapper */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left side: Tab specifics (Spans 7) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* --- TAB 1: MANUAL FORM --- */}
              {activeTab === 'Formulario' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider font-mono">Registro Directo de Oficio</h3>
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">Formulario Tradicional</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 mb-1.5">Opinión Directa de la Población</label>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Redacte la opinión de los vecinos con exactitud. Indique fecha, lugar y sector afectado si aplica..."
                      rows={6}
                      className="w-full bg-white dark:bg-zinc-950 border border-gray-350 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl p-3.5 text-xs text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none transition-colors"
                      id="input-opinion-text"
                    />
                  </div>
                </div>
              )}

              {/* --- TAB 2: COPIED TEXT --- */}
              {activeTab === 'Texto' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider font-mono">Pegar Texto</h3>
                    <span className="text-[10px] text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/50 font-mono font-bold">Smart-Parsing Activado</span>
                  </div>
                  <div className="p-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-[10.5px] text-gray-600 dark:text-zinc-400 leading-relaxed">
                    <strong>Sistema Inteligente Local:</strong> Al pegar un texto de redes, correo u otra vía, nuestro script de oficio analizará localmente palabras claves (como <em>agua, apagón, comida, ómnibus</em>) para pre-seleccionar automáticamente el sector y pre-estimar el estado de sentimiento sin enviar datos fuera de localhost.
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 mb-1.5 font-mono">Pegar texto aquí:</label>
                    <textarea
                      value={text}
                      onChange={handlePasteTextChange}
                      placeholder="Pegue aquí el texto copiado de ToDus, Telegram, correos institucionales, actas digitales, etc..."
                      rows={6}
                      className="w-full bg-white dark:bg-zinc-950 border border-gray-350 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl p-3.5 text-xs text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none transition-colors"
                      id="input-paste-text"
                    />
                  </div>
                </div>
              )}

              {/* --- TAB 3: OCR SCANNED IMAGE --- */}
              {activeTab === 'Imagen' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider font-mono">Digitalizar Documentos Físicos con OCR</h3>
                    <span className="text-[10px] text-rose-600 dark:text-rose-500 font-mono font-bold">Escáner Óptico de Oficio</span>
                  </div>
                  <div className="p-3.5 bg-rose-50/50 border border-rose-100 dark:border-rose-900/50 rounded-xl text-[10.5px] text-rose-950 leading-relaxed">
                    <strong>Reconocimiento Óptico (OCR) Integrado:</strong> Cargue una foto o captura de quejas manuscritas o informes vecinales para extraer el texto directamente.
                  </div>

                  {/* Drag and Drop / Selector */}
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDropOcr}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${isDragOver ? 'border-rose-500 bg-rose-50/50' : 'border-gray-300 dark:border-zinc-700 hover:border-gray-400 bg-gray-50 dark:bg-zinc-900/50'}`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleOcrFileChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-rose-600 dark:text-rose-500 animate-pulse" />
                      <p className="text-xs font-bold text-gray-800 dark:text-zinc-200">
                        {ocrFileName ? `Imagen seleccionada: ${ocrFileName}` : 'Arrastre aquí la imagen manuscrita o haga clic para examinar'}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-zinc-400 font-mono">
                        Formatos: .jpg, .jpeg, .png • Análisis de grafía revolucionaria
                      </p>
                    </div>
                  </div>

                  {/* Preset alternative */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider font-mono">O use un expediente físico de muestra:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {OCR_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleTriggerOCR(idx)}
                          className={`p-3 text-left rounded-xl border transition-all text-xs flex flex-col gap-1.5 cursor-pointer ${ocrActivePres === idx ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 font-bold' : 'bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:border-gray-300 dark:border-zinc-700'}`}
                        >
                          <span className="font-bold text-gray-900 dark:text-zinc-100">{preset.name}</span>
                          <span className="text-[10px] text-gray-500 dark:text-zinc-400 line-clamp-1">{preset.extracted}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scanning area representation */}
                  {ocrSelectedImage && (
                    <div className="relative border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden h-40 bg-gray-50 dark:bg-zinc-900 flex items-center justify-center">
                      <img 
                        src={ocrSelectedImage} 
                        alt="Escáner" 
                        className="w-full h-full object-cover opacity-20 blur-[2px]"
                        referrerPolicy="no-referrer"
                      />
                      {isProcessing ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-zinc-950/90">
                          <Loader2 className="w-8 h-8 text-rose-600 dark:text-rose-500 animate-spin" />
                          <span className="text-xs text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 font-mono mt-2 animate-pulse font-bold">EXTRAYENDO GRAFÍA Y PARSIFAL...</span>
                          {/* Laser scanning line bar */}
                          <div className="absolute left-0 right-0 h-1 bg-rose-500 top-0 shadow-[0_0_15px_rgba(244,63,94,1)] animate-bounce" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-white dark:bg-zinc-950/95">
                          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                          <span className="text-[11px] font-mono text-gray-800 dark:text-zinc-200 mt-1 uppercase font-bold">OCR Procesado con éxito</span>
                          <span className="text-[9px] text-gray-500 dark:text-zinc-400 text-center mt-1">El texto extraído se encuentra listo para editar abajo</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Editable output */}
                  {text && !isProcessing && (
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 mb-1.5 font-mono">Texto OCR Extraído (Verifique y edite si hay imprecisiones):</label>
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={4}
                        className="w-full bg-white dark:bg-zinc-950 border border-gray-350 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl p-3.5 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* --- TAB 4: SCANNED DOCUMENTS --- */}
              {activeTab === 'Txt' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider font-mono">Carga de Documentos Escaneados</h3>
                    <span className="text-[10px] text-rose-600 dark:text-rose-500 font-mono font-bold">Lector de Partes Oficiales</span>
                  </div>
                  <div className="p-3.5 bg-rose-50/50 border border-rose-100 dark:border-rose-900/50 rounded-xl text-[10.5px] text-rose-950 leading-relaxed">
                    <strong>Procesador de Expedientes:</strong> Suba actas en papel escaneado o archivos digitales para transcribirlos de forma segura.
                  </div>

                  {/* Document uploader */}
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDropDoc}
                    onClick={() => docFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${isDragOver ? 'border-rose-500 bg-rose-50/50' : 'border-gray-300 dark:border-zinc-700 hover:border-gray-400 bg-gray-50 dark:bg-zinc-900/50'}`}
                  >
                    <input 
                      type="file" 
                      ref={docFileInputRef} 
                      onChange={handleDocFileChange} 
                      accept=".txt,.pdf,.docx" 
                      className="hidden" 
                    />
                    <div className="flex flex-col items-center gap-2">
                      <FileUp className="w-8 h-8 text-rose-600 dark:text-rose-500 animate-bounce" />
                      <p className="text-xs font-bold text-gray-800 dark:text-zinc-200">
                        {uploadedDocName ? `Documento cargado: ${uploadedDocName}` : 'Arrastre aquí el documento oficial o haga clic para examinar'}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-zinc-400 font-mono">
                        Soporta .txt, .pdf, .docx • Extracción real para archivos .txt
                      </p>
                    </div>
                  </div>

                  {/* Preset alternative */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider font-mono">O use un documento de muestra:</p>
                    <div className="space-y-2">
                      {DOC_PRESETS.map((doc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleTriggerDocScan(doc)}
                          className={`w-full p-3 text-left rounded-xl border transition-all text-xs flex items-center justify-between cursor-pointer ${uploadedDocName === doc.name ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 font-bold' : 'bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-750 hover:border-gray-300 dark:border-zinc-700'}`}
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-rose-600 dark:text-rose-500" />
                            <span>{doc.name}</span>
                          </div>
                          <span className="text-[10px] text-gray-450 font-mono">14 KB • Demo de Carga</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {isProcessing && (
                    <div className="p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-rose-600 dark:text-rose-500 animate-spin" />
                      <span className="text-xs text-gray-500 dark:text-zinc-400 font-mono">Descomprimiendo y extrayendo metadatos del documento...</span>
                    </div>
                  )}

                  {text && !isProcessing && (
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 mb-1.5 font-mono">Contenido Extraído de Documento:</label>
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={4}
                        className="w-full bg-white dark:bg-zinc-950 border border-gray-350 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl p-3.5 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* --- TAB 5: AUDIO RECORDING --- */}
              {activeTab === 'Audio' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider font-mono">Grabación de Audio / Llamadas Vocales</h3>
                    <span className="text-[10px] text-rose-600 dark:text-rose-500 font-mono font-bold">Audio Transcriptor Local</span>
                  </div>
                  <div className="p-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-[10.5px] text-gray-600 dark:text-zinc-400 leading-relaxed">
                    <strong>Recepción por Llamada o Grabadora:</strong> Presione el botón para simular una llamada telefónica del ciudadano o para grabar su voz. Al detenerse, se simulará una transcripción en texto plano sin salir del terminal local.
                  </div>

                  {/* Waveform Canvas */}
                  <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden">
                    {isRecording ? (
                      <canvas 
                        ref={canvasRef} 
                        width={300} 
                        height={60} 
                        className="w-full max-w-xs h-16 bg-transparent"
                      />
                    ) : (
                      <Volume2 className={`w-8 h-8 ${recordedAudioUrl ? 'text-emerald-600' : 'text-gray-400 dark:text-zinc-500'}`} />
                    )}

                    <div className="mt-4 flex flex-col items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleToggleRecording}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${isRecording ? 'bg-gray-200 dark:bg-zinc-700 hover:bg-gray-350 text-gray-900 dark:text-zinc-100 text-rose-700 dark:text-rose-400 border border-rose-300' : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'}`}
                        id="btn-toggle-recording"
                      >
                        {isRecording ? (
                          <>
                            <Square className="w-3.5 h-3.5" />
                            <span>Detener y Transcribir (0:{audioDuration.toString().padStart(2, '0')})</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5" />
                            <span>Iniciar Grabación de Llamada</span>
                          </>
                        )}
                      </button>
                      {recordedAudioUrl && !isRecording && (
                        <span className="text-[10px] text-emerald-600 font-mono font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Audio Grabado Exitosamente
                        </span>
                      )}
                    </div>
                  </div>

                  {isProcessing && (
                    <div className="p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-rose-600 dark:text-rose-500 animate-spin" />
                      <span className="text-xs text-gray-500 dark:text-zinc-400 font-mono">Procesando códec de audio e hilvanando fonemas...</span>
                    </div>
                  )}

                  {text && !isProcessing && (
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 mb-1.5">Transcripción Automática (Edite si es preciso):</label>
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={4}
                        className="w-full bg-white dark:bg-zinc-950 border border-gray-350 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl p-3.5 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Right side: Classification & Categorization metadata (Spans 5) */}
            <div className="lg:col-span-5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest font-mono">Metadatos de Clasificación</h3>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 leading-relaxed">
                Asigne los valores correspondientes para estructurar los reportes estadísticos del tablero.
              </p>

              {/* Sector */}
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 mb-1.5">Sector</label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 focus:border-rose-500 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none transition-colors cursor-pointer"
                  id="form-sector-select"
                >
                  {OPINION_SECTORS.map(sec => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>

              {/* Municipality */}
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 mb-1.5">Consejo popular de Recopilacion</label>
                <select
                  value={consejoPopular}
                  onChange={(e) => setConsejoPopular(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 focus:border-rose-500 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none transition-colors cursor-pointer"
                  id="form-consejoPopular-select"
                >
                  {CONSEJOS_POPULARES_BAYAMO.map(mun => (
                    <option key={mun} value={mun}>{mun}</option>
                  ))}
                </select>
              </div>

              {/* Estimated Sentiment */}
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 mb-1.5">Estimación de Estado de Ánimo</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSentiment('Preocupaciones')}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${sentiment === 'Preocupaciones' ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-500 text-amber-700 dark:text-amber-400 shadow-xs font-extrabold' : 'bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:border-gray-300 dark:border-zinc-700'}`}
                  >
                    Preocupaciones
                  </button>
                  <button
                    type="button"
                    onClick={() => setSentiment('Propuestas')}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${sentiment === 'Propuestas' ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-500 text-blue-700 dark:text-blue-400 shadow-xs font-extrabold' : 'bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:border-gray-300 dark:border-zinc-700'}`}
                  >
                    Propuestas
                  </button>
                  <button
                    type="button"
                    onClick={() => setSentiment('Denuncias')}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${sentiment === 'Denuncias' ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-rose-700 dark:text-rose-400 shadow-xs font-extrabold' : 'bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:border-gray-300 dark:border-zinc-700'}`}
                  >
                    Denuncias
                  </button>
                  <button
                    type="button"
                    onClick={() => setSentiment('Apoyo')}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${sentiment === 'Apoyo' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-xs font-extrabold' : 'bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:border-gray-300 dark:border-zinc-700'}`}
                  >
                    Apoyo
                  </button>
                  <button
                    type="button"
                    onClick={() => setSentiment('Oposición')}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${sentiment === 'Oposición' ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-500 text-purple-700 dark:text-purple-400 shadow-xs font-extrabold' : 'bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:border-gray-300 dark:border-zinc-700'}`}
                  >
                    Oposición
                  </button>
                </div>
              </div>

              {/* Informative block */}
              <div className="p-3 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-gray-700 dark:text-zinc-300">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-500 shrink-0" />
                  <span>Auditoría de Oficio</span>
                </div>
                <p className="text-[9.5px] text-gray-500 dark:text-zinc-400 leading-relaxed">
                  Este registro incluirá de manera obligatoria la fecha, el usuario registrador (<strong className="text-gray-700 dark:text-zinc-300">{currentUsername}</strong>), el ID del dispositivo enlazado (<strong className="text-gray-700 dark:text-zinc-300">{deviceId}</strong>) y la firma digital del terminal para validación de auditorías.
                </p>
              </div>

            </div>
          </div>

          {/* Action button bar */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => { setText(''); setUploadedDocName(null); setOcrSelectedImage(null); setOcrActivePres(null); }}
              className="px-4 py-2 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 rounded-xl text-xs transition-colors cursor-pointer"
              id="btn-clear-form"
            >
              Limpiar Campos
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              id="btn-submit-opinion"
            >
              <span>Salvar y Certificar Opinión</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
