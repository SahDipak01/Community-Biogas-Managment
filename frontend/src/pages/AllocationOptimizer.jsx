import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  Route,
  MapPin,
  Truck,
  IndianRupee,
  Flame,
  CheckCircle2,
  Navigation,
  Sliders,
  Layers,
  Award,
  AlertCircle,
  Download,
  Printer
} from 'lucide-react';

// Custom Leaflet marker builder matching existing BiogasMap aesthetic
const makePin = (bgColor, label = '') =>
  L.divIcon({
    className: 'optimizer-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 3px 8px rgba(0,0,0,0.28);
      ">
        <div style="transform: rotate(45deg); color: white; font-size: 11px; font-weight: 800;">
          ${label}
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

const MapFocus = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 15, { duration: 1.0 });
    }
  }, [center, map]);
  return null;
};

const ROUTE_COLORS = ['#059669', '#2563eb', '#d97706', '#7c3aed', '#e11d48'];

const AllocationOptimizer = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const [villages, setVillages] = useState([]);
  const [villageId, setVillageId] = useState('');
  const [vehicleCapacityKg, setVehicleCapacityKg] = useState(150);
  const [plantCapacityM3, setPlantCapacityM3] = useState(25);
  const [transportCostPerKmINR, setTransportCostPerKmINR] = useState(18);
  const [selectedSiteId, setSelectedSiteId] = useState('optimal_median');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVillages = async () => {
      try {
        const res = await api.get('/villages');
        if (res.data.success && res.data.data.length > 0) {
          setVillages(res.data.data);
          const initId = user?.village?._id || res.data.data[0]._id;
          setVillageId(initId);
        }
      } catch (err) {
        console.error('Error fetching villages:', err);
      }
    };
    loadVillages();
  }, [user]);

  const runOptimization = async () => {
    if (!villageId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        villageId,
        vehicleCapacityKg,
        plantCapacityM3,
        transportCostPerKmINR,
        selectedSiteId
      });
      const res = await api.get(`/optimizer/analyze?${params.toString()}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Optimization error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runOptimization();
  }, [villageId, vehicleCapacityKg, plantCapacityM3, transportCostPerKmINR, selectedSiteId]);

  const activeDepot = data?.activeDepot;
  const candidateSites = data?.candidateSites || [];
  const collectionPoints = data?.collectionPoints || [];
  const households = data?.households || [];
  const routeOpt = data?.routeOptimization;
  const routeSummary = routeOpt?.summary;
  const routes = routeOpt?.routes || [];

  const mapCenter = activeDepot
    ? [activeDepot.latitude, activeDepot.longitude]
    : data?.village?.location
    ? [data.village.location.latitude, data.village.location.longitude]
    : [25.3176, 82.9739];

  const depotIcon = makePin('#059669', '★');
  const candidateIcon = makePin('#2563eb', 'P');
  const hubIcon = makePin('#7c3aed', 'C');

  const handleDownloadRouteCsv = () => {
    if (!routes || routes.length === 0) {
      addToast('No routes available to export yet', 'warning');
      return;
    }
    let csv =
      'Route #,Stop Order,Household Code,Head of Family,Latitude,Longitude,Collected Feedstock (kg),Leg Distance (km),Direct Distance to Plant (km),Route Total Distance (km),Route Daily Transport Cost (INR)\n';
    routes.forEach((r) => {
      r.stops.forEach((s) => {
        csv += `${r.routeNumber},${s.stopOrder},"${s.householdCode}","${s.headOfFamily}",${s.latitude},${s.longitude},${s.collectedKg},${s.legDistanceKm},${s.directDistanceToDepotKm},${r.totalDistanceKm},${r.dailyTransportCostINR}\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `optimized_collection_routes_${(data?.village?.name || 'village').replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    addToast('Optimized driver route sheet downloaded (CSV)!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:shadow-none">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200">
            <Route className="w-3.5 h-3.5" />
            Geospatial Facility Location & VRP Routing Engine
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Collection & Plant Allocation Optimizer
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Evaluates candidate community biogas plant locations using weighted geometric median optimization, calculates Haversine haulage distances & transport costs, and generates capacity-constrained collection routes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto print:hidden">
          <MapPin className="w-4 h-4 text-emerald-600" />
          <select
            value={villageId}
            onChange={(e) => {
              setVillageId(e.target.value);
              setSelectedSiteId('optimal_median');
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none"
          >
            {villages.map((v) => (
              <option key={v._id} value={v._id}>
                {v.name} ({v.district}, {v.state})
              </option>
            ))}
          </select>

          <button
            onClick={handleDownloadRouteCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Route CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Optimization Parameter Control Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-3">
          <Sliders className="w-4 h-4 text-emerald-600" />
          <span>Logistics & Capacity Constraints</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-slate-600">Target Plant Capacity</span>
              <span className="font-bold text-emerald-700">{plantCapacityM3} m³ ({plantCapacityM3 * 25} kg/d)</span>
            </div>
            <input
              type="range"
              min="4"
              max="85"
              step="1"
              value={plantCapacityM3}
              onChange={(e) => setPlantCapacityM3(Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-slate-600">Collection Vehicle Capacity</span>
              <span className="font-bold text-sky-700">{vehicleCapacityKg} kg / trip</span>
            </div>
            <input
              type="range"
              min="50"
              max="500"
              step="25"
              value={vehicleCapacityKg}
              onChange={(e) => setVehicleCapacityKg(Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-slate-600">Transport Cost Rate</span>
              <span className="font-bold text-amber-700">₹{transportCostPerKmINR} / km</span>
            </div>
            <input
              type="range"
              min="8"
              max="45"
              step="1"
              value={transportCostPerKmINR}
              onChange={(e) => setTransportCostPerKmINR(Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* Key Logistics KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Optimized Routes
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {routeSummary?.totalRoutes || 0}{' '}
            <span className="text-xs font-normal text-slate-500">Trips/day</span>
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block">
            {routeSummary?.totalStopsServed || 0} households served
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Daily Haul Distance
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {routeSummary?.totalDailyDistanceKm || 0}{' '}
            <span className="text-xs font-normal text-slate-500">km/day</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">2-opt road-adjusted distance</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Monthly Transport Cost
          </span>
          <div className="text-2xl font-black text-amber-700 mt-1">
            ₹{(routeSummary?.totalMonthlyTransportCostINR || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            ₹{routeSummary?.totalDailyTransportCostINR || 0}/day (₹{routeSummary?.avgTransportCostPerKgINR || 0}/kg)
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white shadow-md">
          <span className="text-[11px] font-medium text-emerald-100 uppercase tracking-wider block">
            Feedstock Allocated
          </span>
          <div className="text-2xl font-black mt-1">
            {routeSummary?.totalFeedstockCollectedKg || 0}{' '}
            <span className="text-xs font-normal text-emerald-100">kg/day</span>
          </div>
          <span className="text-[11px] text-emerald-200 mt-1 block">
            {routeSummary?.plantCapacityUtilizationPercent || 0}% of {plantCapacityM3} m³ plant intake
          </span>
        </div>
      </div>

      {/* Interactive Map + Candidate Sites Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Route & Allocation Map (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3 px-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Optimized Collection Routes & Plant Sites Map</h3>
              <p className="text-[11px] text-slate-500">
                Active Depot: <strong className="text-emerald-700">{activeDepot?.siteName || 'Calculating...'}</strong>
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-600">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>Active Plant</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>Collection Hub</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>Household</span>
            </div>
          </div>

          <div className="h-[460px] rounded-2xl overflow-hidden border border-slate-200 relative">
            {loading && !data ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Calculating optimal routes...
              </div>
            ) : (
              <MapContainer center={mapCenter} zoom={15} scrollWheelZoom={false} className="w-full h-full">
                <MapFocus center={mapCenter} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Route Polylines */}
                {routes.map((route, idx) => (
                  <Polyline
                    key={route.routeNumber}
                    positions={route.pathCoordinates}
                    pathOptions={{
                      color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
                      weight: 4,
                      opacity: 0.85,
                      dashArray: idx % 2 === 1 ? '8, 6' : null
                    }}
                  />
                ))}

                {/* Candidate Sites */}
                {candidateSites.map((site) => (
                  <Marker
                    key={site.siteId}
                    position={[site.latitude, site.longitude]}
                    icon={site.siteId === activeDepot?.siteId ? depotIcon : candidateIcon}
                  >
                    <Popup>
                      <div className="text-xs max-w-[210px]">
                        <strong className="text-emerald-900 block mb-1">{site.siteName}</strong>
                        <p className="text-[11px] text-slate-600">Suitability: <strong>{site.suitabilityScore}/100</strong></p>
                        <p className="text-[11px] text-slate-600">Weighted Avg Dist: <strong>{site.weightedAvgDistanceKm} km</strong></p>
                        <p className="text-[11px] text-slate-600">Est Transport: <strong>₹{site.estimatedDailyTransportCostINR}/day</strong></p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Collection Points */}
                {collectionPoints.map((cp) => (
                  <Marker key={cp.id} position={[cp.latitude, cp.longitude]} icon={hubIcon}>
                    <Popup>
                      <div className="text-xs">
                        <strong className="text-purple-900 block">{cp.name}</strong>
                        <p className="text-[11px] text-slate-600">Distance to Plant: {cp.distanceToPlantKm} km</p>
                        <p className="text-[11px] text-slate-600">Capacity: {cp.intakeCapacityKg} kg/day</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Numbered Household Route Stops */}
                {routes.flatMap((route, rIdx) =>
                  route.stops.map((stop) => (
                    <Marker
                      key={stop.householdId}
                      position={[stop.latitude, stop.longitude]}
                      icon={makePin(ROUTE_COLORS[rIdx % ROUTE_COLORS.length], `${stop.stopOrder}`)}
                    >
                      <Popup>
                        <div className="text-xs max-w-[200px]">
                          <strong className="text-slate-900 block">
                            Stop #{stop.stopOrder}: {stop.headOfFamily}
                          </strong>
                          <p className="text-[11px] text-slate-600">Code: {stop.householdCode}</p>
                          <p className="text-[11px] text-emerald-700 font-semibold">
                            Feedstock Collected: {stop.collectedKg} kg/day
                          </p>
                          <p className="text-[11px] text-slate-600">Leg Distance: {stop.legDistanceKm} km</p>
                          <p className="text-[11px] text-slate-600">Direct to Plant: {stop.directDistanceToDepotKm} km</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))
                )}
              </MapContainer>
            )}
          </div>
        </div>

        {/* Recommended Candidate Plant Locations Panel (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recommended Plant Locations</h3>
            <p className="text-xs text-slate-500">
              Click any candidate site to re-optimize waste collection routes and transport costs around it
            </p>
          </div>

          <div className="space-y-3">
            {candidateSites.map((site, idx) => {
              const isSelected = site.siteId === activeDepot?.siteId;
              return (
                <button
                  key={site.siteId}
                  type="button"
                  onClick={() => setSelectedSiteId(site.siteId)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                        Rank #{idx + 1} • {site.siteType}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">{site.siteName}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 whitespace-nowrap">
                      {site.suitabilityScore}/100
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 my-2.5 text-[11px] bg-white p-2 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Avg Distance</span>
                      <strong className="text-slate-800">{site.weightedAvgDistanceKm} km</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Daily Cost</span>
                      <strong className="text-amber-700">₹{site.estimatedDailyTransportCostINR}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Monthly Cost</span>
                      <strong className="text-slate-800">₹{site.estimatedMonthlyTransportCostINR.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-600">
                    {site.advantages?.slice(0, 2).map((adv, aIdx) => (
                      <div key={aIdx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{adv}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Optimized Waste Collection Routes Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">Optimized Collection Route Schedule</h3>
            <p className="text-xs text-slate-500">
              Capacity-constrained nearest-neighbor + 2-opt stop sequence minimizing haulage costs
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Active Site: {activeDepot?.siteName}
          </span>
        </div>

        <div className="p-6 space-y-5">
          {routes.map((route, rIdx) => (
            <div key={route.routeNumber} className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: ROUTE_COLORS[rIdx % ROUTE_COLORS.length] }}
                  />
                  <span className="font-bold text-slate-900">{route.routeName}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                    Load: {route.totalCollectedKg} kg ({route.vehicleUtilizationPercent}% truck capacity)
                  </span>
                </div>
                <div className="flex items-center gap-4 text-slate-600 font-medium">
                  <span>Distance: <strong className="text-slate-900">{route.totalDistanceKm} km</strong></span>
                  <span>Daily Cost: <strong className="text-amber-700">₹{route.dailyTransportCostINR}</strong></span>
                  <span>Monthly: <strong className="text-slate-900">₹{route.monthlyTransportCostINR.toLocaleString()}</strong></span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white border-b border-slate-100 text-slate-500 font-semibold text-[11px]">
                      <th className="p-3 pl-4">Stop #</th>
                      <th className="p-3">Household</th>
                      <th className="p-3">GPS Coordinates</th>
                      <th className="p-3 text-right">Collected Feedstock</th>
                      <th className="p-3 text-right">Leg Distance</th>
                      <th className="p-3 pr-4 text-right">Direct Distance to Plant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {route.stops.map((stop) => (
                      <tr key={stop.householdId} className="hover:bg-slate-50/60">
                        <td className="p-3 pl-4 font-bold text-emerald-700">Stop {stop.stopOrder}</td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{stop.headOfFamily}</div>
                          <span className="text-[10px] text-slate-400">{stop.householdCode}</span>
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-700">{stop.collectedKg} kg</td>
                        <td className="p-3 text-right text-slate-700">{stop.legDistanceKm} km</td>
                        <td className="p-3 pr-4 text-right text-slate-700">{stop.directDistanceToDepotKm} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {routeOpt?.unassignedHouseholds?.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Capacity Overflow Notice:</strong> {routeOpt.unassignedHouseholds.length} household(s) were not assigned because the selected {plantCapacityM3} m³ plant reached its daily design feedstock limit ({routeSummary?.plantDesignIntakeKg} kg). Increase Target Plant Capacity above to allocate remaining households.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllocationOptimizer;
