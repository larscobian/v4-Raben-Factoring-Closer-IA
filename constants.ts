
import { SalesStrategy, EmailTemplate } from './types';

export const VOICES = [
  // Femeninas
  { id: 'Carla', name: 'Carla 👩🏻', gender: 'Femenino', geminiVoice: 'Kore' },
  { id: 'Javiera', name: 'Javiera 👩🏻', gender: 'Femenino', geminiVoice: 'Zephyr' },
  { id: 'Sofía', name: 'Sofía 👩🏻', gender: 'Femenino', geminiVoice: 'Kore' },
  { id: 'Ignacia', name: 'Ignacia 👩🏻', gender: 'Femenino', geminiVoice: 'Zephyr' },
  // Masculinas
  { id: 'Benjamín', name: 'Benjamín 👨🏻', gender: 'Masculino', geminiVoice: 'Fenrir' },
  { id: 'Carlos', name: 'Carlos 👨🏻', gender: 'Masculino', geminiVoice: 'Charon' },
  { id: 'Daniel', name: 'Daniel 👨🏻', gender: 'Masculino', geminiVoice: 'Puck' },
  { id: 'Gabriel', name: 'Gabriel 👨🏻', gender: 'Masculino', geminiVoice: 'Fenrir' },
  { id: 'Ian', name: 'Ian 👨🏻', gender: 'Masculino', geminiVoice: 'Charon' },
  { id: 'Javier', name: 'Javier 👨🏻', gender: 'Masculino', geminiVoice: 'Puck' },
  { id: 'Mario', name: 'Mario 👨🏻', gender: 'Masculino', geminiVoice: 'Fenrir' },
  { id: 'Pedro', name: 'Pedro 👨🏻', gender: 'Masculino', geminiVoice: 'Charon' },
  { id: 'Roberto', name: 'Roberto 👨🏻', gender: 'Masculino', geminiVoice: 'Puck' },
  { id: 'Tomás', name: 'Tomás 👨🏻', gender: 'Masculino', geminiVoice: 'Fenrir' },
];

export const SALES_ARCHETYPES = [
  { 
    id: 'consultant', 
    name: 'Consultor 📈', 
    prompt: 'Role: Senior Financial Consultant. Focus: Strategic growth and reinvestment. Mindset: Factoring is a tool to scale, not just to survive. Tone: Visionary, strategic, calm. Phrases: "inversión de capital", "apalancamiento", "escalar el negocio".' 
  },
  { 
    id: 'solver', 
    name: 'Solucionador 🛠️', 
    prompt: 'Role: Cash-Flow Problem Solver. Focus: Urgent payroll, tax payments (IVA), and liquidity gaps. Mindset: I am the bridge between your invoice and your operational peace. Tone: Empathetic, decisive, reassuring. Phrases: "tapar el bache", "liquidez para mañana", "sueldos al día".' 
  },
  { 
    id: 'institutional', 
    name: 'Institucional 🏛️', 
    prompt: 'Role: Corporate Banking Alternative. Focus: Safety, transparency, and non-banking debt advantage. Mindset: We offer the professional backing of a bank without its bureaucracy. Tone: Formal, secure, high-end. Phrases: "respaldo financiero", "fuera de sistema SBIF", "transparencia absoluta".' 
  },
  { 
    id: 'wolf', 
    name: 'Agresivo 🐺', 
    prompt: 'Role: High-Performance Closer. Focus: Speed and immediate execution. Mindset: Time is money and you are losing both. Tone: Alpha, extremely direct, energetic. Phrases: "cortemos la espera", "plata en cuenta en 2 horas", "cerremos esto ahora".' 
  }
];

export const RABEN_KILLER_POINTS = [
  "Transferencia de fondos garantizada en 2 horas máximo.",
  "Deuda 100% no bancaria: No informamos a la SBIF, mantienes tus líneas limpias.",
  "Atención personalizada con Ejecutivo Senior: Hablas con una persona, no con un call center.",
  "Evaluamos con Dicom: Operamos caso a caso, entendemos la realidad del negocio.",
  "Sin burocracia bancaria: Operación ágil y 100% digital."
];

export const CHILEAN_PRO_VOCABULARY = [
  "Patear la factura",
  "Flujo de caja",
  "Cero burocracia",
  "Al tiro",
  "Factura en mano",
  "Te hace sentido?",
  "Se entiende?",
  "Cortar la espera",
  "Espalda financiera",
  "Cerrar el mes"
];

export const STEERING_COMMANDS = [
  { id: 'close', label: 'Cerrar Ahora', prompt: '[SYSTEM: The client is listening. Push for the close. Ask: "Mándame la factura al WhatsApp ahora mismo y te la liquido en 2 horas. ¿Qué esperas?" / "Agendemos para mañana a las 10 AM si quieres ver los números en grande."]', icon: 'handshake' },
  { id: 'objection', label: 'Manejo Objeción', prompt: '[SYSTEM: They said it is expensive or they already have a bank. Respond: "El banco se demora 2 semanas, yo me demoro 2 horas. Lo caro es no tener la plata para pagar tus sueldos o comprar mercadería. Hagamos la prueba con una factura."]', icon: 'security' },
  { id: 'invoice', label: 'Pedir Factura', prompt: '[SYSTEM: Focus only on getting the document. "No hablemos más de teoría. Mándame el PDF de una factura por cobrar y te mando la oferta real en 15 minutos."]', icon: 'receipt_long' }
];

export const CALL_STRATEGIES: SalesStrategy[] = [
  {
    id: 'default_strategy',
    title: 'Cierre Maestro',
    description: 'Estrategia de alta presión enfocada en resultados inmediatos.',
    category: 'Call',
    script: ''
  }
];

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'email-direct',
    title: 'Propuesta de Liquidez',
    subject: 'Liquidez para [Empresa] en 2 horas',
    body: `Hola, [Nombre].\n\nVi que están trabajando con clientes grandes y el flujo de caja a veces se aprieta con los plazos de 60 días.\n\nEn Raben Factoring liquidamos tus facturas en 2 horas. Sin bancos, sin burocracia y sin informar deuda.\n\nSi me adjuntas una factura ahora, te mando una cotización en 15 minutos.\n\n¿Probamos?\n\nSaludos,\n[Nombre Ejecutivo]`
  }
];
