import { ClientATM, RoutePlanRequest, RunsheetResponse, Run, VisitStop, PetugasDetail } from '../types';
import { FLEET_VEHICLES, STAFF_OFFICERS } from '../data/initialData';

// Helper to parse lat/lng from string "lat, lng"
function parseCoords(coordStr: string): { lat: number; lng: number } {
  if (!coordStr) return { lat: -6.173256, lng: 106.810058 };
  const parts = coordStr.split(',').map(s => parseFloat(s.trim()));
  return {
    lat: isNaN(parts[0]) ? -6.173256 : parts[0],
    lng: isNaN(parts[1]) ? 106.810058 : parts[1]
  };
}

// Calculate Haversine distance in KM
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper to format minutes into HH:MM
function formatTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = Math.floor(normalized % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Format duration into "Xj Ym"
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}j`;
  return `${h}j ${m}m`;
}

export function solveVRP(request: RoutePlanRequest): RunsheetResponse {
  const atms = [...(request.data_atm || [])];
  if (atms.length === 0) {
    return {
      ringkasan_operasional: {
        total_run: 0,
        total_kunjungan_atm: 0,
        kapasitas_kaset_terpakai: "0/1200",
        total_petugas: "0 Custody, 0 Pengawal",
        total_jarak_tempuh_km: 0,
        status_tugas: "Tidak ada data",
        total_mobil: "0/10"
      },
      runs: []
    };
  }

  // Group ATMs into clusters (Max 1200 cassettes per run or ~6-8 stops per run)
  const MAX_CASSETTES_PER_RUN = 1200;
  const MAX_STOPS_PER_RUN = 7;

  // Simple Spatial Clustering: Sort by Latitude + Longitude
  atms.sort((a, b) => {
    const cA = parseCoords(a.koordinat);
    const cB = parseCoords(b.koordinat);
    return (cA.lat + cA.lng) - (cB.lat + cB.lng);
  });

  const runGroups: ClientATM[][] = [];
  let currentGroup: ClientATM[] = [];
  let currentCassettes = 0;

  for (const atm of atms) {
    const cassettes = atm.kebutuhan_kaset || 25;
    if (
      currentGroup.length >= MAX_STOPS_PER_RUN ||
      currentCassettes + cassettes > MAX_CASSETTES_PER_RUN
    ) {
      if (currentGroup.length > 0) {
        runGroups.push(currentGroup);
      }
      currentGroup = [atm];
      currentCassettes = cassettes;
    } else {
      currentGroup.push(atm);
      currentCassettes += cassettes;
    }
  }
  if (currentGroup.length > 0) {
    runGroups.push(currentGroup);
  }

  // Base start time based on cycle
  let startMinutes = 8 * 60 + 30; // 08:30 for Pagi
  if (request.siklus === 'Siang') startMinutes = 13 * 60; // 13:00
  if (request.siklus === 'Middle') startMinutes = 10 * 60 + 30; // 10:30
  if (request.siklus === 'Ad-hoc') startMinutes = 9 * 60; // 09:00

  const runs: Run[] = [];
  let globalTotalDistance = 0;
  let globalTotalCassettes = 0;
  let activeCarsCount = 0;

  runGroups.forEach((group, index) => {
    const runName = `run-${index + 1}`;
    const staffIndex = index % STAFF_OFFICERS.length;
    const vehicleObj = FLEET_VEHICLES[index % FLEET_VEHICLES.length];
    activeCarsCount++;

    const officers = STAFF_OFFICERS[staffIndex];
    const petugasNames = [
      officers.custody1.nama,
      ...(officers.custody2 ? [officers.custody2.nama] : []),
      officers.pengawal.nama
    ];

    const petugasDetailObj: PetugasDetail = {
      custody1: officers.custody1,
      custody2: officers.custody2,
      pengawal: officers.pengawal
    };

    let currentTime = startMinutes + index * 15; // staggered start per run
    let runTotalDistance = 0;
    let runTotalCassettes = 0;
    const stops: VisitStop[] = [];

    let prevCoords = parseCoords(group[0]?.koordinat || "-6.173256, 106.810058");

    group.forEach((atm, stopIdx) => {
      const currCoords = parseCoords(atm.koordinat);
      let travelDistance = haversineKm(prevCoords.lat, prevCoords.lng, currCoords.lat, currCoords.lng);
      // Round travel distance to 1 decimal place
      travelDistance = Math.round(travelDistance * 10) / 10;
      
      // Travel duration in minutes (assume average speed ~30 km/h in Jakarta + minimum 2 mins if different place)
      let travelMinutes = 0;
      if (stopIdx > 0) {
        if (travelDistance < 0.05) {
          travelMinutes = 0; // Same building/cluster
        } else {
          travelMinutes = Math.max(3, Math.round((travelDistance / 30) * 60));
        }
      }

      currentTime += travelMinutes;

      const jamTiba = formatTime(currentTime);
      const jamMulai = jamTiba;
      const durationMins = 15; // default 15 mins transaction duration
      currentTime += durationMins;
      const jamSelesai = formatTime(currentTime);
      const jamKeluar = jamSelesai;

      runTotalDistance += travelDistance;
      const cassettes = atm.kebutuhan_kaset || 25;
      runTotalCassettes += cassettes;

      stops.push({
        urutan: stopIdx + 1,
        plan_no: atm.plan_no,
        nama_client: atm.nama_client,
        alamat: atm.alamat,
        koordinat: atm.koordinat,
        status_atm: atm.status_atm || "RS",
        tipe_trip: atm.tipe_trip || "H",
        jam_buka_tutup: atm.jam_operasional || "08:00 - 22:00",
        durasi_transaksi_menit: durationMins,
        prediksi_jam_tiba_di_lokasi: jamTiba,
        prediksi_jam_mulai_transaksi: jamMulai,
        prediksi_jam_selesai_transaksi: jamSelesai,
        prediksi_jam_keluar_dari_lokasi: jamKeluar,
        kebutuhan_kaset: cassettes
      });

      prevCoords = currCoords;
    });

    // Add trip back to depot distance
    const depotCoords = { lat: -6.173256, lng: 106.810058 }; // Cideng depot
    const returnDist = Math.round(haversineKm(prevCoords.lat, prevCoords.lng, depotCoords.lat, depotCoords.lng) * 10) / 10;
    runTotalDistance += returnDist;

    // Determine if "Dengan Bag" or "Tanpa Bag"
    const hasBag = group.some(item => item.is_no_bag !== 1);
    const jenisTrip = hasBag ? "Dengan Bag" : "Tanpa Bag";

    // Total duration calculation
    const totalDurationMins = stops.length * 15 + Math.round((runTotalDistance / 30) * 60);

    globalTotalDistance += runTotalDistance;
    globalTotalCassettes += runTotalCassettes;

    runs.push({
      nama_run: runName,
      jenis_trip: jenisTrip,
      jumlah_trip: stops.length,
      total_durasi_pengerjaan: formatDuration(totalDurationMins),
      total_jarak_tempuh_km: Math.round(runTotalDistance * 10) / 10,
      petugas: petugasNames,
      petugas_detail: petugasDetailObj,
      plat_mobil: vehicleObj.plat_nomor,
      kapasitas_mobil: `${runTotalCassettes}/1200`,
      rute_kunjungan: stops
    });
  });

  const totalCustody = runs.reduce((acc, r) => acc + (r.petugas_detail?.custody2 ? 2 : 1), 0);
  const totalPengawal = runs.length;

  return {
    ringkasan_operasional: {
      total_run: runs.length,
      total_kunjungan_atm: atms.length,
      kapasitas_kaset_terpakai: `${globalTotalCassettes}/1200`,
      total_petugas: `${totalCustody} Custody, ${totalPengawal} Pengawal`,
      total_jarak_tempuh_km: Math.round(globalTotalDistance * 10) / 10,
      status_tugas: "Semua ter-assign",
      total_mobil: `${activeCarsCount}/10`
    },
    runs
  };
}
