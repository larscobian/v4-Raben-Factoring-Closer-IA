
import React, { useState } from 'react';
import LiveAgent from './components/LiveAgent';
import { CALL_STRATEGIES } from './constants';

const App: React.FC = () => {
  const [clientName, setClientName] = useState('Juan');
  const [companyName, setCompanyName] = useState('Tech Corp');
  const [executiveName, setExecutiveName] = useState('Lars');
  const [isHUDActive, setIsHUDActive] = useState(false);

  return (
    <div className="min-h-screen flex justify-center py-6 sm:py-12 px-4">
      {/* Main Glass Container - Conditioned by HUD state */}
      <div className={`${isHUDActive ? '' : 'glass'} relative flex w-full max-w-md flex-col overflow-hidden transition-all duration-300`}>
        
        {/* Header - Hidden in HUD Mode */}
        {!isHUDActive && (
          <header className="flex items-center justify-between p-6 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                <span className="material-symbols-outlined text-emerald-400 text-2xl">smart_toy</span>
              </div>
              <div>
                <h1 className="text-xl font-bold leading-none tracking-tight text-emerald-400">Raben AI</h1>
                <p className="text-xs text-glass-secondary font-medium">Asistente Ejecutivo</p>
              </div>
            </div>
            <div className="relative w-32">
              <input 
                className="glass-pill w-full border-none py-2 px-3 text-xs text-white placeholder:text-white/40 font-medium transition-all text-center outline-none focus:ring-0" 
                placeholder="Nombre Ejecutivo" 
                type="text"
                value={executiveName}
                onChange={(e) => setExecutiveName(e.target.value)}
              />
            </div>
          </header>
        )}

        {/* Main Content */}
        <main className={`flex-1 flex flex-col ${isHUDActive ? '' : 'px-6 space-y-6 mt-6 pb-8'}`}>
          
          {/* Top Inputs - Hidden in HUD Mode */}
          {!isHUDActive && (
            <div className="grid grid-cols-2 gap-3">
              <div className="group">
                <label className="block text-[10px] font-bold text-glass-secondary uppercase tracking-widest mb-1 ml-1">Nombre Lead</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-lg z-10">person</span>
                  <input 
                    className="glass-pill w-full border-none py-3 pl-10 pr-3 text-sm text-white placeholder:text-white/30 font-medium transition-all outline-none focus:ring-0" 
                    placeholder="Juan Pérez" 
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
              </div>
              <div className="group">
                <label className="block text-[10px] font-bold text-glass-secondary uppercase tracking-widest mb-1 ml-1">Empresa</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-lg z-10">corporate_fare</span>
                  <input 
                    className="glass-pill w-full border-none py-3 pl-10 pr-3 text-sm text-white placeholder:text-white/30 font-medium transition-all outline-none focus:ring-0" 
                    placeholder="Tech Corp" 
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Live Agent Area - Always mounted to preserve state/connection */}
          <LiveAgent 
            strategyId={CALL_STRATEGIES[0].id} 
            clientName={clientName}
            executiveName={executiveName}
            companyName={companyName}
            onHUDToggle={setIsHUDActive}
          />
          
        </main>

      </div>
    </div>
  );
};

export default App;
