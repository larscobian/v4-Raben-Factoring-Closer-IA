import React, { useState } from 'react';
import { EMAIL_TEMPLATES } from '../constants';
import { Copy, Check, Send, Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface EmailGeneratorProps {
  clientName: string;
  companyName: string;
  executiveName: string;
}

const EmailGenerator: React.FC<EmailGeneratorProps> = ({ clientName, companyName, executiveName }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(EMAIL_TEMPLATES[0]);
  const [generatedBody, setGeneratedBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Initialize with raw template replacement
  React.useEffect(() => {
    const raw = selectedTemplate.body
      .replace(/\[Nombre\]/g, clientName || '[Nombre]')
      .replace(/\[Empresa\]/g, companyName || '[Empresa]')
      .replace(/\[Nombre Empresa\]/g, companyName || '[Empresa]')
      .replace(/\[Nombre Ejecutivo\]/g, executiveName || 'Constanza Mattar');
    setGeneratedBody(raw);
  }, [selectedTemplate, clientName, companyName, executiveName]);

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("No API Key");
        
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
            You are ${executiveName}, a sales executive from Raben Factoring.
            Rewrite the following email template slightly to make it more personalized for a client named "${clientName}" at company "${companyName}".
            Keep the core message (Speed, Liquidity, No Bureaucracy).
            Keep it under 150 words.
            Tone: Professional, direct, slightly urgent but polite.
            Sign off as: ${executiveName}.
            
            Subject: ${selectedTemplate.subject}
            Body Template: ${selectedTemplate.body}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        
        if (response.text) {
            setGeneratedBody(response.text);
        }
    } catch (e) {
        console.error(e);
        alert("Failed to refine with AI, using template defaults.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl h-full grid grid-cols-1 md:grid-cols-12 gap-6 pb-6">
      {/* Templates List */}
      <div className="md:col-span-4 flex flex-col h-full bg-slate-900/30 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-900 border-b border-slate-800">
             <h3 className="text-sm font-bold text-slate-300">Templates</h3>
        </div>
        <div className="p-2 space-y-2 overflow-y-auto flex-grow custom-scrollbar">
          {EMAIL_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t)}
              className={`w-full text-left p-3 rounded-lg text-sm transition-all border ${
                selectedTemplate.id === t.id
                  ? 'bg-purple-600/20 border-purple-500/50 text-white'
                  : 'bg-slate-800/40 border-slate-700/30 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div className={`font-semibold mb-0.5 ${selectedTemplate.id === t.id ? 'text-purple-300' : ''}`}>{t.title}</div>
              <div className="text-xs opacity-70 truncate">{t.subject}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor Area */}
      <div className="md:col-span-8 bg-slate-800/50 border border-slate-700 rounded-xl flex flex-col h-full shadow-lg">
        <div className="p-4 border-b border-slate-700 bg-slate-900/50 rounded-t-xl">
          <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Subject</label>
          <input 
            type="text"
            className="w-full bg-transparent text-white text-lg font-medium outline-none placeholder-slate-600"
            value={selectedTemplate.subject.replace('[Empresa]', companyName || '...')}
            readOnly
          />
        </div>
        
        <div className="flex-grow p-4">
             <textarea 
                value={generatedBody}
                onChange={(e) => setGeneratedBody(e.target.value)}
                className="w-full h-full bg-transparent text-slate-200 resize-none outline-none font-mono text-sm leading-relaxed"
                spellCheck={false}
             />
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-900/50 rounded-b-xl flex gap-3 justify-end items-center">
            <button 
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 text-purple-300 rounded text-xs font-medium transition-colors disabled:opacity-50"
            >
                {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {isGenerating ? 'Refining...' : 'AI Refine'}
            </button>
            <div className="h-4 w-px bg-slate-700 mx-1"></div>
            <button 
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-medium transition-colors"
            >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
            </button>
            <a 
                href={`mailto:?subject=${encodeURIComponent(selectedTemplate.subject)}&body=${encodeURIComponent(generatedBody)}`}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors shadow-lg hover:shadow-blue-500/20"
            >
                <Send size={12} /> Open Client
            </a>
        </div>
      </div>
    </div>
  );
};

export default EmailGenerator;