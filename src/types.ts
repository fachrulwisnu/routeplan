/**
 * Types for Route Plan AI - PT. Advantage SCM
 */

export interface ClientATM {
  plan_no: string;
  nama_client: string;
  alamat: string;
  koordinat: string; // e.g., "-6.173256, 106.810058"
  jam_operasional: string; // e.g., "08:00-22:00" or "24 Jam"
  kebutuhan_kaset: number;
  status_atm: string; // "RS" (Replenishment), "PL" (Planning), "FL" (First Line), etc.
  tipe_trip: string; // "H" (Handled), "B" (Bagged), etc.
  is_no_bag?: number; // 0 = Dengan Bag, 1 = Tanpa Bag
  wsid?: string;
  cabang?: string;
  siklus?: string;
}

export interface RoutePlanRequest {
  cabang: string;
  tanggal_replenish: string; // e.g. "02 Jun 2026"
  siklus: string; // "Pagi" | "Siang" | "Middle" | "Ad-hoc"
  preferensi_rute: string[]; // ["Ganjil/Genap", "Hindari Jalan Tol", "Hindari Jalan Kecil"]
  data_atm: ClientATM[];
}

export interface VisitStop {
  urutan: number;
  plan_no: string;
  nama_client: string;
  alamat: string;
  koordinat: string;
  status_atm: string;
  tipe_trip: string;
  jam_buka_tutup: string;
  durasi_transaksi_menit: number;
  prediksi_jam_tiba_di_lokasi: string; // "08:30"
  prediksi_jam_mulai_transaksi: string; // "08:30"
  prediksi_jam_selesai_transaksi: string; // "08:45"
  prediksi_jam_keluar_dari_lokasi: string; // "08:45"
  kebutuhan_kaset?: number;
}

export interface PetugasDetail {
  custody1: { nama: string; nik: string };
  custody2?: { nama: string; nik: string };
  pengawal: { nama: string; nik: string };
}

export interface Run {
  nama_run: string; // "run-1", "run-2", etc.
  jenis_trip: string; // "Dengan Bag" | "Tanpa Bag"
  jumlah_trip: number;
  total_durasi_pengerjaan: string; // "1j 15m"
  total_jarak_tempuh_km: number; // e.g. 15.5
  petugas: string[]; // List of names
  petugas_detail?: PetugasDetail;
  plat_mobil: string; // e.g. "B1065PIE"
  kapasitas_mobil: string; // e.g. "88/1200"
  rute_kunjungan: VisitStop[];
}

export interface OperationalSummary {
  total_run: number;
  total_kunjungan_atm: number;
  kapasitas_kaset_terpakai: string; // "88/1200"
  total_petugas: string; // "6 Custody, 3 Pengawal"
  total_jarak_tempuh_km: number; // 45.5
  status_tugas: string; // "Semua ter-assign"
  total_mobil: string; // "3/10"
}

export interface RunsheetResponse {
  ringkasan_operasional: OperationalSummary;
  runs: Run[];
}

export interface VehicleOption {
  plat_nomor: string;
  jenis_mobil: string;
  kapasitas_maksimal: number;
  status: 'Tersedia' | 'Digunakan' | 'Maintenance';
  assigned_run?: string;
}
