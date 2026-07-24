import React, { useState } from 'react';
import { RunsheetResponse, Run, VisitStop } from '../types';
import { MapView } from './MapView';
import { PetugasModal } from './PetugasModal';
import { MobilModal } from './MobilModal';
import { SwitchTripModal } from './SwitchTripModal';
import {
  Layers, MapPin, Users, Truck, CheckCircle, Clock,
  ArrowRightLeft, FileSpreadsheet, Eye, Navigation, ShieldCheck
} from 'lucide-react';

interface ResultViewProps {
  runsheetData: RunsheetResponse;
  tanggalReplenish: string;
  siklus: string;
  onUpdateRunsheet: (updatedData: RunsheetResponse) => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  runsheetData,
  tanggalReplenish,
  siklus,
  onUpdateRunsheet
}) => {
  const [selectedRunIndex, setSelectedRunIndex] = useState<number | null>(null);
  const [petugasModalOpen, setPetugasModalOpen] = useState(false);
  const [mobilModalOpen, setMobilModalOpen] = useState(false);
  const [switchTripModalOpen, setSwitchTripModalOpen] = useState(false);
  const [activeRunName, setActiveRunName] = useState<string>('run-1');

  const { ringkasan_operasional, runs } = runsheetData;

  // Selected Run Object
  const currentRun = runs.find(r => r.nama_run === activeRunName) || runs[0];

  // Open Petugas Modal
  const handleOpenPetugas = (runName: string) => {
    setActiveRunName(runName);
    setPetugasModalOpen(true);
  };

  // Open Mobil Modal
  const handleOpenMobil = (runName: string) => {
    setActiveRunName(runName);
    setMobilModalOpen(true);
  };

  // Vehicle plate update callback
  const handleSelectVehicle = (runName: string, newPlate: string) => {
    const updatedRuns = runs.map(r => {
      if (r.nama_run === runName) {
        return { ...r, plat_mobil: newPlate };
      }
      return r;
    });

    onUpdateRunsheet({
      ...runsheetData,
      runs: updatedRuns
    });
  };

  // Save changes from Switch Trip Modal
  const handleSaveSwitchTrip = (updatedRuns: Run[]) => {
    // Recalculate summary stats
    let totalKm = 0;
    let totalCassettes = 0;
    let totalTrips = 0;

    updatedRuns.forEach(r => {
      totalKm += r.total_jarak_tempuh_km;
      totalTrips += r.rute_kunjungan.length;
      r.rute_kunjungan.forEach(s => {
        totalCassettes += (s.kebutuhan_kaset || 25);
      });
      r.jumlah_trip = r.rute_kunjungan.length;
      r.kapasitas_mobil = `${totalCassettes}/1200`;
    });

    onUpdateRunsheet({
      ringkasan_operasional: {
        ...ringkasan_operasional,
        total_run: updatedRuns.length,
        total_kunjungan_atm: totalTrips,
        total_jarak_tempuh_km: Math.round(totalKm * 10) / 10,
      },
      runs: updatedRuns
    });
  };

  const usedPlates = runs.map(r => r.plat_mobil);

  return (
    <div className="space-y-6 w-full">
      
      {/* 1. Ringkasan Operasional Summary Cards (Fig 14 in FSD) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <Layers className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              RINGKASAN OPERASIONAL
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSwitchTripModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Switch Trip</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          {/* Total Run */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-lg shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">TOTAL RUN</span>
              <div className="text-base font-black text-slate-900">{ringkasan_operasional.total_run} Run</div>
            </div>
          </div>

          {/* Total Kunjungan */}
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-lg shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">TOTAL KUNJUNGAN</span>
              <div className="text-base font-black text-slate-900">{ringkasan_operasional.total_kunjungan_atm} ATM</div>
            </div>
          </div>

          {/* Kapasitas Kaset */}
          <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 bg-amber-600 text-white rounded-lg shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">KAPASITAS KASET</span>
              <div className="text-base font-black text-slate-900">{ringkasan_operasional.kapasitas_kaset_terpakai}</div>
            </div>
          </div>

          {/* Total Petugas */}
          <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 bg-purple-600 text-white rounded-lg shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">TOTAL PETUGAS</span>
              <div className="text-xs font-bold text-slate-900">{ringkasan_operasional.total_petugas}</div>
            </div>
          </div>

          {/* Total Jarak Tempuh */}
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-lg shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">TOTAL JARAK TEMPUH</span>
              <div className="text-base font-black text-slate-900">{ringkasan_operasional.total_jarak_tempuh_km} Km</div>
            </div>
          </div>

          {/* Status Tugas */}
          <div className="bg-teal-50/60 border border-teal-100 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 bg-teal-600 text-white rounded-lg shrink-0">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">STATUS TUGAS</span>
              <div className="text-xs font-bold text-teal-800 line-clamp-2">{ringkasan_operasional.status_tugas}</div>
            </div>
          </div>

          {/* Total Mobil */}
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 bg-slate-800 text-white rounded-lg shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">TOTAL MOBIL</span>
              <div className="text-base font-black text-slate-900">{ringkasan_operasional.total_mobil}</div>
            </div>
          </div>

          {/* Total Estimasi Delay */}
          <div className="bg-red-50/80 border border-red-200 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 bg-red-600 text-white rounded-lg shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-red-600 uppercase block">ESTIMASI DELAY</span>
              <div className="text-base font-black text-red-700">
                {ringkasan_operasional.total_estimasi_delay_menit || 0} Menit
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Route Map (Fig 3 & Fig 9 in FSD) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Visualisasi Rute Perjalanan Peta (VRP Interactive Route Map)
            </h3>
          </div>

          {/* Filter Map to specific run */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-50 p-1 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 px-2 uppercase">FILTER RUTE:</span>
            <button
              onClick={() => setSelectedRunIndex(null)}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                selectedRunIndex === null ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Run
            </button>
            {runs.map((r, idx) => (
              <button
                key={r.nama_run}
                onClick={() => setSelectedRunIndex(idx)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                  selectedRunIndex === idx ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r.nama_run}
              </button>
            ))}
          </div>
        </div>

        <MapView
          runs={runs}
          selectedRunIndex={selectedRunIndex}
          height="520px"
        />
      </div>

      {/* 3. Tabel Hasil Generate (Fig 11 in FSD) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
            TABEL HASIL GENERATE RUNSHEET
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Klik button Detail Petugas atau Plat Nomor untuk melihat/merubah assignment
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-y border-slate-200 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">No</th>
                <th className="py-3 px-3">Run</th>
                <th className="py-3 px-3">Jenis Trip</th>
                <th className="py-3 px-3 text-center">Jumlah Trip</th>
                <th className="py-3 px-3">Total Durasi Pengerjaan</th>
                <th className="py-3 px-3">Total Jarak Tempuh</th>
                <th className="py-3 px-3 text-center">Petugas</th>
                <th className="py-3 px-3 text-center">Mobil</th>
                <th className="py-3 px-3 text-right">Kapasitas Mobil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {runs.map((r, index) => {
                const isSelected = activeRunName === r.nama_run;
                return (
                  <tr
                    key={r.nama_run}
                    onClick={() => setActiveRunName(r.nama_run)}
                    className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/80 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3.5 px-3 font-bold text-slate-500">{index + 1}</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 font-extrabold rounded-lg">
                        {r.nama_run}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-700">{r.jenis_trip}</td>
                    <td className="py-3.5 px-3 text-center font-bold">{r.jumlah_trip}</td>
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-800">{r.total_durasi_pengerjaan}</td>
                    <td className="py-3.5 px-3 font-bold text-emerald-600">{r.total_jarak_tempuh_km} Km</td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenPetugas(r.nama_run); }}
                        className="px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-blue-600 font-bold rounded-lg border border-slate-200 transition-colors"
                      >
                        Detail
                      </button>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenMobil(r.nama_run); }}
                        className="px-3 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-mono font-extrabold rounded-lg border border-emerald-200 transition-colors"
                      >
                        {r.plat_mobil}
                      </button>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-extrabold text-slate-800">
                      {r.kapasitas_mobil}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Detail List Trip Tiap Run (Fig 8 & Fig 10 in FSD) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              DAFTAR KUNJUNGAN UNTUK {currentRun?.nama_run.toUpperCase()} ({currentRun?.rute_kunjungan.length} TRIP)
            </h3>
            <p className="text-xs text-slate-500">
              Detail rantai estimasi waktu operasional (Waktu Tiba, Transaksi, dan Keluar)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {runs.map(r => (
              <button
                key={r.nama_run}
                onClick={() => setActiveRunName(r.nama_run)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border ${
                  activeRunName === r.nama_run
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {r.nama_run}
              </button>
            ))}
          </div>
        </div>

        {/* List of Trip Cards for the selected run */}
        <div className="space-y-4">
          {currentRun?.rute_kunjungan.map((stop, idx) => (
            <div
              key={stop.plan_no + idx}
              className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 bg-blue-600 text-white font-black text-xs rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    {stop.urutan}
                  </span>
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">
                      {stop.nama_client}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                      {stop.alamat}
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono text-xs">
                  <span className="bg-slate-200 text-slate-800 px-2.5 py-1 rounded-lg font-bold">
                    Plan No: {stop.plan_no}
                  </span>
                </div>
              </div>

              {/* Time Schedule & Metadata Grid */}
              <div className="mt-4 pt-3 border-t border-slate-200/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">STATUS ATM & TIPE</span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {stop.status_atm} | Tipe: {stop.tipe_trip}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">KOORDINAT</span>
                  <div className="font-mono text-slate-800 text-[11px] mt-0.5">
                    {stop.koordinat}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">JAM OPERASIONAL</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {stop.jam_buka_tutup}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">DURASI TRANSAKSI</span>
                  <div className="font-bold text-blue-600 mt-0.5">
                    {stop.durasi_transaksi_menit} Menit
                  </div>
                </div>
              </div>

              {/* Sequential HH:MM Chained Predictions & AI Traffic Analysis */}
              <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200/80 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block">Prediksi Jam Tiba</span>
                  <span className="text-sm font-extrabold text-blue-600 font-mono">
                    {stop.prediksi_jam_tiba_di_lokasi}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block">Prediksi Jam Mulai</span>
                  <span className="text-sm font-extrabold text-slate-800 font-mono">
                    {stop.prediksi_jam_mulai_transaksi}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block">Prediksi Jam Selesai</span>
                  <span className="text-sm font-extrabold text-emerald-600 font-mono">
                    {stop.prediksi_jam_selesai_transaksi}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block">Prediksi Jam Keluar</span>
                  <span className="text-sm font-extrabold text-slate-800 font-mono">
                    {stop.prediksi_jam_keluar_dari_lokasi}
                  </span>
                </div>
              </div>

              {/* AI Traffic & Route Badges */}
              {(stop.status_lalu_lintas || stop.keterangan_ai || stop.is_zona_ganjil_genap !== undefined) && (
                <div className="mt-3 pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Lalu Lintas Badge */}
                    {stop.status_lalu_lintas && (
                      <span
                        className="px-2.5 py-1 rounded-lg text-[11px] font-black text-white flex items-center gap-1 shadow-xs"
                        style={{ backgroundColor: stop.warna_jalur || (stop.status_lalu_lintas === 'Macet' ? '#FF0000' : '#0088FF') }}
                      >
                        🚦 Lalu Lintas: {stop.status_lalu_lintas}
                      </span>
                    )}

                    {/* Delay Badge */}
                    {stop.prediksi_delay_menit !== undefined && stop.prediksi_delay_menit > 0 && (
                      <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-[11px] font-extrabold border border-red-200">
                        ⏱️ +{stop.prediksi_delay_menit}m Potensi Delay
                      </span>
                    )}

                    {/* Zona Ganjil Genap */}
                    {stop.is_zona_ganjil_genap !== undefined && (
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                        stop.is_zona_ganjil_genap
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        🚘 Ganjil-Genap: {stop.is_zona_ganjil_genap ? 'Ya (Aturan Berlaku)' : 'Bukan Zona'}
                      </span>
                    )}

                    {/* Lewat Tol */}
                    {stop.is_lewat_tol !== undefined && (
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold">
                        🛣️ Rute: {stop.is_lewat_tol ? 'Lewat Jalan Tol' : 'Jalan Arteri'}
                      </span>
                    )}
                  </div>

                  {/* Keterangan AI Callout */}
                  {stop.keterangan_ai && (
                    <div className="w-full mt-1.5 p-2 bg-blue-50/70 border border-blue-200/60 rounded-xl text-[11px] text-blue-900 font-medium">
                      🤖 <span className="font-bold">Analisis AI Traffic:</span> {stop.keterangan_ai}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <PetugasModal
        isOpen={petugasModalOpen}
        onClose={() => setPetugasModalOpen(false)}
        runName={activeRunName}
        petugasDetail={currentRun?.petugas_detail}
        petugasList={currentRun?.petugas || []}
      />

      <MobilModal
        isOpen={mobilModalOpen}
        onClose={() => setMobilModalOpen(false)}
        runName={activeRunName}
        currentPlate={currentRun?.plat_mobil || 'B1065PIE'}
        onSelectVehicle={handleSelectVehicle}
        usedPlates={usedPlates}
      />

      <SwitchTripModal
        isOpen={switchTripModalOpen}
        onClose={() => setSwitchTripModalOpen(false)}
        runs={runs}
        tanggalReplenish={tanggalReplenish}
        siklus={siklus}
        onSaveRuns={handleSaveSwitchTrip}
      />
    </div>
  );
};
