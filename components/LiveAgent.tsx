
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { SALES_ARCHETYPES, RABEN_KILLER_POINTS, CHILEAN_PRO_VOCABULARY, STEERING_COMMANDS, VOICES } from '../constants';
import { ConnectionState } from '../types';
import { createPcmBlob, decodeAudioData, base64ToArrayBuffer } from '../utils/audioUtils';
import AudioVisualizer from './AudioVisualizer';
import { ChevronDown, ChevronUp, Mic, Zap, User, Gauge, XCircle, PhoneOff, Play, Loader2 } from 'lucide-react';

interface LiveAgentProps {
  strategyId: string;
  clientName: string;
  executiveName: string;
  companyName?: string; 
  onHUDToggle?: (active: boolean) => void;
}

const TONES = [
  { id: 'assertive', label: 'Cerrador 🎯', prompt: 'Be dominant, direct, and highly confident. Take control of the call immediately.' },
  { id: 'energetic', label: 'Vibrante 😃', prompt: 'Be high energy, enthusiastic, and fast-paced.' },
  { id: 'professional', label: 'Ejecutivo 👔', prompt: 'Maintain a corporate, high-end banking alternative tone.' },
];

const LiveAgent: React.FC<LiveAgentProps> = ({ strategyId, clientName, executiveName, companyName, onHUDToggle }) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const [selectedVoice, setSelectedVoice] = useState('Carla'); 
  const [selectedTone, setSelectedTone] = useState('assertive');
  const [selectedArchetype, setSelectedArchetype] = useState('wolf');
  const [speechSpeed, setSpeechSpeed] = useState(1.1); 
  const [isChileanMode, setIsChileanMode] = useState(true); 
  const [enableAdvancedMode, setEnableAdvancedMode] = useState(false);
  
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const selectedArchetypeObj = SALES_ARCHETYPES.find(s => s.id === selectedArchetype) || SALES_ARCHETYPES[0];
  const selectedVoiceObj = VOICES.find(v => v.id === selectedVoice) || VOICES[0];
  const selectedToneObj = TONES.find(t => t.id === selectedTone) || TONES[0];

  useEffect(() => {
    const isHUDActive = connectionState === ConnectionState.CONNECTED && enableAdvancedMode;
    onHUDToggle?.(isHUDActive);
  }, [connectionState, enableAdvancedMode, onHUDToggle]);

  const stopAudio = () => {
    audioSourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
    });
    audioSourcesRef.current = [];
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    if (inputContextRef.current) { inputContextRef.current.close(); inputContextRef.current = null; }
    if (outputContextRef.current) { outputContextRef.current.close(); outputContextRef.current = null; }
    if (sessionRef.current) { try { sessionRef.current.close(); } catch (e) {} sessionRef.current = null; }
  };

  const interrupt = () => {
    audioSourcesRef.current.forEach(source => { try { source.stop(); } catch (e) {} });
    audioSourcesRef.current = []; 
    if (outputContextRef.current) { nextStartTimeRef.current = outputContextRef.current.currentTime; }
    setAgentSpeaking(false);
  };

  const handlePreviewVoice = async (voiceId: string, geminiVoice: string) => {
    if (previewingVoice) return;
    setPreviewingVoice(voiceId);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: "Hola, yo soy tu asistente de Raben." }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: geminiVoice },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const audioBuffer = await decodeAudioData(base64ToArrayBuffer(base64Audio), ctx, 24000);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.onended = () => {
                setPreviewingVoice(null);
                ctx.close();
            };
            source.start(0);
        } else {
            setPreviewingVoice(null);
        }
    } catch (e) {
        console.error("Preview failed", e);
        setPreviewingVoice(null);
    }
  };

  const sendSteeringCommand = async (command: { id: string, prompt: string }) => {
    if (!sessionRef.current) return;
    try {
        await (sessionRef.current as any).sendRealtimeInput([{ text: command.prompt }]);
    } catch (e) {
        console.error("Failed to steer:", e);
    }
  };

  const connect = async () => {
    setErrorMsg(null);
    setConnectionState(ConnectionState.CONNECTING);
    nextStartTimeRef.current = 0;
    audioSourcesRef.current = [];

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key not found");

      const ai = new GoogleGenAI({ apiKey });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputContextRef.current = inputCtx;
      outputContextRef.current = outputCtx;

      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const systemInstruction = `
        # SYSTEM INSTRUCTION: EL CLOSER SENIOR DE RABEN (V2.0)

        ## 1. IDENTIDAD Y POSICIONAMIENTO
        Eres ${executiveName}, un Ejecutivo Senior de Factoring en Raben. Tu misión no es "informar", es "cerrar". Eres un experto en liquidez inmediata para empresas chilenas. Hablas con la seguridad de quien sabe que tiene la mejor solución del mercado para un problema de caja.
        Estás hablando con ${clientName} de la empresa ${companyName || 'su empresa'}.

        - **Tu Rol:** Socio estratégico y facilitador de flujo de caja.
        - **Tu Meta:** Obtener el PDF de la factura, el RUT del emisor o agendar una reunión de cierre.
        - **Tu Filosofía:** "Costo de Oportunidad". El dinero que el cliente no tiene hoy le está costando oportunidades de crecimiento o tranquilidad.

        ## 2. PILARES ESTRATÉGICOS (VENTAJAS RABEN)
        Usa estos puntos para re-encuadrar la conversación cuando sea necesario:
        - **Velocidad Rayo:** "Plata en tu cuenta en 2 horas". Mientras el banco pide papeles, nosotros pagamos.
        - **Deuda Invisible:** No informamos a la SBIF. El cliente mantiene su capacidad crediticia bancaria intacta.
        - **Flexibilidad Real:** Evaluamos casos con Dicom. Miramos el negocio detrás de la factura, no solo el historial.
        - **Trato Ejecutivo:** Nada de Call Centers. Atención personalizada de alto nivel.

        ## 3. DINÁMICA DE VENTA: EL "PERSONALITY MIRRORING"
        Analiza el estilo del cliente en su primer mensaje y adopta uno de estos 4 marcos:

        1. **[SOLUCIONADOR]:** (Para clientes estresados/urgentes). Tono empático pero resolutivo. Foco en quitarles el peso de encima.
        2. **[CONSULTOR]:** (Para clientes que hablan de inversión/crecimiento). Tono visionario. Foco en usar el factoring como palanca financiera.
        3. **[INSTITUCIONAL]:** (Para clientes grandes/formales). Tono de alta alcurnia empresarial. Foco en seguridad, respaldo y procesos impecables.
        4. **[AGRESIVO/PRAGMÁTICO]:** (Para clientes que van directo al grano). Tono ultra ejecutivo. Foco en la eficiencia pura: "Hagámosla corta".
        
        ## 4. COMUNICACIÓN Y "MODO CHILENO PRO"
        - **Tono:** Chileno de negocios. Directo, profesional, sin rodeos, pero con la cercanía justa para generar confianza.
        - **Vocabulario Técnico:** Usa con propiedad: "Mérito ejecutivo", "Tasa de descuento", "Cesión de facturas", "Patear pagos", "Caja", "Dicom".
        - **Filtro de Muletillas:** - PROHIBIDO: "Cachái" (excesivo), "pucha", "o sea" (en exceso).
            - PERMITIDO: "¿Te hace sentido?", "¿Se entiende la idea?", "En concreto...", "Mira, la cosa es simple:".
        - **Barge-in:** Si el cliente habla, tú te callas. El cliente manda en el flujo del audio.

        ## 5. MANEJO TÁCTICO DE OBJECIONES (REVERSO PSICOLÓGICO)
        Nunca contradigas al cliente; re-orienta su preocupación:
        - **Si dice "La tasa es alta":** "Entiendo, pero ¿cuánto te sale hoy perder el descuento por pronto pago con tu proveedor por no tener esas lucas? Al final, la liquidez se paga sola".
        - **Si dice "Lo veré con mi banco":** "El banco es tu aliado para el largo plazo. Nosotros somos tu equipo de reacción rápida. Te damos las lucas en 2 horas sin llenarte de deuda en la SBIF. ¿Prefieres esperar 10 días o cerrar el tema hoy?".

        ## 6. STEERING CONTROLS (INSTRUCCIONES DE INTERFAZ)
        Cuando el sistema te envíe estos comandos ocultos, actúa de inmediato:
        - \`[Cerrar Reunión]\`: "Ya po, no le demos más vueltas. ¿Te tinca un llamado rápido mañana o nos juntamos en la oficina para dejar esto listo?"
        - \`[Manejar Objeción Tasa]\`: Aplica el argumento de costo de oportunidad con fuerza.
        - \`[Pedir Factura]\`: "Mándame el PDF por acá mismo o el RUT del emisor para tirarlo al sistema y darte el número exacto que te llegaría a la cuenta".

        ## 7. REGLAS DE ORO
        1. **Siempre termina con una pregunta:** Mantén el control de la conversación.
        2. **Evita listas largas:** Nadie quiere leer un testamento. Sé breve, tipo mensaje de WhatsApp profesional.
        3. **Detección de Dolor:** Si mencionan "sueldos", "IVA" o "proveedores", pivota toda la narrativa hacia la urgencia y el alivio.
        
        ### CONFIGURACIÓN ADICIONAL
        Arquetipo seleccionado: ${selectedArchetypeObj.prompt}
        Tono seleccionado: ${selectedToneObj.prompt}

        ### INITIAL GREETING (START WITH THIS IMMEDIATELY):
        "Hola ${clientName}, te habla ${executiveName} de Raben Factoring. Te llamo directo porque vi que están con facturas a 60 días y quería liberarte ese flujo hoy mismo para que no tengas la plata parada. ¿Cómo va todo por allá?"
      `;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoiceObj.geminiVoice } } },
            systemInstruction: systemInstruction,
        },
        callbacks: {
          onopen: async () => {
            setConnectionState(ConnectionState.CONNECTED);
            sessionPromise.then(session => {
                (session as any).sendRealtimeInput([{ text: "LA LLAMADA HA EMPEZADO. SALUDA AL CLIENTE INMEDIATAMENTE CON TU PITCH DE CIERRE." }]);
            });
            const source = inputCtx.createMediaStreamSource(stream);
            sourceRef.current = source;
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            processor.onaudioprocess = (e) => {
               const inputData = e.inputBuffer.getChannelData(0);
               sessionPromise.then((session) => session.sendRealtimeInput({ media: createPcmBlob(inputData) }));
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              setAgentSpeaking(true);
              const outputCtx = outputContextRef.current;
              if (!outputCtx) return;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(base64ToArrayBuffer(audioData), outputCtx);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNode);
              audioSourcesRef.current.push(source);
              source.onended = () => {
                 audioSourcesRef.current = audioSourcesRef.current.filter(s => s !== source);
                 if (audioSourcesRef.current.length === 0) setAgentSpeaking(false);
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
            }
            if (msg.serverContent?.interrupted) {
                interrupt();
            }
          },
          onclose: () => { setConnectionState(ConnectionState.DISCONNECTED); stopAudio(); },
          onerror: (err) => { 
            setErrorMsg("Conexión perdida. Reintenta."); 
            setConnectionState(ConnectionState.ERROR); 
            stopAudio(); 
          }
        }
      });
      sessionPromise.then(session => { sessionRef.current = session; }).catch(e => {
          setErrorMsg("Error al conectar");
          setConnectionState(ConnectionState.ERROR);
          stopAudio();
      });
    } catch (e) { 
        setConnectionState(ConnectionState.ERROR); 
        stopAudio(); 
    }
  };

  const disconnect = () => { stopAudio(); setConnectionState(ConnectionState.DISCONNECTED); setAgentSpeaking(false); };

  const toggleDropdown = (id: string) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const renderDropdownItem = (
    id: string, 
    label: string, 
    icon: React.ReactNode, 
    currentValue: string, 
    options: any[],
    onSelect: (val: any) => void,
    isGrid: boolean = false
  ) => {
    const isVoiceGrid = id === 'voice';
    return (
        <div className="relative">
          <div className="glass-card z-10 relative">
            <div 
              onClick={() => toggleDropdown(id)}
              className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/20 transition-colors rounded-xl ${openDropdown === id ? 'bg-white/30' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="text-white drop-shadow-sm opacity-90">{icon}</div>
                <span className="text-[10px] font-bold text-glass-secondary uppercase tracking-tighter">{label}</span>
              </div>
              <div className="flex items-center gap-1 text-white">
                <p className="text-xs font-bold truncate max-w-[120px]">{currentValue}</p>
                {openDropdown === id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>
          </div>
          
          {openDropdown === id && (
            <div className="absolute bottom-full left-0 w-full mb-2 glass-card z-50 overflow-hidden animate-in slide-in-from-bottom-2 duration-200 shadow-xl">
              <div className={`max-h-[400px] overflow-y-auto custom-scrollbar bg-white/95 backdrop-blur-3xl p-2 ${isVoiceGrid ? 'grid grid-cols-3 gap-1.5' : isGrid ? 'grid grid-cols-2 gap-1' : ''}`}>
                {options.map((opt) => (
                    <div 
                      key={opt.id}
                      onClick={() => { onSelect(opt.id); setOpenDropdown(null); }}
                      className={`relative px-2 py-3 text-[10px] font-bold cursor-pointer flex flex-col items-center justify-center transition-all rounded-lg border
                        ${currentValue === (opt.label || opt.name || opt.id) 
                            ? 'bg-slate-900 text-white border-slate-700 shadow-inner' 
                            : 'bg-slate-100 text-slate-700 border-transparent hover:bg-slate-200'}
                        `}
                    >
                        {isVoiceGrid && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handlePreviewVoice(opt.id, opt.geminiVoice); }}
                                className={`absolute top-1 right-1 p-1 rounded-full transition-colors ${previewingVoice === opt.id ? 'bg-emerald-500 text-white' : 'hover:bg-black/10'}`}
                            >
                                {previewingVoice === opt.id ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
                            </button>
                        )}
                        <span className="truncate text-center w-full leading-tight">{opt.label || opt.name || opt.id}</span>
                        {opt.gender && <span className="text-[8px] opacity-40 font-medium uppercase mt-0.5">{opt.gender}</span>}
                    </div>
                ))}
              </div>
            </div>
          )}
        </div>
    );
  };

  if (connectionState === ConnectionState.CONNECTED && enableAdvancedMode) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-12 bg-transparent animate-in fade-in duration-500">
            <div className="glass w-full max-w-md h-full sm:h-[800px] sm:max-h-[95vh] flex flex-col relative overflow-hidden shadow-2xl">
                <div className="px-6 py-6 flex items-center justify-between z-20 shrink-0 border-b border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full glass-pill flex items-center justify-center border-emerald-400/40">
                            <span className="material-symbols-outlined text-emerald-400 text-3xl">record_voice_over</span>
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-xl tracking-tight drop-shadow-sm">{clientName}</h2>
                            <p className="text-emerald-300 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                {selectedArchetypeObj.name} • LIVE
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 relative flex items-center justify-center min-h-0 z-10">
                    <div className="w-full h-full flex items-center justify-center">
                        <AudioVisualizer isActive={agentSpeaking} color="#ffffff" mode="orb" />
                    </div>
                    
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        <div className={`transition-all duration-700 ${agentSpeaking ? 'scale-110 opacity-100' : 'scale-100 opacity-40'}`}>
                            <p className="text-white/80 text-[11px] uppercase font-mono tracking-[0.3em] text-center drop-shadow-md">
                                {agentSpeaking ? 'Closing sequence active...' : 'Listening for signal...'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-6 pb-8 z-20 shrink-0 space-y-5">
                    <div className="flex items-center justify-between px-2">
                        <p className="text-white/60 text-[10px] uppercase font-bold tracking-[0.2em] drop-shadow-sm">Quick Tactics</p>
                        <div className="h-px bg-white/10 flex-1 ml-4"></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {STEERING_COMMANDS.map((cmd) => (
                            <button
                                key={cmd.id}
                                onClick={() => sendSteeringCommand(cmd)}
                                className="glass-card bg-white/10 hover:bg-white/25 text-white py-4 flex flex-col items-center gap-2 border-white/20 transition-all active:scale-95 group"
                            >
                                <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">{cmd.icon}</span>
                                <span className="text-[10px] font-bold uppercase tracking-tight text-center leading-none">{cmd.label}</span>
                            </button>
                        ))}
                    </div>
                    
                    <div className="pt-2 grid grid-cols-2 gap-3">
                        <button 
                            onClick={interrupt}
                            className="glass-pill hover:bg-white/20 text-white py-4 flex items-center justify-center gap-3 font-bold transition-all border-white/30 backdrop-blur-xl"
                        >
                            <XCircle size={18} className="text-orange-400" />
                            <span className="text-[10px] uppercase tracking-widest">Interrumpir</span>
                        </button>
                        <button 
                            onClick={disconnect}
                            className="glass-pill bg-red-500/10 hover:bg-red-500/40 text-red-400 hover:text-white py-4 flex items-center justify-center gap-3 font-bold transition-all border-red-500/30 backdrop-blur-xl"
                        >
                            <PhoneOff size={18} />
                            <span className="text-[10px] uppercase tracking-widest">Colgar</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  return (
    <>
      <div className="h-40 w-full flex flex-col items-center justify-center relative mb-4">
        <div className="absolute inset-0 flex items-center justify-center opacity-90 scale-110">
           <AudioVisualizer isActive={agentSpeaking} color="#ffffff" mode="bars" />
        </div>
        {errorMsg && <p className="relative z-10 text-[10px] text-red-300 font-bold px-4 text-center absolute bottom-0 bg-black/40 backdrop-blur rounded-full py-1 border border-red-500/30">{errorMsg}</p>}
      </div>

      <div className="space-y-4 relative z-30">
        
        <div className="flex items-start justify-between px-1">
            <span className="text-[10px] font-bold text-glass-secondary uppercase tracking-widest mt-2">Executive Control</span>
            
            <div className="flex flex-col gap-2">
                 <div className="flex items-center justify-end gap-3">
                    <span className="text-[9px] font-bold text-glass-secondary uppercase">HUD Avanzado</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={enableAdvancedMode}
                            onChange={(e) => setEnableAdvancedMode(e.target.checked)}
                        />
                        <div className="w-9 h-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full peer peer-checked:bg-purple-500/40 peer-checked:border-purple-300/50 transition-all duration-300 shadow-inner relative overflow-hidden group">
                           <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[glass-shimmer_3s_infinite]"></div>
                           <div className="absolute top-[2px] left-[2px] w-3 h-3 rounded-full bg-white/40 backdrop-blur-sm border border-white/40 shadow-sm transition-all duration-300 transform peer-checked:translate-x-5 peer-checked:bg-white peer-checked:shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
                        </div>
                    </label>
                </div>

                <div className="flex items-center justify-end gap-3">
                    <span className="text-[9px] font-bold text-glass-secondary uppercase">Acento Local</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={isChileanMode}
                            onChange={(e) => setIsChileanMode(e.target.checked)}
                        />
                        <div className="w-9 h-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full peer peer-checked:bg-emerald-500/40 peer-checked:border-emerald-300/50 transition-all duration-300 shadow-inner relative overflow-hidden group">
                           <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[glass-shimmer_3s_infinite]"></div>
                           <div className="absolute top-[2px] left-[2px] w-3 h-3 rounded-full bg-white/40 backdrop-blur-sm border border-white/40 shadow-sm transition-all duration-300 transform peer-checked:translate-x-5 peer-checked:bg-white peer-checked:shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
                        </div>
                    </label>
                </div>
            </div>
        </div>

        <div className="flex flex-col gap-2">
          {renderDropdownItem('voice', 'Voz', <Mic size={18} />, selectedVoiceObj.name, VOICES, setSelectedVoice)}
          {renderDropdownItem('archetype', 'Arquetipo', <Zap size={18} />, selectedArchetypeObj.name, SALES_ARCHETYPES, setSelectedArchetype)}
          {renderDropdownItem('tone', 'Tono', <User size={18} />, selectedToneObj.label, TONES, setSelectedTone)}
          {renderDropdownItem('speed', 'Tempo', <Gauge size={18} />, `${speechSpeed}x`, [
            { id: 1.0, label: '1.0x 🗣️' },
            { id: 1.1, label: '1.1x 🐇' },
            { id: 1.2, label: '1.2x ⚡' },
            { id: 1.3, label: '1.3x ⚡⚡' },
          ], setSpeechSpeed)}
        </div>
      </div>

      <div className="mt-auto pt-8 relative z-10">
         {connectionState === ConnectionState.CONNECTED ? (
             <button 
                onClick={disconnect}
                className="w-full bg-red-500 hover:bg-red-600 text-white rounded-2xl py-5 flex items-center justify-center gap-3 shadow-2xl shadow-red-500/40 transition-all active:scale-[0.96] backdrop-blur-md"
            >
                <PhoneOff size={22} />
                <span className="text-lg font-bold tracking-tight">Cerrar Sesión</span>
            </button>
         ) : (
             <button 
                onClick={connect}
                disabled={connectionState === ConnectionState.CONNECTING}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-5 flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/40 transition-all active:scale-[0.96] disabled:opacity-70 disabled:cursor-not-allowed backdrop-blur-md"
            >
                {connectionState === ConnectionState.CONNECTING ? (
                    <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                ) : (
                    <>
                        <span className="material-symbols-outlined font-bold text-2xl">call</span>
                        <span className="text-xl font-bold tracking-tight">Iniciar Cierre</span>
                    </>
                )}
            </button>
         )}
      </div>
    </>
  );
};

export default LiveAgent;
