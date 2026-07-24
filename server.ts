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

// MASTER SYSTEM PROMPT FOR NEMOTRON-3 JURI ANALYST (FAST-TRACK VERSION)
const SYSTEM_PROMPT = `Anda adalah VRP Routing Engine & Traffic Evaluator. Tugas Anda menerima data urutan rute (cuOpt vs MileApp), memetakan kemacetan lalu lintas Jakarta secara cepat, dan mengembalikan hasil akhir murni dalam bentuk JSON.

ATURAN EKSEKUSI KILAT:
1. Jangan gunakan proses penalaran panjang. Langsung petakan data.
2. Warna Tema Run: "#9333EA" (Ungu), "#0D9488" (Teal), atau "#DB2777" (Pink).
3. Kepadatan Jalan: Lancar (warna tema), Padat (#F97316 + delay), Macet (#EF4444 + delay 15m).
4. Aturan: Deteksi ganjil/genap dan tol berdasarkan koordinat.
5. OUTPUT: KEMBALIKAN HANYA JSON MURNI TANPA TEKS LAIN DAN TANPA MARKDOWN.

FORMAT JSON WAJIB:
{
  "ringkasan_operasional": {
    "rekomendasi_engine_terbaik": "NVIDIA cuOpt",
    "alasan_rekomendasi": "Jalur lebih pendek dan minim konflik lalu lintas.",
    "status_tugas": "Perbandingan selesai."
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
            "nama_client": "DEPOT (START)",
            "koordinat": "-6.173256, 106.810057",
            "prediksi_jam_keluar_dari_lokasi": "08:00",
            "status_lalu_lintas": "Lancar",
            "warna_kepadatan": "#9333EA",
            "prediksi_delay_menit": 0,
            "is_lewat_tol": false,
            "is_zona_ganjil_genap": false,
            "info_rute_tambahan": "Titik awal."
          }
        ]
      }
    ],
    "engine_mileapp_logic": []
  }
}`;

// =====================================================================
// 2. FORMULA VINCENTY & MATRIX BUILDER (FIX 400 ERROR)
// =====================================================================
function calcDistance(coord1: [number, number], coord2: [number, number]): number {
  return parseFloat(vincentyDistance(coord1[0], coord1[1], coord2[0], coord2[1]).toFixed(4));
}

function buildMatrix(atmList: { koordinat: [number, number] }[]): number[][] {
  const size = atmList.length;
  const matrix: number[][] = Array(size)
    .fill(0)
    .map(() => Array(size).fill(0));
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      matrix[i][j] = calcDistance(atmList[i].koordinat, atmList[j].koordinat);
    }
  }
  return matrix;
}

// =====================================================================
// 3. ENGINE 1: NVIDIA cuOpt (Cepat & Stabil)
// =====================================================================
async function getRoutingFromCuOpt(atmList: { id?: number; plan_no?: string; nama?: string; koordinat: [number, number] }[]) {
  console.log(`-> Mengirim ${atmList.length} lokasi ke NVIDIA cuOpt...`);
  const costMatrix = buildMatrix(atmList);

  const taskLocations: number[] = [];
  const taskIds: string[] = [];
  const demandsDim1: number[] = []; // KUNCI FIX 400: Semua demand digabung dalam 1 dimensi

  for (let i = 1; i < atmList.length; i++) {
    taskLocations.push(i);
    taskIds.push(atmList[i].plan_no || `Task-${i}`);
    demandsDim1.push(10); // Asumsi 10 kaset per ATM
  }

  const payload = {
    action: "cuOpt_OptimizedRouting",
    data: {
      cost_matrix_data: { data: { "1": costMatrix } },
      travel_time_matrix_data: { data: { "1": costMatrix } },
      fleet_data: {
        vehicle_locations: [[0, 0]],
        vehicle_ids: ["veh-1"],
        capacities: [[1200]],
        vehicle_time_windows: [[0, 1000]],
        vehicle_types: [1]
      },
      task_data: {
        task_locations: taskLocations,
        task_ids: taskIds,
        demand: [demandsDim1] // Format array dimensi: [ [10, 10, 10, ...] ]
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

    if (response.status !== 200) {
      const errText = await response.text();
      throw new Error(`Status ${response.status}: ${errText}`);
    }

    console.log("-> [SUCCESS] cuOpt berhasil mengurutkan!");
    return await response.json();
  } catch (err: any) {
    console.warn("-> [WARNING cuOpt]:", err?.message || err);
    return { fallback: "cuOpt sibuk, simulasi fallback A-B-C-D digunakan." };
  }
}

// =====================================================================
// 4. ENGINE 2: MileApp Simulator (Alternatif)
// =====================================================================
async function getRoutingFromMileApp(atmList: { koordinat: [number, number] }[]) {
  console.log("-> Mengirim ke kalkulator MileApp (Simulasi)...");
  const seq = atmList.map((_, i) => i);
  if (seq.length > 2) {
    const first = seq[0];
    const mid = seq.slice(1).reverse();
    return { sequence: [first, ...mid] };
  }
  return { sequence: seq };
}

// =====================================================================
// 5. JURI PENILAI (NEMOTRON-3) DIPERCEPAT!
// =====================================================================
async function evaluateAndPredict(dataMaster: any, resCuOpt: any, resMile: any) {
  console.log("-> Nemotron-3 sedang membandingkan rute dan menulis JSON... (Mohon tunggu)");

  const payloadToNemotron = { data: dataMaster, opt1_cuopt: resCuOpt, opt2_mileapp: resMile };

  try {
    const completion = await openai.chat.completions.create({
      model: "nvidia/nemotron-3-super-120b-a12b",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Evaluasi rute ini dan berikan JSON: ${JSON.stringify(payloadToNemotron)}` }
      ],
      temperature: 0.0,
      top_p: 0.95,
      max_tokens: 4096,
      stream: false
    } as any);

    let rawResult = completion.choices[0]?.message?.content || "";

    // Safe JSON Extractor
    const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI tidak mengembalikan format JSON yang valid.");

    const finalJson = JSON.parse(jsonMatch[0]);
    console.log("-> [SUCCESS] Evaluasi Juri Selesai, JSON utuh!\n");

    // TAMPILKAN PEMENANG DI TERMINAL
    console.log("=========================================");
    console.log(`🏆 PEMENANG ALGORITMA: ${finalJson.ringkasan_operasional?.rekomendasi_engine_terbaik || "NVIDIA cuOpt"}`);
    console.log(`💡 ALASAN: ${finalJson.ringkasan_operasional?.alasan_rekomendasi || "Optimal"}`);
    console.log("=========================================\n");

    return finalJson;
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
      const aiOutput = await evaluateAndPredict(payloadData, resCuOpt, resMile);

      if (aiOutput && (aiOutput.runs || aiOutput.opsi_rute)) {
        const activeRuns = aiOutput.runs || aiOutput.opsi_rute?.engine_nvidia_cuopt || [];
        return res.json({
          source: "nvidia_cuopt_nemotron",
          ringkasan_operasional: aiOutput.ringkasan_operasional,
          opsi_rute: aiOutput.opsi_rute,
          runs: activeRuns
        });
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
