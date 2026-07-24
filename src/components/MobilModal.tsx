import React, { useState } from 'react';
import { VehicleOption } from '../types';
import { FLEET_VEHICLES } from '../data/initialData';
import { X, Search, Truck, CheckCircle2, Edit2 } from 'lucide-react';

interface MobilModalProps {
  isOpen: boolean;
  onClose: () => void;
  runName: string;
  currentPlate: string;
  onSelectVehicle: (runName: string, newPlate: string) => void;
  usedPlates?: string[];
}

export const MobilModal: React.FC<MobilModalProps> = ({
  isOpen,
  onClose,
  runName,
  currentPlate,
  onSelectVehicle,
  usedPlates = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlate, setSelectedPlate] = useState(currentPlate);

  if (!isOpen) return null;

  const filteredVehicles = FLEET_VEHICLES.filter(v =>
    v.plat_nomor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.jenis_mobil.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = () => {
    onSelectVehicle(runName, selectedPlate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-md text-xs font-semibold uppercase tracking-wider">
              Detail Mobil {runName}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Current Vehicle Badge */}
          <div className="bg-slate-800/90 border border-slate-700/70 rounded-xl p-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              KENDARAAN SAAT INI
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">PLAT NOMOR</span>
                  <div className="text-lg font-black text-white tracking-wide">
                    {selectedPlate}
                  </div>
                </div>
              </div>
              <div className="text-xs bg-slate-700 text-slate-300 px-2.5 py-1 rounded-md font-semibold">
                Kapasitas: 1200
              </div>
            </div>
          </div>

          {/* Search Input */}
          <div>
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              PILIH KENDARAAN FLEET
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari plat nomor..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Vehicle List */}
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredVehicles.map(vehicle => {
              const isCurrent = vehicle.plat_nomor === selectedPlate;
              const isUsedByOtherRun = usedPlates.includes(vehicle.plat_nomor) && vehicle.plat_nomor !== currentPlate;

              return (
                <button
                  key={vehicle.plat_nomor}
                  disabled={isUsedByOtherRun}
                  onClick={() => setSelectedPlate(vehicle.plat_nomor)}
                  className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isCurrent
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : isUsedByOtherRun
                      ? 'bg-slate-800/40 border-slate-800/60 opacity-40 cursor-not-allowed'
                      : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm tracking-wide">
                      {vehicle.plat_nomor}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {vehicle.jenis_mobil}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isUsedByOtherRun ? (
                      <span className="text-[10px] bg-slate-700/80 text-slate-400 px-2 py-0.5 rounded font-medium">
                        Digunakan
                      </span>
                    ) : isCurrent ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-blue-600/30"
          >
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
};
