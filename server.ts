import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";
import OpenAI from "openai";
import { RoutePlanRequest, RunsheetResponse } from "./src/types";
import { DUMMY_CLIENT_ATMS } from "./src/data/initialData";
import { solveVRP } from "./src/utils/vrpSolver";

// Hardcoded API credentials
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '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';
const MILEAPP_TOKEN = process.env.MILEAPP_TOKEN || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI2MWM1NzdkNDFmYzQ3NjQ1NjUxMTZlYjIiLCJqdGkiOiJkN2UzZGEzOTE1NDEzYjRiZDU5YmFkMjFhODEwYTJmMWFiNjBkZDIyMTA5NWVhMzEzMGI0NDIwNGI2YjhmM2U0YmRlZmM3MDZkMjE0ODdkYiIsImlhdCI6MTc4NDg5NzgxMSwibmJmIjoxNzg0ODk3ODExLCJleHAiOjE4MTY0MzM4MTEsInN1YiI6IjZhNjM2MTAzZDEwMjZmNDgxMjAzZTgzZiIsInNjb3BlcyI6W119.OVDpHQhBxxQGrjJpPjjWGyAHCH_I6A79lIAi0SWp57tlFYoH6yJZMReC_MTURzJvu807IUF8rrn95UHAAuohRHXJGgXSae8RbJtNZOTbi5_ZlOwpA6VPhy7_EuGWDqbxmrYVV4gk-Ve9faQqHzayyVugX2KB2V5x4HKgyqFFwSJzQjuAvTmjByRBISrArOLMyaisPWjiG_UI_OcaYeudk3yt2648e29a-8mjdsVRMhx9gadWNTWrUgeiLASfLWdcmK3NRClRxXoLSioiepIxzt17455AmZi-VS9xwHFDnnHPsqlD7Okgpm8r8Ok7HDH9vbQtOnleGbDCHiNjGjIP7M_b6LX02KCVBQXeyHNVgj37cJmB-D3XR0SFVI0hd00yj14gzwWf5eTBQ79gUqTQtG1EPtuYdhVZvjsdmkeZ853nBg9RoMuJA9NFueQBRbhGJENd9by0C4aL9A0UKRam8jIB189zffK1RXMt4L3solPeWp_JVqSw_WwlOan9jGLA71cZ44fLiovHMX6CXOsTexu9n_m2-YYfFmFw_bGDPoAONlvOBQU7MnboohNcwN52Gtt6tuaPvIeIrGZOkY1mq5aosIm6b6ykOSOBZUIgB6t35DjfcIdxd4odql2s0-DLMrm5ntG9wmjlh2wa-IiXCCG48Mr89kIPHadV2PsOMt4';

const openai = new OpenAI({
  apiKey: NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
  timeout: 60000,
});

const SYSTEM_PROMPT = `
Anda adalah sistem AI Route Planner & Vehicle Routing Problem (VRP) Solver tingkat lanjut untuk operasi Supply Chain Management dan Cash Management (pengisian ATM). Tugas Anda adalah memproses data lokasi (client/ATM), parameter operasional, dan menghasilkan "Runsheet" JSON murni yang logis, presisi, dan mematuhi aturan lalu lintas.

ATURAN PERHITUNGAN & KENDALA (CONSTRAINTS) WAJIB:
1. Optimasi Jarak & Waktu (Nearest Neighbor Logic): 
   - Anda SANGAT DILARANG membuat rute zigzag atau melompat-lompat jauh.
   - Di dalam satu "Run", urutan 1 ke urutan 2 WAJIB merupakan lokasi dengan koordinat terdekat secara berurutan. Setelah selesai di titik A, cari titik terdekat B, lalu dari B cari titik terdekat C, dan seterusnya. Rute harus mengalir membentuk satu garis lurus/lingkaran yang efisien.
2. Aturan Ganjil/Genap (Wajib Patuh): 
   - Periksa 'Tanggal Replenish' pada input.
   - Jika Preferensi Rute mencakup "Ganjil/Genap", Anda WAJIB mengalokasikan 'plat_mobil' yang angka terakhirnya SESUAI dengan tanggal (Tanggal Ganjil = Plat Ganjil, Tanggal Genap = Plat Genap).
3. Aturan Hindari Jalan Tol / Jalan Kecil: 
   - Jika Preferensi Rute mencantumkan "Hindari Jalan Tol", AI harus merenggangkan (menambah) estimasi waktu tempuh antar titik karena kendaraan dipaksa melewati jalan arteri reguler.
4. Kapasitas Kendaraan: Setiap unit mobil memiliki batas maksimal kaset 1200. Kapasitas dalam satu Run tidak boleh melebihi ini. Format output wajib "Terpakai/Maksimal" (contoh: "88/1200").
5. Estimasi Waktu Berantai (Time Windows): Hasilkan perhitungan waktu dalam format HH:MM:
   - Prediksi Jam Tiba di Lokasi
   - Prediksi Jam Mulai Transaksi
   - Durasi Transaksi (Default 15 Menit)
   - Prediksi Jam Selesai Transaksi
   - Prediksi Jam Keluar dari Lokasi (Berikan jeda waktu tempuh logis menuju titik rute selanjutnya berdasarkan jarak koordinat).
6. Penugasan: Alokasikan Custody dan Pengawal secara otomatis.

FORMAT OUTPUT:
Anda WAJIB merespons HANYA dalam format JSON murni. Jangan berikan teks pembuka, penutup, atau markdown \`\`\`json di luar struktur JSON.

=== CONTOH OUTPUT YANG DIHARAPKAN (1-SHOT) ===
{
  "ringkasan_operasional": {
    "total_run": 1,
    "total_kunjungan_atm": 2,
    "kapasitas_kaset_terpakai": "88/1200",
    "total_petugas": "2 Custody, 1 Pengawal",
    "total_jarak_tempuh_km": 15.5,
    "status_tugas": "Semua ter-assign",
    "total_mobil": "1/10"
  },
  "runs": [
    {
      "nama_run": "run-1",
      "jenis_trip": "Dengan Bag",
      "jumlah_trip": 2,
      "total_durasi_pengerjaan": "1j 15m",
      "total_jarak_tempuh_km": 15.5,
      "petugas": ["ARI YANTO DWI PRASETYO", "JERI DWI SANTOSO", "NANA RUSLANA"],
      "plat_mobil": "B1065PIE",
      "kapasitas_mobil": "88/1200",
      "rute_kunjungan": [
        {
          "urutan": 1,
          "plan_no": "PL-20260600044",
          "nama_client": "GBK",
          "alamat": "Jakarta Cideng",
          "koordinat": "-6.17325608744272, 106.81005796779833",
          "status_atm": "RS",
          "tipe_trip": "H",
          "jam_buka_tutup": "08:00 - 22:00",
          "durasi_transaksi_menit": 15,
          "prediksi_jam_tiba_di_lokasi": "08:30",
          "prediksi_jam_mulai_transaksi": "08:30",
          "prediksi_jam_selesai_transaksi": "08:45",
          "prediksi_jam_keluar_dari_lokasi": "08:45"
        },
        {
          "urutan": 2,
          "plan_no": "PL-20260601372",
          "nama_client": "MOBIL KELILING KAS",
          "alamat": "Jakarta Cideng",
          "koordinat": "-6.174000, 106.811000",
          "status_atm": "RS",
          "tipe_trip": "H",
          "jam_buka_tutup": "08:00 - 22:00",
          "durasi_transaksi_menit": 15,
          "prediksi_jam_tiba_di_lokasi": "08:50",
          "prediksi_jam_mulai_transaksi": "08:50",
          "prediksi_jam_selesai_transaksi": "09:05",
          "prediksi_jam_keluar_dari_lokasi": "09:05"
        }
      ]
    }
  ]
}
`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API 1: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Route Plan AI Backend" });
  });

  // API 2: Fetch task data from MileApp API
  app.get("/api/mileapp/tasks", async (req, res) => {
    try {
      console.log("-> Fetching task data from MileApp API...");
      const response = await fetch('https://apiv2.mile.app/v1/tasks', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${MILEAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return res.json({ source: 'mileapp', data });
      } else {
        console.warn(`MileApp returned status ${response.status}. Using fallback PT. Advantage dataset.`);
      }
    } catch (err: any) {
      console.error("MileApp fetch error:", err?.message || err);
    }

    // Fallback PT Advantage dataset
    res.json({
      source: 'fallback',
      cabang: "CIDENG",
      tanggal_replenish: "02 Jun 2026",
      siklus: "Pagi",
      preferensi_rute: ["Ganjil/Genap", "Hindari Jalan Tol", "Hindari Jalan Kecil"],
      data_atm: DUMMY_CLIENT_ATMS
    });
  });

  // API 3: Generate Route Plan using NVIDIA Nemotron 3 / VRP Engine
  app.post("/api/generate-route", async (req, res) => {
    const payloadData: RoutePlanRequest = req.body;
    
    if (!payloadData || !payloadData.data_atm || payloadData.data_atm.length === 0) {
      return res.status(400).json({ error: "Payload data_atm tidak boleh kosong" });
    }

    console.log(`-> Received route planning request for ${payloadData.cabang} - ${payloadData.data_atm.length} ATM locations`);

    try {
      // Attempt NVIDIA Nemotron call with a quick timeout fallback
      console.log("-> Invoking NVIDIA Nemotron-3 VRP AI Solver...");
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second limit for live call

      const completion = await openai.chat.completions.create({
        model: "nvidia/nemotron-3-super-120b-a12b",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Tolong proses data runsheet berikut dan hasilkan JSON-nya:\n\n${JSON.stringify(payloadData, null, 2)}` }
        ],
        temperature: 0.1,
        top_p: 0.95,
        max_tokens: 8192,
      }, { signal: controller.signal as any });

      clearTimeout(timeoutId);

      const responseText = completion.choices[0]?.message?.content || "";
      console.log("-> Received response from NVIDIA Nemotron");

      // Extract JSON string if wrapped in markdown code blocks
      let cleanJsonStr = responseText.trim();
      if (cleanJsonStr.startsWith("```json")) {
        cleanJsonStr = cleanJsonStr.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleanJsonStr.startsWith("```")) {
        cleanJsonStr = cleanJsonStr.replace(/^```/, "").replace(/```$/, "").trim();
      }

      const parsed: RunsheetResponse = JSON.parse(cleanJsonStr);
      if (parsed && parsed.runs && parsed.runs.length > 0) {
        return res.json({ source: "nvidia_nemotron", ...parsed });
      }
    } catch (aiError: any) {
      console.warn("-> NVIDIA Nemotron call failed or timed out. Falling back to local VRP Solver engine:", aiError?.message || aiError);
    }

    // High performance local VRP Solver fallback (100% compliant with FSD rules)
    const vrpResult = solveVRP(payloadData);
    res.json({ source: "vrp_engine", ...vrpResult });
  });

  // Vite middleware or production static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Route Plan AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
