import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";
import OpenAI from "openai";
import { RoutePlanRequest, RunsheetResponse } from "./src/types";
import { DUMMY_CLIENT_ATMS } from "./src/data/initialData";
import { solveVRP } from "./src/utils/vrpSolver";
import { vincentyDistance, parseCoordString } from "./src/utils/vincenty";

// =====================================================================
// 1. CONFIG & KEYS
// =====================================================================
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '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';
const CUOPT_API_KEY = process.env.CUOPT_API_KEY || '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';
const MILEAPP_TOKEN = process.env.MILEAPP_TOKEN || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI2MWM1NzdkNDFmYzQ3NjQ1NjUxMTZlYjIiLCJqdGkiOiJhZTAwMTM5ZWQyNGQ5N2RlYzY0ODUyYmE5ZWRkNjUyZjFmY2EwZGNlMTFjYWU5NGVkMTJiYTBiMDU5ODI0YmY3YTcxYjI2ZmJiM2MxZjIyYyIsImlhdCI6MTc4NDkwMjMzOSwibmJmIjoxNzg0OTAyMzM5LCJleHAiOjE3OTk3NzMyMDAsInN1YiI6IjZhNjM2MTAzZDEwMjZmNDgxMjAzZTgzZiIsInNjb3BlcyI6W119.NHclzW4RAg5sqvMEu0akuc2da1HQ4ZTyq4cIC3tiz3AWb03dwzwUk45UtMtc5F-s_LI3rZJ4rfspVD5QbhZHcM2YehLo72qwrnjtAm0vScwgbSzFxLbtNGc32vwiGBlDyU8uLxn8yT2WZh19dSRyb6xwau34eG1RGLJVWMGzeq2SY5B7PEgjbbD1LPX66y0K0_bMngqsOOR-zs5xUWjrhH7CbcBsiFAGU8-4AwkeHqGpNsVKL-T9Gg2cCx_vWqxwz-FIrn2WHUPIUJ5RdR0TrokMT0X140Hjtqvw7FT2cr3YVkVWR8HyMJl23ADjnclzMFMvCP58otoHMRLL1J-y4LoTCGCENjCZSaBlBYSjm2o4TfOUDKunnNr7aJC5eGDU1c89_KB-3WLHpTz_fQlq6AzMQzzwyn8OAezBW2WPRyoxi-kk35HopFaqLNGTJPsbNHPD4YdyO9MYYZhuqjisBdDgedq88t5xPyqfk_Z_Kwl73TZKvyw2b2Cz8BEZD7ZbfoBDqZ-OhAX2Uz6vnHo5QmZU_09nMplaWxcrMRtifaHpphMlIsRhxFKRDzFbDWzHLDWPHrJZsbO6TH-_zFkZz2uZ8dDglIxmKaKClOO6wEOTKZ-R4MuH9_P4KTSLwWgdbkVRAQGSRu0zIw9SSQqGkL-sX2gd1lRlAXRbONBjcbY';

const openai = new OpenAI({
  apiKey: NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
  timeout: 120000,
});

// MASTER SYSTEM PROMPT FOR NEMOTRON-3 JURI ANALYST
const SYSTEM_PROMPT = `Anda adalah AI Traffic & VRP Routing Analyst (Juri Algoritma) tingkat lanjut. Tugas Anda adalah menerima data master ATM, beserta hasil pemrosesan dari dua engine berbeda (NVIDIA cuOpt berbasis Vincenty vs Engine Alternatif). Anda harus menganalisis kemacetan jalanan nyata di Jakarta, mendeteksi aturan jalan, dan menghasilkan JSON murni untuk dirender ke peta interaktif.

ATURAN PEWARNAAN & PREDIKSI (SANGAT KETAT):
1. Warna Tema Run (Eksklusif): JANGAN gunakan warna Biru, Hijau, Kuning, atau Merah untuk 'warna_tema_run'. Gunakan warna elegan seperti Ungu (#9333EA), Teal (#0D9488), Pink (#DB2777), atau Indigo (#4F46E5).
2. Status Kemacetan & Warna Kepadatan Jalan: Evaluasi jalur antar titik secara realistis di Jakarta.
   - Jika "Macet": Isi 'prediksi_delay_menit' (misal 15), dan set 'warna_kepadatan' = "#EF4444" (Merah tebal).
   - Jika "Padat": Isi 'prediksi_delay_menit' (misal 5), dan set 'warna_kepadatan' = "#F97316" (Orange).
   - Jika "Lancar": 'prediksi_delay_menit' = 0, 'warna_kepadatan' gunakan nilai 'warna_tema_run'.
3. Aturan Jalan: Deteksi zona ganjil/genap ('is_zona_ganjil_genap') dan jalur tol ('is_lewat_tol'). Berikan penjelasan pada 'info_rute_tambahan'. Waktu (HH:MM) harus berantai logis.
4. Juri Algoritma: Tentukan engine mana yang jarak dan urutannya paling optimal, lalu berikan alasannya di 'ringkasan_operasional'.

FORMAT OUTPUT JSON MURNI (TANPA MARKDOWN \`\`\`json):
{
  "ringkasan_operasional": {
    "rekomendasi_engine_terbaik": "NVIDIA cuOpt (Vincenty Base)",
    "alasan_rekomendasi": "Matriks Vincenty memberikan urutan koordinat yang paling linier dan efisien.",
    "status_tugas": "Perbandingan selesai. Prediksi kemacetan aktif."
  },
  "opsi_rute": {
    "engine_nvidia_cuopt": [
      {
        "nama_run": "run-1",
        "plat_mobil": "B1065PIE",
        "warna_tema_run": "#9333EA",
        "total_estimasi_delay_menit": 15,
        "rute_kunjungan": [
          {
            "urutan": 1,
            "is_titik_awal": true,
            "nama_client": "DEPOT CIDENG (START)",
            "koordinat": "-6.173256, 106.810057",
            "prediksi_jam_keluar_dari_lokasi": "08:00",
            "status_lalu_lintas": "Lancar",
            "warna_kepadatan": "#9333EA",
            "prediksi_delay_menit": 0,
            "is_lewat_tol": false,
            "is_zona_ganjil_genap": false,
            "info_rute_tambahan": "Titik awal keberangkatan armada."
          },
          {
            "urutan": 2,
            "is_titik_awal": false,
            "nama_client": "ATM SUDIRMAN",
            "koordinat": "-6.214620, 106.801590",
            "prediksi_jam_tiba_di_lokasi": "08:45",
            "prediksi_jam_keluar_dari_lokasi": "09:00",
            "status_lalu_lintas": "Macet",
            "warna_kepadatan": "#EF4444",
            "prediksi_delay_menit": 15,
            "is_lewat_tol": false,
            "is_zona_ganjil_genap": true,
            "info_rute_tambahan": "Arus padat. Plat ganjil aman."
          }
        ]
      }
    ],
    "engine_mileapp_logic": [
      {
        "nama_run": "run-1",
        "plat_mobil": "B1065PIE",
        "warna_tema_run": "#0D9488",
        "total_estimasi_delay_menit": 20,
        "rute_kunjungan": [
          {
            "urutan": 1,
            "is_titik_awal": true,
            "nama_client": "DEPOT CIDENG (START)",
            "koordinat": "-6.173256, 106.810057",
            "prediksi_jam_keluar_dari_lokasi": "08:00",
            "status_lalu_lintas": "Lancar",
            "warna_kepadatan": "#0D9488",
            "prediksi_delay_menit": 0,
            "is_lewat_tol": false,
            "is_zona_ganjil_genap": false,
            "info_rute_tambahan": "Titik awal alternatif."
          }
        ]
      }
    ]
  }
}`;

// =====================================================================
// 2. FORMULA VINCENTY (Akurat Elipsoid Bumi untuk Matriks Jarak)
// =====================================================================
function calculateVincentyDistance(coord1: [number, number], coord2: [number, number]): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const a = 6378137, b = 6356752.3142, f = 1 / 298.257223563;
  const L = ((lon2 - lon1) * Math.PI) / 180;
  const U1 = Math.atan((1 - f) * Math.tan((lat1 * Math.PI) / 180));
  const U2 = Math.atan((1 - f) * Math.tan((lat2 * Math.PI) / 180));
  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);

  let lambda = L,
    iterLimit = 100,
    sinLambda = 0,
    cosLambda = 0,
    sinSigma = 0,
    cosSigma = 0,
    sigma = 0,
    sinAlpha = 0,
    cos2Alpha = 0,
    cos2SigmaM = 0,
    C = 0;

  do {
    sinLambda = Math.sin(lambda);
    cosLambda = Math.cos(lambda);
    sinSigma = Math.sqrt(
      cosU2 * sinLambda * (cosU2 * sinLambda) +
        (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda)
    );
    if (sinSigma === 0) return 0;
    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
    cos2Alpha = 1 - sinAlpha * sinAlpha;
    cos2SigmaM = cosSigma - (2 * sinU1 * sinU2) / cos2Alpha;
    if (isNaN(cos2SigmaM)) cos2SigmaM = 0;
    C = (f / 16) * cos2Alpha * (4 + f * (4 - 3 * cos2Alpha));
    let lambdaPrev = lambda;
    lambda = L + (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
    if (Math.abs(lambda - lambdaPrev) < 1e-12) break;
  } while (--iterLimit > 0);

  const uSq = (cos2Alpha * (a * a - b * b)) / (b * b);
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const deltaSigma =
    B *
    sinSigma *
    (cos2SigmaM +
      (B / 4) *
        (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
          (B / 6) * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));

  return (b * A * (sigma - deltaSigma)) / 1000; // Distance in KM
}

// Build Matrix Vincenty Dinamis untuk cuOpt
function buildVincentyMatrix(atmList: { koordinat: [number, number] }[]): number[][] {
  const size = atmList.length;
  const matrix: number[][] = Array(size)
    .fill(0)
    .map(() => Array(size).fill(0));
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      matrix[i][j] = parseFloat(calculateVincentyDistance(atmList[i].koordinat, atmList[j].koordinat).toFixed(2));
    }
  }
  return matrix;
}

// =====================================================================
// 3. ENGINE 1: NVIDIA cuOpt (Menggunakan Real Vincenty Matrix)
// =====================================================================
async function getRoutingFromCuOpt(atmList: { id?: number; plan_no?: string; nama?: string; koordinat: [number, number] }[]) {
  console.log("-> Mengirim Matrix Vincenty ke NVIDIA cuOpt...");
  const costMatrix = buildVincentyMatrix(atmList);

  const taskLocations = Array.from({ length: atmList.length - 1 }, (_, i) => i + 1);
  const taskIds = atmList.slice(1).map((a, i) => a.plan_no || `Task-${i + 1}`);

  const payload = {
    action: "cuOpt_OptimizedRouting",
    data: {
      cost_matrix_data: { data: { "1": costMatrix } },
      travel_time_matrix_data: { data: { "1": costMatrix } },
      fleet_data: {
        vehicle_locations: [[0, 0]],
        vehicle_ids: ["veh-1"],
        capacities: [[1200]],
        vehicle_time_windows: [[0, 1000]]
      },
      task_data: {
        task_locations: taskLocations.length > 0 ? taskLocations : [1],
        task_ids: taskIds.length > 0 ? taskIds : ["Task-1"],
        demand: taskLocations.map(() => [10])
      },
      solver_config: { time_limit: 2 }
    }
  };

  try {
    let response = await fetch("https://optimize.api.nvidia.com/v1/nvidia/cuopt", {
      method: "post",
      body: JSON.stringify(payload),
      headers: { Authorization: `Bearer ${CUOPT_API_KEY}`, "Content-Type": "application/json" }
    });

    let pollAttempts = 0;
    while (response.status === 202 && pollAttempts < 10) {
      pollAttempts++;
      let requestId = response.headers.get("NVCF-REQID");
      if (!requestId) break;
      await new Promise((r) => setTimeout(r, 1000));
      response = await fetch(`https://optimize.api.nvidia.com/v1/status/${requestId}`, {
        headers: { Authorization: `Bearer ${CUOPT_API_KEY}` }
      });
    }

    if (response.status !== 200) throw new Error(`cuOpt status ${response.status}`);
    const result = await response.json();
    console.log("-> [SUCCESS] cuOpt mengembalikan rute optimal berbasis Vincenty!");
    return result;
  } catch (err: any) {
    console.warn("-> [WARNING cuOpt]:", err?.message || err);
    return { fallback_sequence: atmList.map((_, i) => i) }; // Fallback sequence
  }
}

// =====================================================================
// 4. ENGINE 2: MileApp Logic Simulator (Pembanding Alternatif)
// =====================================================================
async function getRoutingFromMileApp(atmList: { koordinat: [number, number] }[]) {
  console.log("-> Menjalankan Engine Alternatif (MileApp Logic Simulator)...");
  // Mensimulasikan urutan alternatif untuk perbandingan A/B Testing
  const seq = atmList.map((_, i) => i);
  if (seq.length > 2) {
    // Reverse intermediate stops for comparison
    const first = seq[0];
    const mid = seq.slice(1).reverse();
    return { fallback_sequence: [first, ...mid] };
  }
  return { fallback_sequence: seq };
}

// =====================================================================
// 5. JURI PENILAI (NVIDIA Nemotron-3)
// =====================================================================
async function evaluateAndPredict(dataMaster: any, resCuOpt: any, resMile: any) {
  console.log("-> Nemotron-3 membandingkan rute dan memprediksi lalu lintas...");

  const payloadToNemotron = {
    data_dasar: dataMaster,
    hasil_cuopt: resCuOpt,
    hasil_mileapp: resMile
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "nvidia/nemotron-3-super-120b-a12b",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Evaluasi dan buatkan output JSON peta interaktif untuk data berikut: ${JSON.stringify(payloadToNemotron)}`
        }
      ],
      temperature: 0.1,
      top_p: 0.95,
      max_tokens: 4096
    });
    console.log("-> [SUCCESS] Evaluasi Juri Selesai!");
    return completion.choices[0]?.message?.content;
  } catch (error: any) {
    console.error("-> [ERROR Nemotron]:", error?.message || error);
    return null;
  }
}

// =====================================================================
// 6. EXPRESS SERVER SETUP
// =====================================================================
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API 1: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Route Plan AI Backend (NVIDIA cuOpt + Vincenty + Nemotron-3)" });
  });

  // API 2: Fetch task data from MileApp API
  app.get("/api/mileapp/tasks", async (req, res) => {
    try {
      console.log("-> Fetching task data from MileApp API...");
      const mileAppUrl = "https://api.mile.app/v1/tasks";
      const response = await fetch(mileAppUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${MILEAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        return res.json({ source: "mileapp", data });
      } else {
        console.warn(`MileApp returned status ${response.status}. Using fallback PT. Advantage dataset.`);
      }
    } catch (err: any) {
      console.warn("MileApp fetch error. Using simulation dataset:", err?.message || err);
    }

    // Fallback PT Advantage dataset
    res.json({
      source: "fallback",
      cabang: "CIDENG",
      tanggal_replenish: "02 Jun 2026",
      siklus: "Pagi",
      preferensi_rute: ["Ganjil/Genap", "Hindari Jalan Tol", "Hindari Jalan Kecil"],
      data_atm: DUMMY_CLIENT_ATMS
    });
  });

  // API 3: Generate Route Plan using Vincenty + cuOpt Real + Nemotron-3
  app.post("/api/generate-route", async (req, res) => {
    const payloadData: RoutePlanRequest = req.body;

    if (!payloadData || !payloadData.data_atm || payloadData.data_atm.length === 0) {
      return res.status(400).json({ error: "Payload data_atm tidak boleh kosong" });
    }

    console.log(`-> Received route planning request for ${payloadData.cabang} - ${payloadData.data_atm.length} ATM locations`);

    // Format ATM list for Vincenty Matrix
    const depotCoord: [number, number] = [-6.173256, 106.810057];
    const atmList = [
      { id: 0, plan_no: "PL-000", nama: "DEPOT CIDENG (START)", koordinat: depotCoord },
      ...payloadData.data_atm.map((atm, i) => ({
        id: i + 1,
        plan_no: atm.plan_no || `PL-${i + 1}`,
        nama: atm.nama_client,
        koordinat: parseCoordString(atm.koordinat)
      }))
    ];

    try {
      // Step 1: Run cuOpt with Vincenty Matrix
      const resCuOpt = await getRoutingFromCuOpt(atmList);

      // Step 2: Run MileApp Logic Simulator
      const resMile = await getRoutingFromMileApp(atmList);

      // Step 3: Nemotron-3 Juri Evaluation & Traffic Prediction
      const rawAiOutput = await evaluateAndPredict(payloadData, resCuOpt, resMile);

      if (rawAiOutput) {
        let cleanJsonStr = rawAiOutput.trim();
        if (cleanJsonStr.startsWith("```json")) {
          cleanJsonStr = cleanJsonStr.replace(/^```json/, "").replace(/```$/, "").trim();
        } else if (cleanJsonStr.startsWith("```")) {
          cleanJsonStr = cleanJsonStr.replace(/^```/, "").replace(/```$/, "").trim();
        }

        try {
          const parsed = JSON.parse(cleanJsonStr);
          if (parsed && (parsed.runs || parsed.opsi_rute)) {
            const activeRuns = parsed.runs || parsed.opsi_rute?.engine_nvidia_cuopt || [];
            return res.json({
              source: "nvidia_cuopt_nemotron",
              ringkasan_operasional: parsed.ringkasan_operasional,
              opsi_rute: parsed.opsi_rute,
              runs: activeRuns
            });
          }
        } catch (jsonErr) {
          console.warn("-> JSON parse error from Nemotron output, using structured local solver fallback.");
        }
      }
    } catch (pipelineErr: any) {
      console.warn("-> Pipeline warning, falling back to local Vincenty VRP Solver:", pipelineErr?.message || pipelineErr);
    }

    // Step 4: Fallback to high precision Local Vincenty VRP Solver engine
    const vrpResult = solveVRP(payloadData);
    res.json({ source: "vrp_vincenty_engine", ...vrpResult });
  });

  // Vite middleware for dev or static server for prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Route Plan AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
