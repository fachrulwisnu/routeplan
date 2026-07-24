import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Run, VisitStop, ClientATM } from '../types';

interface MapViewProps {
  runs?: Run[];
  clientAtms?: ClientATM[];
  selectedRunIndex?: number | null;
  onSelectStop?: (stop: VisitStop) => void;
  height?: string;
}

// Colors for different runs
const RUN_COLORS = [
  '#2563eb', // Blue
  '#16a34a', // Green
  '#d97706', // Amber
  '#9333ea', // Purple
  '#dc2626', // Red
  '#0284c7', // Cyan
  '#4f46e5', // Indigo
  '#ca8a04', // Yellow
];

// Asynchronous helper to fetch OSRM driving route geometry following real roads
async function fetchRouteOSRM(waypoints: [number, number][]): Promise<[number, number][] | null> {
  if (waypoints.length < 2) return null;
  try {
    // OSRM expects coordinates formatted as: lon,lat;lon,lat;...
    const coordString = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.routes && data.routes.length > 0 && data.routes[0].geometry?.coordinates) {
      // OSRM returns array of [lng, lat], convert to Leaflet [lat, lng]
      return data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
    }
  } catch (err) {
    console.warn('OSRM Route fetch warning:', err);
  }
  return null;
}

export const MapView: React.FC<MapViewProps> = ({
  runs,
  clientAtms,
  selectedRunIndex,
  onSelectStop,
  height = '500px'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Leaflet Map if not already initialized
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-6.173256, 106.810058], // Jakarta Cideng Depot
        zoom: 13,
        zoomControl: true,
      });

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      layersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const layerGroup = layersGroupRef.current;
    if (!map || !layerGroup) return;

    // Clear existing layers
    layerGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    // Base Depot Marker (PT. Advantage SCM Cideng)
    const depotIcon = L.divIcon({
      className: 'custom-depot-icon',
      html: `<div style="background-color: #059669; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const depotLat = -6.173256;
    const depotLng = 106.810058;
    const depotMarker = L.marker([depotLat, depotLng], { icon: depotIcon })
      .bindPopup(`<b>PT. Advantage SCM - Depot Cideng</b><br/>Pusat Distribusi Cash & ATM Replenishment`);
    layerGroup.addLayer(depotMarker);
    bounds.extend([depotLat, depotLng]);

    let isMounted = true;

    // Mode 1: Render Calculated Runs
    if (runs && runs.length > 0) {
      runs.forEach((run, runIdx) => {
        if (selectedRunIndex !== null && selectedRunIndex !== undefined && selectedRunIndex !== runIdx) {
          return; // Filter to selected run if specified
        }

        const color = RUN_COLORS[runIdx % RUN_COLORS.length];
        const waypoints: [number, number][] = [[depotLat, depotLng]];

        // Group stops by coordinates to handle single-point multi-trips (Fig 7 in FSD)
        const coordMap: { [key: string]: VisitStop[] } = {};

        run.rute_kunjungan.forEach((stop) => {
          const parts = stop.koordinat.split(',').map(s => parseFloat(s.trim()));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const key = `${parts[0].toFixed(6)},${parts[1].toFixed(6)}`;
            if (!coordMap[key]) coordMap[key] = [];
            coordMap[key].push(stop);
          }
        });

        Object.entries(coordMap).forEach(([coordStr, stopsAtPoint]) => {
          const [lat, lng] = coordStr.split(',').map(Number);
          waypoints.push([lat, lng]);
          bounds.extend([lat, lng]);

          const seqNumbers = stopsAtPoint.map(s => s.urutan).join('-');
          const isMulti = stopsAtPoint.length > 1;
          const isStartNode = stopsAtPoint.some(s => s.is_titik_awal || s.urutan === 1);

          let stopIcon: L.DivIcon;
          if (isStartNode) {
            // Distinct Start Node Icon (Emerald & Gold)
            stopIcon = L.divIcon({
              className: 'custom-start-node-icon',
              html: `<div style="background: linear-gradient(135deg, #10b981, #059669); color: white; border-radius: 50%; padding: 3px 8px; font-size: 11px; font-weight: 800; border: 3px solid #f59e0b; box-shadow: 0 4px 10px rgba(0,0,0,0.4); min-width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; gap: 2px;">
                🚩 ${seqNumbers}
              </div>`,
              iconSize: [34, 34],
              iconAnchor: [17, 17]
            });
          } else {
            stopIcon = L.divIcon({
              className: 'custom-stop-icon',
              html: `<div style="background-color: ${color}; color: white; border-radius: 50%; padding: 2px 6px; font-size: 11px; font-weight: 700; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); min-width: 26px; text-align: center;">
                ${seqNumbers}
              </div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14]
            });
          }

          const popupContent = `
            <div style="font-family: sans-serif; min-width: 230px; max-width: 280px; padding: 4px;">
              <div style="font-weight: 700; color: #1e293b; font-size: 13px; margin-bottom: 2px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                <span>${run.nama_run.toUpperCase()} ${isMulti ? `(${stopsAtPoint.length} Trip)` : ''}</span>
                ${isStartNode ? `<span style="background: #10b981; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800;">START</span>` : ''}
              </div>
              ${stopsAtPoint.map(s => {
                const trafficColor = s.warna_jalur || (s.status_lalu_lintas === 'Macet Parah' || s.status_lalu_lintas === 'Macet' ? '#EF4444' : s.status_lalu_lintas === 'Padat' ? '#F59E0B' : '#3B82F6');
                return `
                <div style="margin-top: 6px; padding: 8px; background: #f8fafc; border-radius: 8px; border-left: 4px solid ${trafficColor}; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                  <div style="font-weight: 700; font-size: 12px; color: #0f172a; display: flex; justify-content: space-between; align-items: center;">
                    <span>#${s.urutan}. ${s.nama_client}</span>
                  </div>
                  <div style="font-size: 11px; color: #64748b; margin-top: 1px;">Plan: ${s.plan_no} | ${s.alamat}</div>
                  <div style="font-size: 11px; color: #334155; margin-top: 3px;">⏰ Tiba: <b>${s.prediksi_jam_tiba_di_lokasi}</b> | Keluar: <b>${s.prediksi_jam_keluar_dari_lokasi}</b></div>
                  
                  ${s.status_lalu_lintas ? `
                    <div style="margin-top: 5px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">
                      <span style="background-color: ${trafficColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800;">
                        🚦 ${s.status_lalu_lintas}
                      </span>
                      ${s.prediksi_delay_menit ? `
                        <span style="background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; border: 1px solid #fca5a5;">
                          ⏱️ +${s.prediksi_delay_menit}m Delay
                        </span>
                      ` : ''}
                    </div>
                  ` : ''}

                  ${s.keterangan_ai ? `
                    <div style="margin-top: 4px; font-size: 10px; color: #1e3a8a; background: #eff6ff; padding: 4px 6px; border-radius: 4px; border: 1px solid #bfdbfe;">
                      🤖 <b>AI:</b> ${s.keterangan_ai}
                    </div>
                  ` : ''}
                </div>
              `}).join('')}
            </div>
          `;

          const marker = L.marker([lat, lng], { icon: stopIcon }).bindPopup(popupContent);
          marker.on('click', () => {
            if (onSelectStop && stopsAtPoint[0]) {
              onSelectStop(stopsAtPoint[0]);
            }
          });
          layerGroup.addLayer(marker);
        });

        // Add return to depot waypoint
        waypoints.push([depotLat, depotLng]);

        // Determine base opacity: when viewing all runs, opacity is 0.4 for smooth layering; 1.0 when selected
        const isAllRunsView = selectedRunIndex === null || selectedRunIndex === undefined;
        const baseOpacity = isAllRunsView ? 0.4 : 1.0;
        const baseWeight = isAllRunsView ? 5 : 6;

        // Draw segmented polylines with traffic density colors (#EF4444, #F59E0B, #3B82F6) & Midpoint Badges
        for (let i = 0; i < waypoints.length - 1; i++) {
          const fromPt = waypoints[i];
          const toPt = waypoints[i + 1];
          const stopData = run.rute_kunjungan[i];
          
          // Determine traffic color for segment
          const segmentColor = stopData?.warna_jalur || (
            stopData?.status_lalu_lintas === 'Macet Parah' || stopData?.status_lalu_lintas === 'Macet'
              ? '#EF4444'
              : stopData?.status_lalu_lintas === 'Padat'
              ? '#F59E0B'
              : color
          );

          // Build HTML for Floating Midpoint Route Badge
          const statusText = stopData?.status_lalu_lintas || 'Lancar';
          const isMacet = statusText === 'Macet Parah' || statusText === 'Macet';
          const isPadat = statusText === 'Padat';
          const delayText = stopData?.prediksi_delay_menit ? `+${stopData.prediksi_delay_menit}m` : '';

          let trafficBadgeBg = 'bg-blue-600 text-white';
          if (isMacet) trafficBadgeBg = 'bg-red-600 text-white';
          else if (isPadat) trafficBadgeBg = 'bg-amber-500 text-white';

          const badgeHtml = `
            <div class="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-lg shadow-lg border border-slate-700/80 text-[10px] font-extrabold whitespace-nowrap pointer-events-none">
              <span class="${trafficBadgeBg} px-1.5 py-0.5 rounded-md flex items-center gap-1">
                ${isMacet ? '🔴' : isPadat ? '🟡' : '🔵'} ${statusText} ${delayText}
              </span>
              ${stopData?.is_lewat_tol ? `<span class="bg-indigo-600 text-white px-1.5 py-0.5 rounded-md font-black">[TOL]</span>` : ''}
              ${stopData?.is_zona_ganjil_genap ? `<span class="bg-amber-600 text-white px-1.5 py-0.5 rounded-md font-black">[G/G]</span>` : ''}
            </div>
          `;

          // Baseline fallback polyline for segment
          const legPolyline = L.polyline([fromPt, toPt], {
            color: segmentColor,
            weight: baseWeight,
            opacity: baseOpacity,
            lineCap: 'round',
            lineJoin: 'round'
          });

          // Bind Permanent Midpoint Tooltip
          legPolyline.bindTooltip(badgeHtml, {
            permanent: true,
            direction: 'center',
            className: 'custom-route-badge',
            interactive: false
          });

          // Interactive Hover & Click Highlighting
          legPolyline.on('mouseover', function(this: L.Polyline) {
            this.setStyle({ opacity: 1.0, weight: 8 });
            this.bringToFront();
          });
          legPolyline.on('mouseout', function(this: L.Polyline) {
            this.setStyle({ opacity: baseOpacity, weight: baseWeight });
          });

          layerGroup.addLayer(legPolyline);

          // Add Directional Arrow Marker at segment midpoint
          const midLat = (fromPt[0] + toPt[0]) / 2;
          const midLng = (fromPt[1] + toPt[1]) / 2;
          const arrowAngle = Math.atan2(toPt[1] - fromPt[1], toPt[0] - fromPt[0]) * (180 / Math.PI);

          const arrowIcon = L.divIcon({
            className: 'custom-arrow-icon',
            html: `<div style="transform: rotate(${arrowAngle}deg); color: ${segmentColor}; font-size: 14px; font-weight: 900; text-shadow: 0 0 3px white;">➔</div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });
          const arrowMarker = L.marker([midLat, midLng], { icon: arrowIcon, interactive: false });
          layerGroup.addLayer(arrowMarker);

          // Async OSRM Road Geometry for this leg
          fetchRouteOSRM([fromPt, toPt]).then((osrmLegCoords) => {
            if (!isMounted || !layerGroup) return;
            if (osrmLegCoords && osrmLegCoords.length > 0) {
              layerGroup.removeLayer(legPolyline);
              const roadLegPolyline = L.polyline(osrmLegCoords, {
                color: segmentColor,
                weight: baseWeight + 1,
                opacity: baseOpacity,
                lineCap: 'round',
                lineJoin: 'round'
              });

              roadLegPolyline.bindTooltip(badgeHtml, {
                permanent: true,
                direction: 'center',
                className: 'custom-route-badge',
                interactive: false
              });

              roadLegPolyline.on('mouseover', function(this: L.Polyline) {
                this.setStyle({ opacity: 1.0, weight: 9 });
                this.bringToFront();
              });
              roadLegPolyline.on('mouseout', function(this: L.Polyline) {
                this.setStyle({ opacity: baseOpacity, weight: baseWeight + 1 });
              });

              layerGroup.addLayer(roadLegPolyline);
            }
          });
        }
      });
    } else if (clientAtms && clientAtms.length > 0) {
      // Mode 2: Unscheduled Raw Locations Preview
      clientAtms.forEach((atm, i) => {
        const parts = atm.koordinat.split(',').map(s => parseFloat(s.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const [lat, lng] = parts;
          bounds.extend([lat, lng]);

          const stopIcon = L.divIcon({
            className: 'custom-atm-icon',
            html: `<div style="background-color: #3b82f6; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
              ${i + 1}
            </div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const popupContent = `
            <div style="font-family: sans-serif; font-size: 12px;">
              <b>${atm.nama_client}</b><br/>
              <span style="color: #64748b;">Plan: ${atm.plan_no}</span><br/>
              <span>${atm.alamat}</span><br/>
              <span>Jam Operasional: ${atm.jam_operasional}</span>
            </div>
          `;

          const marker = L.marker([lat, lng], { icon: stopIcon }).bindPopup(popupContent);
          layerGroup.addLayer(marker);
        }
      });
    }

    // Fit map bounds smoothly
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      isMounted = false;
    };

  }, [runs, clientAtms, selectedRunIndex]);

  return (
    <div className="relative z-0 w-full h-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 min-h-[300px]">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />
    </div>
  );
};
