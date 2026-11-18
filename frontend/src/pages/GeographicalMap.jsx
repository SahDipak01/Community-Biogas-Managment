import React, { useState, useEffect } from 'react';
import api from '../services/api';
import BiogasMap from '../components/map/BiogasMap';
import {
  Map,
  MapPin,
  Flame,
  Home,
  Recycle,
  Sparkles,
  Info,
  Layers,
  Building2,
  Users
} from 'lucide-react';

const GeographicalMap = () => {
  const [mapFeatures, setMapFeatures] = useState(null);
  const [villages, setVillages] = useState([]);
  const [selectedVillageId, setSelectedVillageId] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchMapData = async (vId) => {
    try {
      setLoading(true);
      const url = vId && vId !== 'all' ? `/map/features?villageId=${vId}` : '/map/features';
      const res = await api.get(url);
      if (res.data.success) {
        setMapFeatures(res.data.data);
        if (res.data.data.villages) {
          setVillages(res.data.data.villages);
        }
      }
    } catch (err) {
      console.error('Failed to load spatial map features:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData(selectedVillageId);
  }, [selectedVillageId]);

  const currentVillage = villages.find((v) => v._id === selectedVillageId);

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200">
            <Map className="w-3.5 h-3.5" />
            GIS OpenStreetMap Geospatial Layer
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Geographical Infrastructure Map</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Interactive spatial mapping of registered farming households, existing digester installations, waste aggregation depots, and optimal community plant hubs.
          </p>
        </div>

        {/* Village Selector */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Focus Village:
          </label>
          <select
            value={selectedVillageId}
            onChange={(e) => setSelectedVillageId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none"
          >
            <option value="all">All Villages (State View)</option>
            {villages.map((v) => (
              <option key={v._id} value={v._id}>
                {v.name} ({v.district}, {v.state})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Interactive Map Visualizer (3 Cols) */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="h-[540px] rounded-2xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
              Loading Leaflet GIS Map tiles...
            </div>
          ) : (
            <BiogasMap
              features={mapFeatures}
              selectedVillageId={selectedVillageId !== 'all' ? selectedVillageId : null}
            />
          )}
        </div>

        {/* Spatial Resource Sidebar Panel (1 Col) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              {currentVillage ? currentVillage.name : 'Regional Infrastructure Summary'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {currentVillage
                ? `District: ${currentVillage.district}, ${currentVillage.state}`
                : 'Aggregated spatial view across all Gram Panchayats'}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Flame className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-800">Biogas Plants</span>
              </div>
              <span className="text-sm font-bold text-emerald-800">
                {mapFeatures?.plants?.length || 0} Units
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Home className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-semibold text-slate-800">Households</span>
              </div>
              <span className="text-sm font-bold text-slate-800">
                {mapFeatures?.households?.length || 0} Families
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-800">Potential Hubs</span>
              </div>
              <span className="text-sm font-bold text-blue-800">
                {mapFeatures?.potentialSites?.length || 0} Sites
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Recycle className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-slate-800">Collection Depots</span>
              </div>
              <span className="text-sm font-bold text-purple-800">
                {mapFeatures?.collectionPoints?.length || 0} Hubs
              </span>
            </div>
          </div>

          {currentVillage && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
              <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                Village Demographics
              </span>
              <p className="text-slate-600 flex justify-between">
                <span>Population:</span>
                <strong>{currentVillage.population?.toLocaleString()}</strong>
              </p>
              <p className="text-slate-600 flex justify-between">
                <span>Estimated Cattle:</span>
                <strong>{currentVillage.estimatedCattle?.toLocaleString()} head</strong>
              </p>
              <p className="text-slate-600 flex justify-between">
                <span>Climate Zone:</span>
                <strong>{currentVillage.climateZone}</strong>
              </p>
            </div>
          )}

          <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">
            Click on any marker pin on the map to inspect digester capacities, family heads, or suitability indices.
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeographicalMap;
