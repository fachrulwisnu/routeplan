import React, { useState, useEffect } from 'react';
import { ClientATM, RoutePlanRequest, RunsheetResponse } from './types';
import { DUMMY_CLIENT_ATMS } from './data/initialData';
import { GenerateView } from './components/GenerateView';
import { ResultView } from './components/ResultView';
import {
  Sparkles, Layers, RefreshCw, Cpu, Server, CheckCircle2,
  FileText, Shield, User, Building2
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'generate' | 'result'>('generate');
  const [clientAtms, setClientAtms] = useState<ClientATM[]>(DUMMY_CLIENT_ATMS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [runsheetData, setRunsheetData] = useState<RunsheetResponse | null>(null);
  const [apiSource, setApiSource] = useState<string>('mileapp');
  const [aiEngineSource, setAiEngineSource] = useState<string>('');

  const [tanggalReplenish, setTanggalReplenish] = useState('02 Jun 2026');
  const [siklus, setSiklus] = useState('Pagi');

  // Fetch initial tasks from MileApp API backend
  useEffect(() => {
    async function fetchMileAppData() {
      try {
        const res = await fetch('/api/mileapp/tasks');
        if (res.ok) {
          const json = await res.json();
          if (json.data_atm && json.data_atm.length > 0) {
            setClientAtms(json.data_atm);
          }
          if (json.source) {
            setApiSource(json.source);
          }
        }
      } catch (e) {
        console.warn('Backend MileApp fetch error, using client dataset fallback:', e);
      }
    }
    fetchMileAppData();
  }, []);

  // Handle Generate Runsheet request
  const handleGenerate = async (request: RoutePlanRequest) => {
    setIsGenerating(true);
    setTanggalReplenish(request.tanggal_replenish);
    setSiklus(request.siklus);

    try {
      const res = await fetch('/api/generate-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (res.ok) {
        const data: RunsheetResponse & { source?: string } = await res.json();
        setRunsheetData(data);
        if (data.source) {
          setAiEngineSource(data.source);
        }
        setActiveTab('result');
      } else {
        alert('Gagal memproses AI Route Plan. Silakan coba lagi.');
      }
    } catch (err) {
      console.error('API Error:', err);
      alert('Terjadi kesalahan jaringan saat memanggil AI Solver.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 font-sans flex flex-col">
      {/* Advantage SCM Enterprise Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Logo & App Name */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gradient-to-r from-blue-700 to-emerald-600 px-3 py-1.5 rounded-xl border border-white/20 shadow-sm">
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center font-black text-xs text-white">
                  ADV
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-black tracking-widest leading-none text-emerald-300 uppercase">
                    ADVANTAGE
                  </div>
                  <div className="text-[9px] font-semibold tracking-wider leading-tight text-white/80">
                    Supply Chain Management
                  </div>
                </div>
              </div>

              <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black tracking-tight text-white">
                    ROUTE PLAN AI
                  </h1>
                  <span className="bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    v1.5
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                  Cash Management & Operations (Sentral Planner ROC-COS)
                </p>
              </div>
            </div>

            {/* Status Badges & User Profile */}
            <div className="flex items-center gap-3">
              {/* MileApp Status */}
              <div className="hidden md:flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/80 text-[11px]">
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">MileApp API:</span>
                <span className="text-emerald-400 font-bold uppercase">Connected</span>
              </div>

              {/* NVIDIA Nemotron Status */}
              <div className="hidden lg:flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/80 text-[11px]">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-slate-400">AI Engine:</span>
                <span className="text-blue-400 font-bold uppercase">
                  {aiEngineSource === 'nvidia_nemotron' ? 'NVIDIA Nemotron' : 'VRP AI Solver'}
                </span>
              </div>

              {/* User Avatar */}
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">
                  FW
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-white leading-none">Fachrul Wisnu N.</div>
                  <div className="text-[10px] text-slate-400 font-medium">Sentral Planner</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Navigation Tabs (Fig 1 & Fig 3 in FSD) */}
        <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('generate')}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'generate'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Generate</span>
            </button>

            <button
              disabled={!runsheetData}
              onClick={() => setActiveTab('result')}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'result'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : runsheetData
                  ? 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Result</span>
              {runsheetData && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium hidden md:block">
            {activeTab === 'generate' ? 'Generate Runsheet otomatis dengan sekali klik' : 'Hasil Optimasi Runsheet & Schedule VRP'}
          </div>
        </div>

        {/* Tab Contents */}
        {activeTab === 'generate' ? (
          <GenerateView
            clientAtms={clientAtms}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        ) : runsheetData ? (
          <ResultView
            runsheetData={runsheetData}
            tanggalReplenish={tanggalReplenish}
            siklus={siklus}
            onUpdateRunsheet={setRunsheetData}
          />
        ) : null}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 font-medium flex flex-wrap items-center justify-between gap-2">
          <div>
            &copy; 2026 <b>PT. Advantage SCM</b> - Cash Management Operations. Rahasia & Hak Cipta Dilindungi.
          </div>
          <div className="flex items-center gap-4">
            <span>FSD Version 1.5</span>
            <span>ROC - COS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
