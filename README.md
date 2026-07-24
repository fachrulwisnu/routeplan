# Route Plan AI - PT. Advantage Supply Chain Management (SCM)

**Versi Dokumen FSD:** 1.5  
**Klasifikasi:** Rahasia / Internal Enterprise  
**Pemilik Sistem:** Sentral Planner ROC - COS (Cash Operations)  
**Area Bisnis:** COS dan Operations  

---

## 📌 Overview Application

**Route Plan AI** adalah sistem kecerdasan buatan (*AI-powered Route Planner & Vehicle Routing Problem / VRP Solver*) yang dirancang khusus untuk mempercepat dan mengoptimalkan proses pembuatan *Runsheet* pengisian kas dan pemeliharaan mesin ATM (*ATM Replenishment & Cash Management*) di lingkungan **PT. Advantage SCM**.

Aplikasi ini mengintegrasikan data lokasi tugas secara langsung dari platform dispatch **MileApp API** dan memproses estimasi rute tercepat, penugasan personel (*Custody* dan *Pengawal*), alokasi kendaraan lapis baja (*Armored Cash Van*), serta prediksi rantai waktu operasional menggunakan model kecerdasan buatan **NVIDIA Nemotron-3 Super 120B** dengan *fallback engine* VRP lokal.

---

## 🛠️ Technology Stack

### **Frontend Architecture**
- **Framework:** React 19 with TypeScript
- **Styling & UI:** Tailwind CSS v4, Lucide React Icons
- **Interactive Maps:** Leaflet.js with OpenStreetMap tiles (Visualisasi VRP, Polyline Rute, & Marker Grouping)
- **Animations:** Motion (`motion/react`)

### **Backend & API Architecture**
- **Runtime Environment:** Node.js + Express (Server-side API Layer)
- **Dev & Build Tooling:** `tsx` for TypeScript execution, `esbuild` for production CommonJS bundling, Vite 6
- **AI Engine:** NVIDIA Nemotron-3 Super 120B (`nvidia/nemotron-3-super-120b-a12b` via OpenAI SDK Client)
- **Data Dispatch Integration:** MileApp Tasks API (`https://apiv2.mile.app/v1/tasks`)
- **VRP Fallback Engine:** Algoritma Haversine Clustering & Time-Chaining lokal

---

## 🔄 End-to-End System Integration Flow

```
┌─────────────────────────┐
│     MileApp API         │ ── (1) GET /v1/tasks (Live Task Data)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Express Backend Server  │ ── (2) Payload Data ATM & Parameter Operasional
└────────────┬────────────┘
             │
             ├──► [Primary] NVIDIA Nemotron-3 AI (VRP Reasoning Solver)
             │
             └──► [Fallback] Local Haversine Spatial VRP Engine
             │
             ▼
┌─────────────────────────┐
│  Runsheet JSON Output   │ ── (3) Standardized FSD Output Schema
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   React 19 Dashboard UI                     │
│  - Interactive Leaflet VRP Route Maps                       │
│  - Operational Summary Cards                                │
│  - Generated Runsheet Table                                 │
│  - Detail Petugas & Detail Mobil Lookups                    │
│  - Switch Trip Modal (Drag/Reorder & Transfer Trip antar Run)│
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Rules & Constraints Operational (FSD v1.5)

Sistem diatur oleh 5 aturan dan kendala operasional utama:

1. **Optimasi Jarak & Waktu (Clustering Spatial):**
   Lokasi mesin ATM dikelompokkan ke dalam beberapa *Run* (misal: `run-1`, `run-2`, `run-3`) berdasarkan kedekatan koordinat fisik (Latitude, Longitude) sehingga rute pada peta tidak saling tumpang tindih.
2. **Kapasitas Kaset Kendaraan:**
   Setiap unit mobil kas memiliki batas kapasitas maksimal **1.200 kaset**. Total kaset dalam satu *Run* tidak boleh melebihi batas ini. Format output dinyatakan sebagai `Terpakai/Maksimal` (contoh: `88/1200`).
3. **Estimasi Waktu Berantai (Sequential Time Chaining):**
   Setiap kunjungan menghasilkan rincian estimasi jam operasional format `HH:MM`:
   - *Prediksi Jam Tiba di Lokasi*
   - *Prediksi Jam Mulai Transaksi*
   - *Durasi Transaksi* (Default 15 Menit)
   - *Prediksi Jam Selesai Transaksi*
   - *Prediksi Jam Keluar dari Lokasi* (Sistem memberikan jeda durasi perjalanan logis menuju lokasi berikutnya).
4. **Penugasan Personel & Armada Otomatis:**
   Alokasi tim (*Custody 1*, *Custody 2*, *Pengawal Security*) dan plat nomor mobil kas dilakukan secara otomatis berdasarkan ketersediaan unit.
5. **Preferensi Rute & Siklus:**
   Memperhitungkan aturan Ganjil/Genap (disesuaikan dengan plat nomor mobil), Hindari Jalan Tol, Hindari Jalan Kecil, serta pilihan Siklus (*Pagi*, *Siang*, *Middle*, *Ad-hoc*).

---

## 💻 Cara Menjalankan Aplikasi

### 1. Requirements
- Node.js 18+ / 20+
- npm / yarn / pnpm

### 2. Environment Variables (`.env.example`)
Sistem telah mengkonfigurasi API Key MileApp dan NVIDIA Nemotron secara aman di level server (`server.ts`). Jika ingin menyesuaikan secara kustom:

```env
NVIDIA_API_KEY="nvapi-YOUR_NVIDIA_API_KEY"
MILEAPP_TOKEN="YOUR_MILEAPP_BEARER_TOKEN"
```

### 3. Jalankan Mode Development
```bash
npm run dev
```
Aplikasi akan berjalan pada `http://localhost:3000`.

### 4. Build Production
```bash
npm run build
npm start
```

---

## 📄 Struktur Repositori

```
├── server.ts                   # Express Backend Entry point & NVIDIA / MileApp integrations
├── src/
│   ├── App.tsx                 # Core App Container & Navigation
│   ├── types.ts                # TypeScript Interfaces (FSD Standardized Schema)
│   ├── data/
│   │   └── initialData.ts      # Data Master Cabang, Siklus, Fleet, & Staff Officers
│   ├── utils/
│   │   └── vrpSolver.ts        # Local High-Performance VRP Engine
│   └── components/
│       ├── GenerateView.tsx    # Halaman Form Input Parameter & Preview Lokasi
│       ├── ResultView.tsx      # Halaman Hasil Generate, Summary, Tabel & Map VRP
│       ├── MapView.tsx         # Komponen Peta Interaktif Leaflet.js
│       ├── PetugasModal.tsx    # Modal Detail Penugasan Custody & Pengawal
│       ├── MobilModal.tsx      # Modal Selection & Change Plat Nomor Kendaraan
│       └── SwitchTripModal.tsx # Modal Edit & Reorder Urutan Trip (Switch Trip)
├── metadata.json
├── package.json
└── README.md
```

---

&copy; 2026 **PT. Advantage SCM** — *Sentral Planner ROC - COS*. Rahasia & Hak Cipta Dilindungi.
