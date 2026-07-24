import React, { useState } from 'react';
import { Run, VisitStop } from '../types';
import { MapView } from './MapView';
import { X, ArrowLeft, MoveUp, MoveDown, ArrowLeftRight, Save, Eye, MapPin } from 'lucide-react';

interface SwitchTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  runs: Run[];
  tanggalReplenish: string;
  siklus: string;
  onSaveRuns: (updatedRuns: Run[]) => void;
}

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

  if (!isOpen) return null;

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

  const handleSave = () => {
    onSaveRuns(runs);
    onClose();
  };

  const selectedPreviewRun = previewRunIndex !== null ? runs[previewRunIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-6 overflow-hidden">
      <div className="bg-slate-50 border border-slate-200 rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header (Fig 5) */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Switch Trip</h2>
              <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full">
                Interactive Schedule Editor
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage and reorder replenishment schedules between runs
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
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {selectedPreviewRun !== null ? (
          /* View 2: Run Detail Preview Modal (Fig 6 in FSD) */
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-6 gap-6 bg-slate-100">
            <div className="w-full md:w-1/2 flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setPreviewRunIndex(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali ke Semua Run
                </button>
                <span className="text-xs font-extrabold uppercase px-3 py-1 bg-blue-600 text-white rounded-lg">
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
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3">
                Daftar kunjungan untuk {selectedPreviewRun.nama_run}
              </h3>

              <div className="space-y-3">
                {selectedPreviewRun.rute_kunjungan.map((stop) => (
                  <div
                    key={stop.plan_no + stop.urutan}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                          {stop.urutan}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{stop.nama_client}</span>
                      </div>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                        {stop.plan_no}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1 pl-8">{stop.alamat}</p>

                    <div className="grid grid-cols-2 gap-2 mt-3 pl-8 text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                      <div>Status ATM: <b className="text-slate-800">{stop.status_atm}</b></div>
                      <div>Tipe Trip: <b className="text-slate-800">{stop.tipe_trip}</b></div>
                      <div>Jam Tiba: <b className="text-blue-600">{stop.prediksi_jam_tiba_di_lokasi}</b></div>
                      <div>Durasi: <b className="text-slate-800">{stop.durasi_transaksi_menit} Menit</b></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* View 1: Multi-column Runs List (Fig 5 in FSD) */
          <div className="flex-1 overflow-x-auto p-6 bg-slate-100/70">
            <div className="flex items-start gap-5 min-w-max h-full">
              {runs.map((run, runIdx) => (
                <div
                  key={run.nama_run}
                  className="w-80 bg-white border border-slate-200 rounded-2xl flex flex-col max-h-full shadow-sm"
                >
                  {/* Column Header */}
                  <div className="p-3.5 border-b border-slate-200 bg-slate-50/80 rounded-t-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                        {run.nama_run}
                      </span>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                        {run.rute_kunjungan.length} Trip
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        title="Klik 2x untuk Lihat Detail Map Run"
                        onClick={() => setPreviewRunIndex(runIdx)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail
                      </button>
                    </div>
                  </div>

                  {/* Trip Cards Container */}
                  <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                    {run.rute_kunjungan.map((stop, stopIdx) => (
                      <div
                        key={stop.plan_no + stopIdx}
                        onDoubleClick={() => setPreviewRunIndex(runIdx)}
                        className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-3 shadow-2xs hover:shadow-md transition-all group relative cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">
                              {stop.urutan}
                            </span>
                            <span className="font-bold text-xs text-slate-800 truncate max-w-[170px]">
                              {stop.nama_client}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            {/* Move Up */}
                            {stopIdx > 0 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReorderStop(runIdx, stopIdx, 'up'); }}
                                title="Naikkan Urutan"
                                className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600"
                              >
                                <MoveUp className="w-3 h-3" />
                              </button>
                            )}
                            {/* Move Down */}
                            {stopIdx < run.rute_kunjungan.length - 1 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReorderStop(runIdx, stopIdx, 'down'); }}
                                title="Turunkan Urutan"
                                className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600"
                              >
                                <MoveDown className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500 font-medium">
                          Plan No: <span className="font-mono text-slate-700">{stop.plan_no}</span>
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-600">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            Status: <b className="text-slate-800">{stop.status_atm}</b>
                          </span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            Tipe: <b className="text-slate-800">{stop.tipe_trip}</b>
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                          🕒 <span>{stop.jam_buka_tutup}</span>
                        </div>

                        {/* Transfer to another Run controls */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-medium">Pindah Run:</span>
                          <div className="flex items-center gap-1">
                            {runs.map((r, targetRunIdx) => {
                              if (targetRunIdx === runIdx) return null;
                              return (
                                <button
                                  key={r.nama_run}
                                  onClick={(e) => { e.stopPropagation(); handleTransferTrip(runIdx, stopIdx, targetRunIdx); }}
                                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 rounded font-semibold transition-colors border border-slate-200"
                                >
                                  {r.nama_run}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            Kembali
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-600/30 flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
