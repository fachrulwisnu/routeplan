import React, { useState, useEffect } from 'react';
import { ClientATM, RoutePlanRequest } from '../types';
import { BRANCHES, CYCLES, ROUTE_PREFERENCES } from '../data/initialData';
import { MapView } from './MapView';
import { ChevronDown, ChevronUp, MapPin, Search, Sparkles, Building2, Calendar, ShieldAlert, Cpu, CheckCircle2 } from 'lucide-react';

interface GenerateViewProps {
  clientAtms: ClientATM[];
  onGenerate: (request: RoutePlanRequest) => void;
  isGenerating: boolean;
}

export const GenerateView: React.FC<GenerateViewProps> = ({
  clientAtms,
  onGenerate,
  isGenerating
}) => {
  const [selectedCabang, setSelectedCabang] = useState('CIDENG');
  const [tanggalReplenish, setTanggalReplenish] = useState('02 Jun 2026');
  const [selectedSiklus, setSelectedSiklus] = useState('Pagi');
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>(['Ganjil/Genap']);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [loadingStep, setLoadingStep] = useState<number>(1);

  useEffect(() => {
    if (!isGenerating) {
      setLoadingStep(1);
      return;
    }

    setLoadingStep(1);
    const t1 = setTimeout(() => setLoadingStep(2), 2000);
    const t2 = setTimeout(() => setLoadingStep(3), 4000);
    const t3 = setTimeout(() => setLoadingStep(4), 8000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isGenerating]);

  const stepDetails = [
    { step: 1, label: "Menarik Data ATM dari Sistem", percent: 25 },
    { step: 2, label: "Menghitung Matriks Jarak Vincenty", percent: 50 },
    { step: 3, label: "Mengoptimasi Rute dengan Engine AI Terbaik", percent: 75 },
    { step: 4, label: "AI Engine Memprediksi Kepadatan Lalu Lintas", percent: 90 },
  ];

  const currentStepInfo = stepDetails.find(s => s.step === loadingStep) || stepDetails[0];

  const togglePreference = (pref: string) => {
    if (selectedPreferences.includes(pref)) {
      setSelectedPreferences(selectedPreferences.filter(p => p !== pref));
    } else {
      setSelectedPreferences([...selectedPreferences, pref]);
    }
  };

  const filteredAtms = clientAtms.filter(atm =>
    atm.nama_client.toLowerCase().includes(searchQuery.toLowerCase()) ||
    atm.plan_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    atm.alamat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartGenerate = () => {
    const request: RoutePlanRequest = {
      cabang: selectedCabang,
      tanggal_replenish: tanggalReplenish,
      siklus: selectedSiklus,
      preferensi_rute: selectedPreferences,
      data_atm: filteredAtms.length > 0 ? filteredAtms : clientAtms
    };
    onGenerate(request);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
      {/* Left Control Panel (Fig 1 in FSD) */}
      <div className="w-full lg:w-[480px] shrink-0 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
        
        {/* Cabang Selector */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-600" /> Cabang / Sektor
          </label>
          <div className="relative">
            <select
              value={selectedCabang}
              onChange={e => setSelectedCabang(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm font-bold rounded-xl px-3.5 py-2.5 appearance-none focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            >
              {BRANCHES.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Tanggal Replenish */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" /> Tanggal Replenish
          </label>
          <input
            type="text"
            value={tanggalReplenish}
            onChange={e => setTanggalReplenish(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-600 transition-colors"
          />
        </div>

        {/* Siklus (Cycle) Buttons */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">
            Siklus (Cycle)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {CYCLES.map(siklus => {
              const active = selectedSiklus === siklus;
              return (
                <button
                  key={siklus}
                  type="button"
                  onClick={() => setSelectedSiklus(siklus)}
                  className={`py-2 px-3 text-xs font-extrabold rounded-xl transition-all border ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {siklus}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferensi Rute Toggles */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">
            Preferensi Rute
          </label>
          <div className="flex flex-wrap gap-2">
            {ROUTE_PREFERENCES.map(pref => {
              const active = selectedPreferences.includes(pref);
              return (
                <button
                  key={pref}
                  type="button"
                  onClick={() => togglePreference(pref)}
                  className={`py-1.5 px-3 text-xs font-bold rounded-xl transition-all border ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {pref}
                </button>
              );
            })}
          </div>
          <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-snug">
              Aturan ganjil/genap akan mengikuti plat kendaraan yang di-assign ke runsheet. Pastikan plat mobil sudah benar saat assignment.
            </p>
          </div>
        </div>

        {/* Daftar Data Client / ATM */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Daftar Data Client / ATM
            </span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              {filteredAtms.length} Total Records
            </span>
          </div>

          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari client, WSID, atau alamat..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredAtms.map((atm, index) => {
              const isExpanded = expandedIndex === index;
              return (
                <div
                  key={atm.plan_no}
                  className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    className="w-full p-3 text-left flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">
                        {atm.nama_client} | <span className="text-blue-600">{atm.wsid || 'BCA-236D'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium font-mono mt-0.5">
                        {atm.plan_no}
                      </div>
                      <div className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                        {atm.alamat}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {/* Expanded Accordion Details (Fig 2 in FSD) */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-slate-200/60 bg-white text-[11px] space-y-1.5 text-slate-700">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <div>Plan No: <b className="text-slate-900 font-mono">{atm.plan_no}</b></div>
                        <div>ATM Code: <b className="text-slate-900">{atm.wsid || 'BCA-236D'}</b></div>
                        <div>Status ATM: <b className="text-blue-600">{atm.status_atm}</b></div>
                        <div>Tipe Trip: <b className="text-slate-900">{atm.tipe_trip}</b></div>
                        <div>Siklus: <b className="text-slate-900">{selectedSiklus}</b></div>
                        <div>Cabang: <b className="text-slate-900">{selectedCabang}</b></div>
                        <div className="col-span-2">Koordinat: <b className="font-mono text-slate-800">{atm.koordinat}</b></div>
                        <div className="col-span-2 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between">
                          <span>Jam Buka: <b className="text-slate-900">08:00</b></span>
                          <span>Jam Tutup: <b className="text-slate-900">22:00</b></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Progress Bar when Generating */}
        {isGenerating && (
          <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-700 shadow-md space-y-3 transition-all animate-fade-in">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-2 text-blue-400">
                <Cpu className="w-4 h-4 animate-pulse text-emerald-400" />
                {currentStepInfo.label}
              </span>
              <span className="text-emerald-400 font-mono text-xs">{currentStepInfo.percent}%</span>
            </div>

            {/* Smooth Animated Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/50">
              <div
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                style={{ width: `${currentStepInfo.percent}%` }}
              />
            </div>

            {/* Step Indicators */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {stepDetails.map((s) => (
                <div key={s.step} className="space-y-1">
                  <div
                    className={`h-1.5 rounded-full transition-colors duration-300 ${
                      loadingStep >= s.step ? 'bg-emerald-400 shadow-xs' : 'bg-slate-700'
                    }`}
                  />
                  <div className="text-[9px] font-semibold text-center text-slate-400 truncate">
                    Step {s.step}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Runsheet Primary Button */}
        <button
          disabled={isGenerating}
          onClick={handleStartGenerate}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Engine Sedang Memproses ({currentStepInfo.percent}%)...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 fill-white" />
              <span>GENERATE RUNSHEET</span>
            </>
          )}
        </button>
      </div>

      {/* Right Map Preview Panel */}
      <div className="w-full lg:flex-1 h-[680px] bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Peta Sebaran Lokasi ATM ({selectedCabang})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Pratinjau Koordinat Sebelum Route Planning
          </span>
        </div>

        <div className="flex-1 rounded-xl overflow-hidden">
          <MapView clientAtms={filteredAtms} height="100%" />
        </div>
      </div>
    </div>
  );
};
