import React from 'react';
import { PetugasDetail } from '../types';
import { X, ShieldCheck, UserCheck, User } from 'lucide-react';

interface PetugasModalProps {
  isOpen: boolean;
  onClose: () => void;
  runName: string;
  petugasDetail?: PetugasDetail;
  petugasList: string[];
}

export const PetugasModal: React.FC<PetugasModalProps> = ({
  isOpen,
  onClose,
  runName,
  petugasDetail,
  petugasList
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-md text-xs font-semibold uppercase tracking-wider">
              {runName}
            </span>
            <h3 className="text-base font-bold text-slate-100">Detail Petugas Penugasan</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">
            PETUGAS PENUGASAN (SCM CASH OPERATIONS)
          </div>

          {/* Custody 1 */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center text-sm border border-blue-500/30">
              AY
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">CUSTODY 1</span>
              <div className="text-sm font-bold text-white">
                {petugasDetail?.custody1?.nama || petugasList[0] || 'ARI YANTO DWI PRASETYO'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                NIK: {petugasDetail?.custody1?.nik || '8202151644'}
              </div>
            </div>
            <UserCheck className="w-5 h-5 text-blue-400 opacity-80" />
          </div>

          {/* Custody 2 */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center text-sm border border-indigo-500/30">
              JD
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">CUSTODY 2</span>
              <div className="text-sm font-bold text-white">
                {petugasDetail?.custody2?.nama || petugasList[1] || 'JERI DWI SANTOSO'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                NIK: {petugasDetail?.custody2?.nik || '8200201660'}
              </div>
            </div>
            <User className="w-5 h-5 text-indigo-400 opacity-80" />
          </div>

          {/* Pengawal / Security */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/30">
              NR
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">PENGAWAL</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-medium">INTERNAL SECURITY</span>
              </div>
              <div className="text-sm font-bold text-white">
                {petugasDetail?.pengawal?.nama || petugasList[2] || 'NANA RUSLANA'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                NIK: {petugasDetail?.pengawal?.nik || '8210389093'}
              </div>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-400 opacity-80" />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-600/30"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
