import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import StatusBadge from '../common/StatusBadge';
import { Flame, Home, Building2, Recycle, Sparkles, Navigation } from 'lucide-react';

// Custom SVG HTML icon generator for Leaflet
const createCustomIcon = (bgColor, iconSvg) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        width: 34px;
        height: 34px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.25);
      ">
        <div style="transform: rotate(45deg); color: white; display: flex; align-items: center; justify-content: center;">
          ${iconSvg}
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34]
  });
};

// Map center adjuster hook
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
};

const BiogasMap = ({ features, selectedVillageId, onSelectVillage }) => {
  const [mapCenter, setMapCenter] = useState([25.3176, 82.9739]);
  const [mapZoom, setMapZoom] = useState(13);

  // Icons
  const activePlantIcon = createCustomIcon(
    '#059669',
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 22 4-10 4 10"/></svg>'
  );

  const maintenancePlantIcon = createCustomIcon(
    '#d97706',
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
  );

  const potentialSiteIcon = createCustomIcon(
    '#2563eb',
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
  );

  const collectionPointIcon = createCustomIcon(
    '#7c3aed',
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/><path d="M11 19h8.2a1.8 1.8 0 0 0 1.565-.914c.394-.657.375-1.477-.046-2.116L17.2 10.5"/></svg>'
  );

  const householdIcon = createCustomIcon(
    '#475569',
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
  );

  // Adjust center when village changes
  useEffect(() => {
    if (selectedVillageId && features?.villages) {
      const v = features.villages.find((vil) => vil._id === selectedVillageId);
      if (v && v.location) {
        setMapCenter([v.location.latitude, v.location.longitude]);
        setMapZoom(14);
      }
    }
  }, [selectedVillageId, features]);

  const plants = features?.plants || [];
  const households = features?.households || [];
  const potentialSites = features?.potentialSites || [];
  const collectionPoints = features?.collectionPoints || [];

  return (
    <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Legend overlay */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-md text-xs space-y-1.5 pointer-events-auto">
        <div className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider mb-1">
          Map Legend
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
          <span className="text-slate-600">Active Biogas Plant</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-600"></span>
          <span className="text-slate-600">Plant in Maintenance</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-600"></span>
          <span className="text-slate-600">Potential Community Site</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-purple-600"></span>
          <span className="text-slate-600">Organic Waste Collection Hub</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-slate-600"></span>
          <span className="text-slate-600">Registered Household</span>
        </div>
      </div>

      <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom={false} className="w-full h-full">
        <ChangeView center={mapCenter} zoom={mapZoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Existing Biogas Plants */}
        {plants.map((plant) => (
          <Marker
            key={plant.id}
            position={[plant.location.latitude, plant.location.longitude]}
            icon={plant.status === 'Active' ? activePlantIcon : maintenancePlantIcon}
          >
            <Popup>
              <div className="p-1 max-w-[220px]">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-slate-900 text-xs">{plant.name}</span>
                  <StatusBadge status={plant.status} />
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <p><strong className="text-slate-700">Code:</strong> {plant.code}</p>
                  <p><strong className="text-slate-700">Model:</strong> {plant.plantType}</p>
                  <p><strong className="text-slate-700">Capacity:</strong> {plant.capacityM3} m³/day</p>
                  <p><strong className="text-slate-700">Village:</strong> {plant.villageName}</p>
                  <p><strong className="text-slate-700">Type:</strong> {plant.isCommunityPlant ? 'Community Asset' : 'Domestic Plant'}</p>
                  <p><strong className="text-slate-700">Utilization:</strong> {plant.details?.gasUtilization || 'Cooking'}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Potential Community Sites */}
        {potentialSites.map((site) => (
          <Marker
            key={site.id}
            position={[site.location.latitude, site.location.longitude]}
            icon={potentialSiteIcon}
          >
            <Popup>
              <div className="p-1 max-w-[220px]">
                <span className="font-bold text-blue-900 text-xs block mb-1">{site.name}</span>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <p><strong className="text-slate-700">Feasibility Score:</strong> <span className="text-emerald-600 font-bold">{site.suitabilityScore}/100</span></p>
                  <p><strong className="text-slate-700">Target Capacity:</strong> {site.recommendedCapacityM3} m³</p>
                  <p><strong className="text-slate-700">Collection Radius:</strong> {site.feedstockRadiusKm} km</p>
                  <p className="text-[10px] text-slate-500 italic mt-1">Optimal centroid for cluster waste aggregation.</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Organic Waste Collection Points */}
        {collectionPoints.map((point) => (
          <Marker
            key={point.id}
            position={[point.location.latitude, point.location.longitude]}
            icon={collectionPointIcon}
          >
            <Popup>
              <div className="p-1 max-w-[200px]">
                <span className="font-bold text-purple-900 text-xs block mb-1">{point.name}</span>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <p><strong className="text-slate-700">Intake Capacity:</strong> {point.capacityKgPerDay} kg/day</p>
                  <p><strong className="text-slate-700">Operating Hours:</strong> {point.operationalHours}</p>
                  <p><strong className="text-slate-700">Village:</strong> {point.village}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Registered Households */}
        {households.map((hh) => (
          <Marker
            key={hh.id}
            position={[hh.location.latitude, hh.location.longitude]}
            icon={householdIcon}
          >
            <Popup>
              <div className="p-1 max-w-[200px]">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-slate-900 text-xs">{hh.name}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded">{hh.code}</span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <p><strong className="text-slate-700">Family Members:</strong> {hh.familyMembers}</p>
                  <p><strong className="text-slate-700">Biogas Plant:</strong> {hh.hasBiogasPlant ? 'Installed' : 'Candidate'}</p>
                  <p><strong className="text-slate-700">Water Source:</strong> {hh.waterSource}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default BiogasMap;
