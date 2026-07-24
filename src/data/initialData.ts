import { ClientATM, VehicleOption } from '../types';

export const BRANCHES = [
  'CIDENG',
  'KEBAYORAN',
  'JAKARTA PUSAT',
  'BANDUNG',
  'SEMARANG',
  'SURABAYA'
];

export const CYCLES = ['Pagi', 'Siang', 'Middle', 'Ad-hoc'];

export const ROUTE_PREFERENCES = [
  'Ganjil/Genap',
  'Hindari Jalan Tol',
  'Hindari Jalan Kecil'
];

export const DUMMY_CLIENT_ATMS: ClientATM[] = [
  {
    plan_no: "PL-20260600044",
    wsid: "BCA-236A",
    nama_client: "GBK",
    alamat: "Jakarta Cideng, Kec. Gambir, Jakarta Pusat",
    koordinat: "-6.173256, 106.810058",
    jam_operasional: "08:00 - 22:00",
    kebutuhan_kaset: 44,
    status_atm: "RS",
    tipe_trip: "H",
    is_no_bag: 0,
    cabang: "CIDENG",
    siklus: "Pagi"
  },
  {
    plan_no: "PL-20260601372",
    wsid: "BCA-236B",
    nama_client: "MOBIL KELILING KAS",
    alamat: "Jakarta Cideng Raya No. 12, Jakarta Pusat",
    koordinat: "-6.174000, 106.811000",
    jam_operasional: "08:00 - 22:00",
    kebutuhan_kaset: 14,
    status_atm: "RS",
    tipe_trip: "H",
    is_no_bag: 0,
    cabang: "CIDENG",
    siklus: "Pagi"
  },
  {
    plan_no: "PL-20260600316",
    wsid: "BCA-881A",
    nama_client: "RUKO CENTRAL PARK",
    alamat: "Jl. Letjen S. Parman, Tanjung Duren, Jakarta Barat",
    koordinat: "-6.176000, 106.790000",
    jam_operasional: "08:00 - 22:00",
    kebutuhan_kaset: 30,
    status_atm: "RS",
    tipe_trip: "H",
    is_no_bag: 0,
    cabang: "CIDENG",
    siklus: "Pagi"
  },
  {
    plan_no: "PL-20260600048",
    wsid: "BCA-236D",
    nama_client: "TOKO KELONGTONG SETIABUDI",
    alamat: "Jl. Setiabudi Tengah No. 11, Setiabudi, Jakarta Selatan",
    koordinat: "-6.208727, 106.824004",
    jam_operasional: "08:00 - 22:00",
    kebutuhan_kaset: 28,
    status_atm: "PL",
    tipe_trip: "H",
    is_no_bag: 0,
    cabang: "CIDENG",
    siklus: "Pagi"
  },
  {
    plan_no: "PL-20260600061",
    wsid: "PMT-1415",
    nama_client: "PB MELAWAI 2",
    alamat: "Komp. Wijaya Graha Puri Blok G No. 24, Jakarta Selatan",
    koordinat: "-6.245000, 106.801000",
    jam_operasional: "08:00 - 21:00",
    kebutuhan_kaset: 32,
    status_atm: "RS",
    tipe_trip: "H",
    is_no_bag: 0,
    cabang: "CIDENG",
    siklus: "Pagi"
  },
  {
    plan_no: "PL-20260600146",
    wsid: "MLT-2960",
    nama_client: "MULTI UTAMA KONSULTING / MCU",
    alamat: "Jl. Kyai Maja No. 8, Kebayoran Baru, Jakarta Selatan",
    koordinat: "-6.239000, 106.795000",
    jam_operasional: "08:00 - 20:00",
    kebutuhan_kaset: 20,
    status_atm: "RS",
    tipe_trip: "H",
    is_no_bag: 0,
    cabang: "CIDENG",
    siklus: "Pagi"
  },
  {
    plan_no: "PL-202605546764",
    wsid: "BCA-992C",
    nama_client: "POLSEK BRANGSONG",
    alamat: "Jl. Raya Brangsong No. 4, Kendal",
    koordinat: "-6.180000, 106.815000",
    jam_operasional: "08:00 - 22:00",
    kebutuhan_kaset: 18,
    status_atm: "RS",
    tipe_trip: "H",
    is_no_bag: 0,
    cabang: "CIDENG",
    siklus: "Pagi"
  },
  {
    plan_no: "PL-2026060552422",
    wsid: "AIS-0012",
    nama_client: "ATM AIS",
    alamat: "Jl. Petojo ViI No. 15, Jakarta Pusat",
    koordinat: "-6.172000, 106.812500",
    jam_operasional: "08:00 - 22:00",
    kebutuhan_kaset: 24,
    status_atm: "RS",
    tipe_trip: "H",
    is_no_bag: 0,
    cabang: "CIDENG",
    siklus: "Pagi"
  },
  {
    plan_no: "PL-202606001367",
    wsid: "AMB-4411",
    nama_client: "TOSERBA AMBARAWA",
    alamat: "Jl. Ambarawa No. 3, Tanah Abang, Jakarta Pusat",
    koordinat: "-6.185000, 106.819000",
    jam_operasional: "08:00 - 22:00",
    kebutuhan_kaset: 22,
    status_atm: "RS",
    tipe_trip: "H",
    is_no_bag: 0,
    cabang: "CIDENG",
    siklus: "Pagi"
  },
  {
    plan_no: "PL-202606000440",
    wsid: "TMR-0081",
    nama_client: "PB TAMAN RATU",
    alamat: "Komp. Taman Ratu Indah Blok D1, Jakarta Barat",
    koordinat: "-6.168000, 106.772000",
    jam_operasional: "08:00 - 22:00",
    kebutuhan_kaset: 36,
    status_atm: "RS",
    tipe_trip: "H",
    is_no_bag: 0,
    cabang: "CIDENG",
    siklus: "Pagi"
  },
  {
    plan_no: "PL-20260600336",
    wsid: "PTM-5012",
    nama_client: "PB PATTIMURA",
    alamat: "Jl. Pattimura No. 2, Kebayoran Baru, Jakarta Selatan",
    koordinat: "-6.234000, 106.803000",
    jam_operasional: "08:00 - 22:00",
    kebutuhan_kaset: 16,
    status_atm: "RS",
    tipe_trip: "H",
    is_no_bag: 0,
    cabang: "CIDENG",
    siklus: "Pagi"
  },
  {
    plan_no: "PL-20260553593",
    wsid: "JTK-0003",
    nama_client: "ATM KK JATAKE 3",
    alamat: "Kawasan Industri Jatake, Tangerang",
    koordinat: "-6.179599, 106.819879",
    jam_operasional: "08:00 - 22:00",
    kebutuhan_kaset: 18,
    status_atm: "RS",
    tipe_trip: "H",
    is_no_bag: 0,
    cabang: "CIDENG",
    siklus: "Pagi"
  },
  {
    plan_no: "PL-20260553574",
    wsid: "JTK-0006",
    nama_client: "ATM JATAKE 6",
    alamat: "Jl. Raya Serang Km 7, Jatake, Tangerang",
    koordinat: "-6.179599, 106.819879",
    jam_operasional: "08:00 - 22:00",
    kebutuhan_kaset: 20,
    status_atm: "RS",
    tipe_trip: "H",
    is_no_bag: 0,
    cabang: "CIDENG",
    siklus: "Pagi"
  },
  {
    plan_no: "PL-20260600366",
    wsid: "GJT-5001",
    nama_client: "PT GAJAH TUNGGAL 5",
    alamat: "Jl. Kebon Kacang Raya, Apartemen Thamrin Residen, Jakarta Pusat",
    koordinat: "-6.19803848, 106.81590168",
    jam_operasional: "08:00 - 22:00",
    kebutuhan_kaset: 26,
    status_atm: "RS",
    tipe_trip: "H",
    is_no_bag: 0,
    cabang: "CIDENG",
    siklus: "Pagi"
  },
  {
    plan_no: "PL-20260600277",
    wsid: "IDM-9912",
    nama_client: "JKT3 IDM FAJAR BARU",
    alamat: "Mid Plaza Tower Jl. Jendral Sudirman Kav. 10 - 11, Jakarta 10220",
    koordinat: "-6.2095596, 106.821253",
    jam_operasional: "08:00 - 22:00",
    kebutuhan_kaset: 12,
    status_atm: "RS",
    tipe_trip: "H",
    is_no_bag: 0,
    cabang: "CIDENG",
    siklus: "Pagi"
  },
  {
    plan_no: "PL-20260600600",
    wsid: "CKP-8810",
    nama_client: "ATM KCP CIKUPA",
    alamat: "Jl. Ir. H. Juando No. 27A, Jakarta",
    koordinat: "-6.166869, 106.825215",
    jam_operasional: "08:00 - 22:00",
    kebutuhan_kaset: 28,
    status_atm: "RS",
    tipe_trip: "H",
    is_no_bag: 0,
    cabang: "CIDENG",
    siklus: "Pagi"
  },
  {
    plan_no: "PL-20260600108",
    wsid: "TOTAL-01",
    nama_client: "TOTAL BUAH WARUNG BUNCIT",
    alamat: "Jl. Warung Buncit Raya No. 98, Jakarta Selatan",
    koordinat: "-6.262000, 106.828000",
    jam_operasional: "08:00 - 22:00",
    kebutuhan_kaset: 30,
    status_atm: "RS",
    tipe_trip: "H",
    is_no_bag: 0,
    cabang: "CIDENG",
    siklus: "Pagi"
  },
  {
    plan_no: "PL-20260600137",
    wsid: "GEDUNG-01",
    nama_client: "GEDUNG SARANA JAYA",
    alamat: "Jl. Budi Kemuliaan No. 1, Jakarta Pusat",
    koordinat: "-6.182000, 106.821000",
    jam_operasional: "08:00 - 22:00",
    kebutuhan_kaset: 25,
    status_atm: "RS",
    tipe_trip: "H",
    is_no_bag: 0,
    cabang: "CIDENG",
    siklus: "Pagi"
  }
];

export const FLEET_VEHICLES: VehicleOption[] = [
  { plat_nomor: "B1065PIE", jenis_mobil: "Isuzu Panther Cash Van", kapasitas_maksimal: 1200, status: "Tersedia" },
  { plat_nomor: "B1066PIE", jenis_mobil: "Isuzu Panther Cash Van", kapasitas_maksimal: 1200, status: "Tersedia" },
  { plat_nomor: "B124FLI", jenis_mobil: "Toyota Hilux Armored", kapasitas_maksimal: 1200, status: "Tersedia" },
  { plat_nomor: "B2060BFE", jenis_mobil: "Isuzu Traga Armor", kapasitas_maksimal: 1200, status: "Tersedia" },
  { plat_nomor: "B1890SJK", jenis_mobil: "Daihatsu Gran Max Van", kapasitas_maksimal: 1200, status: "Tersedia" },
  { plat_nomor: "B2910TXZ", jenis_mobil: "Isuzu Panther Cash Van", kapasitas_maksimal: 1200, status: "Tersedia" },
  { plat_nomor: "B3012KLP", jenis_mobil: "Toyota Hilux Armored", kapasitas_maksimal: 1200, status: "Tersedia" },
  { plat_nomor: "B4421MNO", jenis_mobil: "Mitsubishi L300 Armored", kapasitas_maksimal: 1200, status: "Tersedia" },
  { plat_nomor: "B8819QRS", jenis_mobil: "Isuzu Traga Armor", kapasitas_maksimal: 1200, status: "Tersedia" },
  { plat_nomor: "B9901TUV", jenis_mobil: "Isuzu Panther Cash Van", kapasitas_maksimal: 1200, status: "Tersedia" }
];

export const STAFF_OFFICERS = [
  { custody1: { nama: "ARI YANTO DWI PRASETYO", nik: "8202151644" }, custody2: { nama: "JERI DWI SANTOSO", nik: "8200201660" }, pengawal: { nama: "NANA RUSLANA", nik: "8210389093" } },
  { custody1: { nama: "BUDI SANTOSO", nik: "8202151111" }, custody2: { nama: "AGUS PRABOWO", nik: "8200202222" }, pengawal: { nama: "DEDI KURNIAWAN", nik: "8210383333" } },
  { custody1: { nama: "HENDRA SUCIPTO", nik: "8202154444" }, custody2: { nama: "BAMBANG HERMANTO", nik: "8200205555" }, pengawal: { nama: "RUDI SETIAWAN", nik: "8210386666" } },
  { custody1: { nama: "EKO PRASETYO", nik: "8202157777" }, custody2: { nama: "WAHYU NUGROHO", nik: "8200208888" }, pengawal: { nama: "FAJAR HIDAYAT", nik: "8210389999" } },
  { custody1: { nama: "ANDI WIJAYA", nik: "8202151234" }, custody2: { nama: "TEGUH FIRMANSYAH", nik: "8200205678" }, pengawal: { nama: "HERU SUBAGYO", nik: "8210389012" } }
];
