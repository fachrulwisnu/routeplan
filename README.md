# Route Plan AI - PT. Advantage Supply Chain Management (SCM)

**Versi Dokumen FSD:** 1.6  
**Klasifikasi:** Rahasia / Internal Enterprise  
**Pemilik Sistem:** Sentral Planner ROC - COS (Cash Operations)  
**Area Bisnis:** COS dan Operations  

---

## 📌 Overview Application

**Route Plan AI** adalah sistem kecerdasan buatan (*AI-powered Route Planner & Vehicle Routing Problem / VRP Solver*) yang dirancang khusus untuk mempercepat, mengoptimalkan, dan memvisualisasikan rute *Runsheet* pengisian kas serta pemeliharaan mesin ATM (*ATM Replenishment & Cash Management*) di lingkungan **PT. Advantage SCM**.

Aplikasi ini mengintegrasikan data lokasi tugas secara langsung dari platform dispatch **MileApp API** dan memproses estimasi rute tercepat, penugasan personel (*Custody* dan *Pengawal*), alokasi kendaraan lapis baja (*Armored Cash Van*), prediksi kondisi lalu lintas secara spasial, serta estimasi rantai waktu operasional berantai menggunakan **NVIDIA cuOpt VRP Solver API** (`https://optimize.api.nvidia.com/v1/nvidia/cuopt`), **NVIDIA Nemotron-3 Super 120B**, dan **Engine VRP High-Performance Local**.

---

## 🛠️ Technology Stack

### **Frontend Architecture**
- **Framework:** React 19 dengan TypeScript
- **Styling & UI:** Tailwind CSS v4, Lucide React Icons
- **Interactive Maps:** Leaflet.js dengan OpenStreetMap tiles & OSRM Road Geometry Routing Engine
  - Visualisasi VRP & Polyline Rute Berwarna (Kepadatan Lalu Lintas)
  - Interactive Route Badges (Polyline Midpoint Tooltips for Traffic, Toll, & Odd/Even Zones)
  - Hover & Fading Route Highlighting (`opacity: 0.4` default vs `1.0` hover)
  - Distinct Start Node Markers (Depot / Point 1 Flag Indicators)
  - Directional Flow Midpoint Arrow Markers
- **Animations:** Motion (`motion/react`)

### **Backend & API Architecture**
- **Runtime Environment:** Node.js + Express (Server-side API Layer)
- **Dev & Build Tooling:** `tsx` untuk eksekusi TypeScript dev mode, `esbuild` untuk bundling CommonJS production, Vite 6
- **VRP Solver Engine:** **NVIDIA cuOpt VRP Solver API** (`https://optimize.api.nvidia.com/v1/nvidia/cuopt`)
- **AI Traffic Engine:** NVIDIA Nemotron-3 Super 120B (`nvidia/nemotron-3-super-120b-a12b` via OpenAI SDK Client)
- **Data Dispatch Integration:** MileApp Tasks API (`https://apiv2.mile.app/v1/tasks`)
- **Geodesic Distance Model:** **Vincenty's Inverse Formula (WGS-84 Ellipsoid)** untuk konstruksi `cost_matrix_data` dan `travel_time_matrix_data` dengan presisi tinggi.
- **Local Fallback Engine:** Algoritma Spatial Geofencing (Anti-Overlap), Vincenty Distance Matrix, & Sequential Time-Chaining Engine

---

## 🚀 Key Features & Capabilities

### 1. 📐 Vincenty's Ellipsoid Precision Distance Calculation
Menggantikan kalkulasi aproksimasi bidang datar (Euclidean/Haversine) dengan **Formula Vincenty (WGS-84 Ellipsoid)**. Menghitung jarak geodesic antar koordinat depot dan lokasi ATM dengan akurasi permukaan elipsoid bumi tingkat milimeter, yang secara otomatis menyusun matriks jarak 2D (`cost_matrix_data`) dan matriks waktu tempuh (`travel_time_matrix_data`) untuk solver NVIDIA cuOpt.

### 2. 🎯 Spatial Clustering & Geofencing (Anti-Overlap)
Mengelompokkan lokasi ATM ke dalam *Run* berdasarkan isolasi wilayah geografis yang ketat. Rute antar *Run* dipisahkan secara sistematis sehingga tidak saling menyilang atau tumpang tindih di peta.

### 3. 🚦 Real-Time AI Traffic Analysis & Delay Prediction
Menganalisis kepadatan lalu lintas arteri & tol Jakarta secara otomatis:
- 🔴 **Macet Parah (`#EF4444`)**: Terjadi pada jam sibuk (07:00-09:30 / 16:30-19:00) dengan estimasi delay tambahan (+20 menit).
- 🟡 **Padat Merayap (`#F59E0B`)**: Terjadi pada jam sibuk siang hari atau rute non-tol (+10 menit delay).
- 🔵 **Lancar (`#3B82F6`)**: Rute bergerak lancar tanpa hambatan berarti (0 menit delay).

### 4. 🗺️ Advanced Leaflet Map Visualization
- **Floating Route Badges:** Badge mengambang tepat di titik tengah segmen polyline menampilkan status real-time (`[Macet +20m]`, `[TOL]`, `[G/G]`).
- **Route Highlight & Fading:** Pada mode 'Semua Run', garis rute ditampilkan secara transparan (`opacity: 0.4`) agar peta tidak berantakan, dan otomatis menebal (`opacity: 1.0`) ketika di-hover atau dipilih.
- **Start Node Identifier:** Titik awal keberangkatan/depot (`is_titik_awal: true`) ditandai dengan ikon bendera 🚩 beraksen emas khusus.
- **Directional Flow Arrows:** Panah petunjuk arah di sepanjang segmen polyline memudahkan visualisasi alur pergerakan kendaraan.

### 5. ⏱️ Sequential HH:MM Time Chaining
Kalkulasi jam Tiba, Mulai Transaksi, Selesai Transaksi, dan Keluar dari Lokasi secara berantai dengan memperhitungkan durasi transaksi ATM, jarak antar koordinat, dan potensi keterlambatan akibat kemacetan lalu lintas.

---

## 🔄 End-to-End System Integration Flow

```
┌────────────────────────────────────────────────────────┐
│                   MileApp Tasks API                    │
│            GET https://api.mile.app/v1/tasks           │
└───────────────────────────┬────────────────────────────┘
                            │ (1) Ingest Live Dispatch Task Data
                            ▼
┌────────────────────────────────────────────────────────┐
│               Express Backend Server                   │
│     Parse Coordinates, Operational Params & Constraints │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ (2) Calculate Vincenty Distance Matrix (WGS-84 Ellipsoid)
                            ▼
┌────────────────────────────────────────────────────────┐
│            NVIDIA cuOpt VRP Solver API                 │
│      POST https://optimize.api.nvidia.com/v1/nvidia/cuopt  │
│  Payload: cost_matrix_data & travel_time_matrix_data   │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ (3) VRP Optimized Route Nodes
                            ▼
┌────────────────────────────────────────────────────────┐
│               NVIDIA Nemotron-3 AI Engine              │
│    Model: nvidia/nemotron-3-super-120b-a12b            │
│  - Traffic Density Analysis & Delay Prediction         │
│  - Odd/Even Plate Alignment & Toll Detection           │
│  - Anti-Zigzag Vincenty Route Integrity Check         │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ (4) [Fallback] Local Vincenty Spatial VRP Engine
                            ▼
┌────────────────────────────────────────────────────────┐
│             Standardized Runsheet JSON                 │
│  - Operational Summary & Multi-Vehicle Allocations     │
│  - Sequential Timestamps & Spatial Route Waypoints     │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ (5) Render Real-time Dashboard
                            ▼
┌────────────────────────────────────────────────────────┐
│                 React 19 Dashboard UI                  │
│  - Leaflet Interactive Map with Midpoint Route Badges  │
│  - Hover & Fading Route Highlights & Direction Arrows  │
│  - Detailed Officer (Custody/Security) & Fleet Modals  │
│  - Switch Trip Modal (Interactive Drag/Reorder)        │
└────────────────────────────────────────────────────────┘
```

---

## ⚙️ Rules & Constraints Operational (FSD v1.6)

Sistem diatur oleh 6 aturan dan kendala operasional utama:

1. **Geofencing/Isolasi Wilayah (Anti-Overlap):**
   Lokasi ATM dikelompokkan ke dalam *Run* berdasarkan kedekatan wilayah geografis. Rute dalam *Run-1*, *Run-2*, dst., tidak boleh saling menyilang.
2. **Kapasitas Kaset Kendaraan:**
   Setiap unit mobil kas memiliki batas kapasitas maksimal **1.200 kaset**. Total kaset dalam satu *Run* tidak boleh melebihi batas ini (`Terpakai/1200`).
3. **Analisis Lalu Lintas & Prediksi Keterlambatan:**
   Rute memperhitungkan jam sibuk jalan raya, zona Ganjil/Genap (disesuaikan dengan tanggal & plat nomor), rute jalan tol, serta memberikan kalkulasi `prediksi_delay_menit`.
4. **Estimasi Waktu Berantai (Sequential Time Chaining):**
   Setiap kunjungan menghasilkan rincian estimasi jam operasional format `HH:MM`:
   - *Prediksi Jam Tiba di Lokasi*
   - *Prediksi Jam Mulai Transaksi*
   - *Durasi Transaksi* (Default 15 Menit)
   - *Prediksi Jam Selesai Transaksi*
   - *Prediksi Jam Keluar dari Lokasi*
5. **Penugasan Personel & Armada Otomatis:**
   Alokasi tim (*Custody 1*, *Custody 2*, *Pengawal Security*) dan plat nomor mobil kas dilakukan secara otomatis berdasarkan ketersediaan unit.
6. **Rekomendasi Engine & Optimalisasi Rute:**
   Sistem menyajikan rekomendasi engine VRP terbaik (misal: *NVIDIA cuOpt*) beserta pertimbangan rasionalitas operasional.

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
├── server.ts                   # Express Backend Entry point (NVIDIA Nemotron, MileApp API, System Prompt)
├── src/
│   ├── App.tsx                 # Core App Container & Navigation
│   ├── index.css               # Global CSS & Leaflet Route Badge Tooltip Styles
│   ├── types.ts                # TypeScript Interfaces (FSD Standardized Schema)
│   ├── data/
│   │   └── initialData.ts      # Data Master Cabang, Siklus, Fleet, & Staff Officers
│   ├── utils/
│   │   └── vrpSolver.ts        # Local High-Performance Spatial VRP & Traffic Engine
│   └── components/
│       ├── GenerateView.tsx    # Halaman Form Input Parameter & Preview Lokasi
│       ├── ResultView.tsx      # Halaman Hasil Generate, Operational Summary, & Runsheet Table
│       ├── MapView.tsx         # Komponen Peta Interaktif Leaflet.js (Badges, Arrows, & Highlights)
│       ├── PetugasModal.tsx    # Modal Detail Penugasan Custody & Pengawal
│       ├── MobilModal.tsx      # Modal Selection & Change Plat Nomor Kendaraan
│       └── SwitchTripModal.tsx # Modal Edit & Reorder Urutan Trip (Switch Trip)
├── metadata.json
├── package.json
└── README.md
```

---

&copy; 2026 **PT. Advantage SCM** — *Sentral Planner ROC - COS*. Rahasia & Hak Cipta Dilindungi.
