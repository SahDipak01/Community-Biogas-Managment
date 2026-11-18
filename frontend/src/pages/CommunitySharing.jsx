import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Modal from '../components/common/Modal';
import {
  Users2,
  Plus,
  Flame,
  CheckCircle2,
  Layers,
  MapPin,
  TrendingUp,
  Award,
  Sparkles,
  Droplets,
  AlertCircle
} from 'lucide-react';

const CommunitySharing = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();

  const [loading, setLoading] = useState(true);
  const [villages, setVillages] = useState([]);
  const [selectedVillageId, setSelectedVillageId] = useState('');
  const [poolingData, setPoolingData] = useState(null);
  const [households, setHouseholds] = useState([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newAgreement, setNewAgreement] = useState({
    householdId: '',
    dailyDungCommittedKg: 25,
    agriWasteCommittedKg: 5,
    kitchenWasteCommittedKg: 2,
    notes: ''
  });

  useEffect(() => {
    const fetchVillages = async () => {
      try {
        const res = await api.get('/villages');
        if (res.data.success && res.data.data.length > 0) {
          setVillages(res.data.data);
          const initialVillage = user?.village?._id || res.data.data[0]._id;
          setSelectedVillageId(initialVillage);
        }
      } catch (err) {
        console.error('Failed to load villages:', err);
      }
    };
    fetchVillages();
  }, [user]);

  const fetchPoolingData = async (villageId) => {
    if (!villageId) return;
    try {
      setLoading(true);
      const [poolRes, hhRes] = await Promise.all([
        api.get(`/community/pooling-summary?villageId=${villageId}`),
        api.get(`/households?villageId=${villageId}`)
      ]);

      if (poolRes.data.success) {
        setPoolingData(poolRes.data.data);
      }
      if (hhRes.data.success) {
        setHouseholds(hhRes.data.data);
        if (hhRes.data.data.length > 0) {
          setNewAgreement((prev) => ({ ...prev, householdId: hhRes.data.data[0]._id }));
        }
      }
    } catch (err) {
      console.error('Error fetching pooling summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedVillageId) {
      fetchPoolingData(selectedVillageId);
    }
  }, [selectedVillageId]);

  const handleCreateAgreement = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/community/contribute', {
        ...newAgreement,
        villageId: selectedVillageId
      });
      if (res.data.success) {
        addToast('Household biomass contribution agreement registered successfully!', 'success');
        setShowModal(false);
        fetchPoolingData(selectedVillageId);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Error saving agreement', 'error');
    }
  };

  const feedstock = poolingData?.combinedFeedstock;
  const assessment = poolingData?.sufficiencyAssessment;
  const potentialSites = poolingData?.potentialPlantLocations || [];
  const contributions = poolingData?.contributions || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200">
            <Users2 className="w-3.5 h-3.5" />
            Gram Panchayat Waste Pooling System
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Community Resource Sharing & Sizing</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Aggregates household organic waste commitments to identify cluster feasibility, calculate pooled biogas output, and locate optimal community digesters.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Village Filter */}
          <select
            value={selectedVillageId}
            onChange={(e) => setSelectedVillageId(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none"
          >
            {villages.map((v) => (
              <option key={v._id} value={v._id}>
                {v.name} ({v.district})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Join Resource Pool</span>
          </button>
        </div>
      </div>

      {/* Community Pooling Capacity Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Contributing Households
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {poolingData?.contributorCount || 0}{' '}
            <span className="text-xs font-normal text-slate-500">Families</span>
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block">Active pooling agreements</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Combined Daily Feedstock
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {feedstock?.combinedDailyFeedstockKg?.toLocaleString() || 0}{' '}
            <span className="text-xs font-normal text-slate-500">kg/day</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Dung: {feedstock?.totalDungCommittedKg || 0} kg | Agri: {feedstock?.totalAgriCommittedKg || 0} kg
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Recommended Community Plant
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {assessment?.recommendedCommunityCapacityM3 || 0}{' '}
            <span className="text-xs font-normal text-slate-500">m³ / day</span>
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block">
            Serves ~{assessment?.beneficiaryHouseholdsServed || 0} family kitchens
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-tr from-emerald-800 to-teal-800 text-white shadow-md">
          <span className="text-[11px] font-medium text-emerald-200 uppercase tracking-wider block">
            Daily Bio-Slurry Return
          </span>
          <div className="text-2xl font-black mt-1">
            {feedstock?.dailySlurryOutputLiters?.toLocaleString() || 0}{' '}
            <span className="text-xs font-normal text-emerald-100">Liters/day</span>
          </div>
          <span className="text-[11px] text-emerald-200 mt-1 block">Shared back to contributors</span>
        </div>
      </div>

      {/* Sufficiency Status Alert Box */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
          assessment?.hasSufficientResources
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/80 border-amber-200 text-amber-950'
        }`}
      >
        <div className="flex items-center gap-3">
          {assessment?.hasSufficientResources ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          )}
          <div>
            <h4 className="text-xs font-bold">{assessment?.status}</h4>
            <p className="text-[11px] opacity-90">
              {assessment?.hasSufficientResources
                ? `Collective volume exceeds minimum viable cluster threshold (140 kg/day). Village qualifies for Central Gobardhan Scheme funding!`
                : `Currently pooling ${feedstock?.combinedDailyFeedstockKg || 0} kg/day. Need ~${
                    140 - (feedstock?.combinedDailyFeedstockKg || 0)
                  } kg more daily feedstock to qualify for community digester subsidy.`}
            </p>
          </div>
        </div>
      </div>

      {/* Centroid / Recommended Community Digester Locations */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Optimal Community Digester Locations</h3>
            <p className="text-xs text-slate-500">
              Geospatial centroid analysis based on contributor GPS proximity, water access, and transport routes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {potentialSites.map((site, index) => (
            <div
              key={index}
              className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">{site.siteName}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    {site.suitabilityScore}% Suitability
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1 mb-3">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>GPS Coordinates: {site.latitude}, {site.longitude}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Target Digester Size: <strong>{site.recommendedCapacityM3} m³</strong></span>
                  </p>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1">
                  <span className="font-semibold text-slate-700 block">Site Advantages:</span>
                  {site.advantages?.map((adv, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{adv}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Household Pooling Roster Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Registered Contributor Roster</h3>
          <p className="text-xs text-slate-500">
            Household-wise bovine dung commitments, bio-slurry dividend rights, and community incentive credits
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5 pl-6">Household Code</th>
                <th className="p-3.5">Head of Family</th>
                <th className="p-3.5 text-right">Daily Dung Pledged</th>
                <th className="p-3.5 text-right">Agri Waste</th>
                <th className="p-3.5 text-right">Total Contribution</th>
                <th className="p-3.5 text-right">Slurry Dividend</th>
                <th className="p-3.5 text-center">Incentive Credits</th>
                <th className="p-3.5 pr-6">Agreement Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    Loading contributors...
                  </td>
                </tr>
              ) : contributions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    No household pooling agreements found in this village.
                  </td>
                </tr>
              ) : (
                contributions.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 pl-6 font-bold text-slate-800">
                      {c.household?.householdCode || 'HH-00'}
                    </td>
                    <td className="p-3.5 font-medium text-slate-800">
                      {c.household?.headOfFamily || 'Family Head'}
                    </td>
                    <td className="p-3.5 text-right font-medium text-emerald-700">
                      {c.dailyDungCommittedKg} kg/d
                    </td>
                    <td className="p-3.5 text-right font-medium text-amber-700">
                      {c.agriWasteCommittedKg} kg/d
                    </td>
                    <td className="p-3.5 text-right font-bold text-slate-900">
                      {c.totalDailyContributionKg} kg/d
                    </td>
                    <td className="p-3.5 text-right font-medium text-sky-700">
                      {c.slurryEntitlementLitersPerDay} L/d
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Award className="w-3 h-3" />
                        {c.incentiveCredits} pts
                      </span>
                    </td>
                    <td className="p-3.5 pr-6">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {c.agreementStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Contribution Agreement Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Register Household for Community Waste Sharing"
      >
        <form onSubmit={handleCreateAgreement} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Select Household</label>
            <select
              value={newAgreement.householdId}
              onChange={(e) => setNewAgreement({ ...newAgreement, householdId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
              required
            >
              {households.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.householdCode} - {h.headOfFamily} ({h.familyMembers} members)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Dung Committed (kg/d)</label>
              <input
                type="number"
                min="0"
                value={newAgreement.dailyDungCommittedKg}
                onChange={(e) =>
                  setNewAgreement({
                    ...newAgreement,
                    dailyDungCommittedKg: parseFloat(e.target.value) || 0
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Agri Waste (kg/d)</label>
              <input
                type="number"
                min="0"
                value={newAgreement.agriWasteCommittedKg}
                onChange={(e) =>
                  setNewAgreement({
                    ...newAgreement,
                    agriWasteCommittedKg: parseFloat(e.target.value) || 0
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Kitchen Waste (kg/d)</label>
              <input
                type="number"
                min="0"
                value={newAgreement.kitchenWasteCommittedKg}
                onChange={(e) =>
                  setNewAgreement({
                    ...newAgreement,
                    kitchenWasteCommittedKg: parseFloat(e.target.value) || 0
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 font-medium">
            <p>
              Total Daily Contribution:{' '}
              <strong>
                {(
                  newAgreement.dailyDungCommittedKg +
                  newAgreement.agriWasteCommittedKg +
                  newAgreement.kitchenWasteCommittedKg
                ).toFixed(1)}{' '}
                kg
              </strong>
            </p>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Household will be entitled to receive ~
              {Math.round(
                (newAgreement.dailyDungCommittedKg +
                  newAgreement.agriWasteCommittedKg +
                  newAgreement.kitchenWasteCommittedKg) *
                  0.85
              )}{' '}
              liters of enriched bio-slurry daily for organic farm fertilizing.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
            >
              Sign & Register Agreement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CommunitySharing;
