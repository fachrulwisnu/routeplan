import React, { useState } from 'react';
import { Run, VisitStop } from '../types';
import { MapView } from './MapView';
import { 
  X, ArrowLeft, MoveUp, MoveDown, Save, Eye, 
  Sparkles, AlertTriangle, CheckCircle2, TrendingUp, Clock, Navigation, AlertCircle 
} from 'lucide-react';

interface SwitchTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  runs: Run[];
  tanggalReplenish: string;
  siklus: string;
  onSaveRuns: (updatedRuns: Run[]) => void;
}

// Coordinate parser helper
const parseCoord = (coordStr: string): [number, number] => {
  if (!coordStr) return [-6.173256, 106.810058];
  const parts = coordStr.split(',').map(s => parseFloat(s.trim()));
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return [parts[0], parts[1]];
  }
  return [-6.173256, 106.810058];
};

// Euclidean/Vincenty approximate distance in km
const getDistanceKm = (c1: [number, number], c2: [number, number]): number => {
  const dx = c1[0] - c2[0];
  const dy = c1[1] - c2[1];
  return Math.sqrt(dx * dx + dy * dy) * 111;
};

// Calculate aggregate metrics (Distance, Traffic Delay, ETA) for a given runs array
const calculateRunsMetrics = (runsList: Run[]) => {
  let totalDistance = 0;
  let totalDelay = 0;
  let maxTimeMinutes = 8 * 60; // Start at 08:00 AM (480 mins)

  runsList.forEach(run => {
    let runDistance = 0;
    const depotCoord: [number, number] = [-6.173256, 106.810057];
    let prevCoord = depotCoord;
    let runMinutes = 8 * 60; // 08:00 AM

    run.rute_kunjungan.forEach((stop) => {
      const currCoord = parseCoord(stop.koordinat);
      const dist = getDistanceKm(prevCoord, currCoord);
      runDistance += dist;
      prevCoord = currCoord;

      // Traffic delay
      let delay = stop.prediksi_delay_menit ?? 0;
      if (!delay) {
        if (stop.status_lalu_lintas === 'Macet') delay = 15;
        else if (stop.status_lalu_lintas === 'Padat') delay = 8;
        else delay = 0;
      }
      totalDelay += delay;

      // Travel time roughly 2.5 mins per km + delay + transaction duration
      const travelTime = Math.ceil(dist * 2.5) + delay;
      const transTime = stop.durasi_transaksi_menit || 15;
      runMinutes += travelTime + transTime;
    });

    // Return to depot
    runDistance += getDistanceKm(prevCoord, depotCoord);
    totalDistance += runDistance;

    if (runMinutes > maxTimeMinutes) {
      maxTimeMinutes = runMinutes;
    }
  });

  const hours = Math.floor(maxTimeMinutes / 60);
  const mins = Math.round(maxTimeMinutes % 60);
  const etaStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} WIB`;

  return {
    totalDistance: parseFloat(totalDistance.toFixed(1)),
    totalDelay,
    etaStr,
    totalMinutes: maxTimeMinutes
  };
};

export const SwitchTripModal: React.FC<SwitchTripModalProps> = ({
  isOpen,
  onClose,
  runs: initialRuns,
  tanggalReplenish,
  siklus,
  onSaveRuns
}) => {
  const [runs, setRuns] = useState<Run[]>(JSON.parse(JSON.stringify(initialRuns)));
  const [previewRunIndex, setPreviewRunIndex] = useState<number | null>(null);
  const [showImpactModal, setShowImpactModal] = useState<boolean>(false);

  if (!isOpen) return null;

  // AI Recommendation Evaluator for each Trip Card Item
  const getTripAiStatus = (
    stop: VisitStop,
    stopIdx: number,
    currentRunIdx: number
  ) => {
    // Check if transferred from original run
    let origRunName = '';
    let origRunIdx = -1;
    initialRuns.forEach((r, rIdx) => {
      if (r.rute_kunjungan.some(s => s.plan_no === stop.plan_no)) {
        origRunName = r.nama_run;
        origRunIdx = rIdx;
      }
    });

    const isTransferred = origRunIdx !== -1 && origRunIdx !== currentRunIdx;

    // Calculate distance to previous stop
    const currRun = runs[currentRunIdx];
    const stopCoord = parseCoord(stop.koordinat);
    let prevCoord: [number, number] = [-6.173256, 106.810057];
    if (stopIdx > 0) {
      prevCoord = parseCoord(currRun.rute_kunjungan[stopIdx - 1].koordinat);
    }
    const distFromPrev = getDistanceKm(prevCoord, stopCoord);

    const isTrafficMacet = stop.status_lalu_lintas === 'Macet' || (stop.prediksi_delay_menit && stop.prediksi_delay_menit >= 15);
    const isLongJump = distFromPrev > 5.5;

    // High Risk: Transferred & long jump or traffic macet
    if (isTransferred && (isLongJump || isTrafficMacet)) {
      return {
        type: 'warning' as const,
        badge: '⚠️ Tidak Direkomendasikan (Risiko Macet Tinggi)',
        reason: isLongJump ? `Jarak antar titik cukup jauh (${distFromPrev.toFixed(1)} km) dari klaster ${currRun.nama_run}` : 'Area ini mengalami potensi kemacetan tinggi',
        isTransferred,
        origRunName
      };
    }

    if (isTrafficMacet && isLongJump) {
      return {
        type: 'warning' as const,
        badge: '⚠️ Tidak Direkomendasikan (Risiko Macet Tinggi)',
        reason: 'Urutan rute berisiko memicu kemacetan & memutarkan jalan',
        isTransferred,
        origRunName
      };
    }

    return {
      type: 'recommended' as const,
      badge: '✨ Direkomendasikan oleh AI',
      reason: isTransferred ? `Transfer ke ${currRun.nama_run} sesuai geofencing` : 'Urutan rute efisien & efisiensi geofencing tinggi',
      isTransferred,
      origRunName
    };
  };

  // Move trip within same run (Up / Down)
  const handleReorderStop = (runIdx: number, stopIdx: number, direction: 'up' | 'down') => {
    const updated = [...runs];
    const targetIdx = direction === 'up' ? stopIdx - 1 : stopIdx + 1;

    if (targetIdx < 0 || targetIdx >= updated[runIdx].rute_kunjungan.length) return;

    const stops = [...updated[runIdx].rute_kunjungan];
    const [moved] = stops.splice(stopIdx, 1);
    stops.splice(targetIdx, 0, moved);

    // Re-assign sequence numbers
    stops.forEach((s, idx) => {
      s.urutan = idx + 1;
    });

    updated[runIdx].rute_kunjungan = stops;
    setRuns(updated);
  };

  // Transfer trip between runs
  const handleTransferTrip = (fromRunIdx: number, stopIdx: number, toRunIdx: number) => {
    if (fromRunIdx === toRunIdx) return;
    const updated = [...runs];

    const sourceStops = [...updated[fromRunIdx].rute_kunjungan];
    const destStops = [...updated[toRunIdx].rute_kunjungan];

    const [moved] = sourceStops.splice(stopIdx, 1);
    destStops.push(moved);

    // Re-sequence source
    sourceStops.forEach((s, idx) => (s.urutan = idx + 1));
    // Re-sequence dest
    destStops.forEach((s, idx) => (s.urutan = idx + 1));

    updated[fromRunIdx].rute_kunjungan = sourceStops;
    updated[fromRunIdx].jumlah_trip = sourceStops.length;

    updated[toRunIdx].rute_kunjungan = destStops;
    updated[toRunIdx].jumlah_trip = destStops.length;

    setRuns(updated);
  };

  // Trigger Save Impact Analysis Pop-up
  const handleSaveClick = () => {
    setShowImpactModal(true);
  };

  const confirmSave = () => {
    onSaveRuns(runs);
    setShowImpactModal(false);
    onClose();
  };

  const selectedPreviewRun = previewRunIndex !== null ? runs[previewRunIndex] : null;

  // Calculate Impact Analysis Metrics
  const beforeMetrics = calculateRunsMetrics(initialRuns);
  const afterMetrics = calculateRunsMetrics(runs);

  const distanceDiff = parseFloat((afterMetrics.totalDistance - beforeMetrics.totalDistance).toFixed(1));
  const delayDiff = afterMetrics.totalDelay - beforeMetrics.totalDelay;

  // Check if any trip triggered warning
  let hasWarnings = false;
  runs.forEach((r, rIdx) => {
    r.rute_kunjungan.forEach((s, sIdx) => {
      const status = getTripAiStatus(s, sIdx, rIdx);
      if (status.type === 'warning') {
        hasWarnings = true;
      }
    });
  });

  const isRiskIncreased = hasWarnings || delayDiff > 0 || distanceDiff > 2.0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-6 overflow-hidden">
      <div className="bg-slate-50 border border-slate-200 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Switch Trip & Route Editor</h2>
              <span className="text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3 h-3 text-amber-300" /> AI Interactive Planner
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Atur dan pindahkan urutan kunjungan ATM antar Run dengan panduan rekomendasi AI
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">TANGGAL REPLENISH:</span>
              <span className="font-bold text-slate-800">{tanggalReplenish || '02 Jun 2026'}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] px-2">SIKLUS (CYCLE):</span>
              <span className="bg-blue-600 text-white font-bold px-3 py-1 rounded-md">
                {siklus || 'Pagi'}
              </span>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {selectedPreviewRun !== null ? (
          /* View 2: Run Detail Preview Modal */
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-6 gap-6 bg-slate-100">
            <div className="w-full md:w-1/2 flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setPreviewRunIndex(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali ke Semua Run
                </button>
                <span className="text-xs font-extrabold uppercase px-3 py-1 bg-blue-600 text-white rounded-lg shadow-xs">
                  {selectedPreviewRun.nama_run} ({selectedPreviewRun.rute_kunjungan.length} Trip)
                </span>
              </div>

              {/* Map Preview of specific run */}
              <div className="flex-1 rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white">
                <MapView runs={[selectedPreviewRun]} height="100%" />
              </div>
            </div>

            {/* Right side: Detailed Trip Cards list for this run */}
            <div className="w-full md:w-1/2 flex flex-col h-full bg-white rounded-xl border border-slate-200 p-4 overflow-y-auto">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center justify-between">
                <span>Daftar kunjungan untuk {selectedPreviewRun.nama_run}</span>
                <span className="text-xs font-normal text-slate-500">
                  {selectedPreviewRun.rute_kunjungan.length} Lokasi ATM
                </span>
              </h3>

              <div className="space-y-3">
                {selectedPreviewRun.rute_kunjungan.map((stop, stopIdx) => {
                  const aiStatus = getTripAiStatus(stop, stopIdx, previewRunIndex);

                  return (
                    <div
                      key={stop.plan_no + stop.urutan}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {stop.urutan}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{stop.nama_client}</span>
                        </div>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                          {stop.plan_no}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 pl-8">{stop.alamat}</p>

                      {/* AI Badge Suggestion */}
                      <div className="pl-8">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                            aiStatus.type === 'warning'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {aiStatus.badge}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pl-8 text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                        <div>Status ATM: <b className="text-slate-800">{stop.status_atm}</b></div>
                        <div>Tipe Trip: <b className="text-slate-800">{stop.tipe_trip}</b></div>
                        <div>Jam Tiba: <b className="text-blue-600">{stop.prediksi_jam_tiba_di_lokasi}</b></div>
                        <div>Durasi: <b className="text-slate-800">{stop.durasi_transaksi_menit} Menit</b></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* View 1: Multi-column Runs List */
          <div className="flex-1 overflow-x-auto p-6 bg-slate-100/70">
            <div className="flex items-start gap-5 min-w-max h-full">
              {runs.map((run, runIdx) => (
                <div
                  key={run.nama_run}
                  className="w-84 bg-white border border-slate-200 rounded-2xl flex flex-col max-h-full shadow-sm"
                >
                  {/* Column Header */}
                  <div className="p-3.5 border-b border-slate-200 bg-slate-50/90 rounded-t-2xl flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                        {run.nama_run}
                      </span>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                        {run.rute_kunjungan.length} Trip
                      </span>
                    </div>

                    <button
                      title="Klik untuk Lihat Detail Map Run"
                      onClick={() => setPreviewRunIndex(runIdx)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Detail Map
                    </button>
                  </div>

                  {/* Trip Cards Container */}
                  <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                    {run.rute_kunjungan.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 font-medium italic border-2 border-dashed border-slate-200 rounded-xl">
                        Tidak ada trip di run ini. Pindahkan trip dari run lain.
                      </div>
                    ) : (
                      run.rute_kunjungan.map((stop, stopIdx) => {
                        const aiStatus = getTripAiStatus(stop, stopIdx, runIdx);

                        return (
                          <div
                            key={stop.plan_no + stopIdx}
                            onDoubleClick={() => setPreviewRunIndex(runIdx)}
                            className={`bg-white border rounded-xl p-3 shadow-2xs hover:shadow-md transition-all group relative cursor-pointer space-y-2 ${
                              aiStatus.type === 'warning'
                                ? 'border-rose-200 bg-rose-50/10 hover:border-rose-400'
                                : 'border-slate-200 hover:border-blue-400'
                            }`}
                          >
                            {/* Card Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {stop.urutan}
                                </span>
                                <span className="font-bold text-xs text-slate-800 truncate max-w-[150px]" title={stop.nama_client}>
                                  {stop.nama_client}
                                </span>
                              </div>

                              <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                {/* Move Up */}
                                {stopIdx > 0 && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleReorderStop(runIdx, stopIdx, 'up'); }}
                                    title="Naikkan Urutan"
                                    className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 cursor-pointer"
                                  >
                                    <MoveUp className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {/* Move Down */}
                                {stopIdx < run.rute_kunjungan.length - 1 && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleReorderStop(runIdx, stopIdx, 'down'); }}
                                    title="Turunkan Urutan"
                                    className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 cursor-pointer"
                                  >
                                    <MoveDown className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Plan No & Address */}
                            <div className="text-[11px] text-slate-500 font-medium leading-tight">
                              Plan: <span className="font-mono text-slate-700 font-bold">{stop.plan_no}</span>
                            </div>

                            {/* Intelligent AI Suggestion Badge */}
                            <div className="pt-0.5">
                              <div
                                className={`w-full inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                  aiStatus.type === 'warning'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {aiStatus.type === 'warning' ? (
                                  <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                ) : (
                                  <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                                )}
                                <span className="truncate">{aiStatus.badge}</span>
                              </div>
                              {aiStatus.isTransferred && (
                                <span className="text-[9px] text-indigo-600 font-semibold block mt-0.5">
                                  [Dipindahkan dari {aiStatus.origRunName}]
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-600">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                Status: <b className="text-slate-800">{stop.status_atm}</b>
                              </span>
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                Tipe: <b className="text-slate-800">{stop.tipe_trip}</b>
                              </span>
                            </div>

                            {/* Transfer to another Run controls */}
                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                              <span className="text-slate-400 font-semibold text-[9px]">Pindah Run:</span>
                              <div className="flex items-center gap-1">
                                {runs.map((r, targetRunIdx) => {
                                  if (targetRunIdx === runIdx) return null;
                                  return (
                                    <button
                                      key={r.nama_run}
                                      onClick={(e) => { e.stopPropagation(); handleTransferTrip(runIdx, stopIdx, targetRunIdx); }}
                                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 rounded font-bold transition-colors border border-slate-200 cursor-pointer"
                                    >
                                      {r.nama_run}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>AI secara otomatis mengevaluasi geofencing & potensi keterlambatan pada setiap perubahan.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Kembali
            </button>
            <button
              onClick={handleSaveClick}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-600/30 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* BEFORE-VS-AFTER IMPACT PREVIEW POP-UP (SUB-MODAL) */}
        {/* ================================================================= */}
        {showImpactModal && (
          <div className="absolute inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl text-white ${isRiskIncreased ? 'bg-amber-500' : 'bg-blue-600'}`}>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                      Analisis Dampak Perubahan Rute (Impact Analysis)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Perbandingan metrik operasional sebelum vs sesudah perubahan
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowImpactModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Metrics Comparison Grid */}
              <div className="grid grid-cols-3 gap-3">
                {/* Total Jarak */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-blue-600" /> TOTAL JARAK
                  </span>
                  <div className="text-xs text-slate-500">
                    Sebelum: <b className="text-slate-800">{beforeMetrics.totalDistance} km</b>
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1">
                    Sesudah: <span>{afterMetrics.totalDistance} km</span>
                  </div>
                  <div className={`text-[10px] font-bold ${distanceDiff > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {distanceDiff > 0 ? `+${distanceDiff} km` : `${distanceDiff} km`}
                  </div>
                </div>

                {/* Total Waktu Macet */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3 text-red-600" /> WAKTU MACET
                  </span>
                  <div className="text-xs text-slate-500">
                    Sebelum: <b className="text-slate-800">{beforeMetrics.totalDelay}m</b>
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1">
                    Sesudah: <span>{afterMetrics.totalDelay}m</span>
                  </div>
                  <div className={`text-[10px] font-bold ${delayDiff > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {delayDiff > 0 ? `+${delayDiff}m delay` : `${delayDiff}m delay`}
                  </div>
                </div>

                {/* Estimasi Selesai (ETA) */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ESTIMASI ETA
                  </span>
                  <div className="text-xs text-slate-500">
                    Sebelum: <b className="text-slate-800">{beforeMetrics.etaStr}</b>
                  </div>
                  <div className="text-sm font-extrabold text-slate-900">
                    Sesudah: <span>{afterMetrics.etaStr}</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    Berdasar lalu lintas AI
                  </div>
                </div>
              </div>

              {/* Dynamic Warning Banner */}
              {isRiskIncreased ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-black text-rose-700">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Peringatan Efisiensi Rute AI</span>
                  </div>
                  <p className="font-medium text-rose-800 leading-relaxed">
                    Perpindahan trip ini melanggar efisiensi geofencing AI dan menambah durasi macet sebesar{' '}
                    <strong className="underline">{Math.max(delayDiff, 15)} menit</strong>. Apakah Anda yakin ingin tetap menyimpan?
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-black text-emerald-700">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Perubahan Rute Optimal</span>
                  </div>
                  <p className="font-medium text-emerald-800 leading-relaxed">
                    Perubahan rute efisien dan memenuhi standar geofencing AI. Tekan Simpan untuk memperbarui Runsheet master.
                  </p>
                </div>
              )}

              {/* Sub-modal Confirmation Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowImpactModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Batal / Review Kembali
                </button>
                <button
                  onClick={confirmSave}
                  className={`px-5 py-2.5 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                    isRiskIncreased
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                  }`}
                >
                  <Save className="w-4 h-4" /> Ya, Lanjutkan Simpan
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
