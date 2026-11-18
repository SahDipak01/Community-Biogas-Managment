/**
 * Geospatial Collection Route & Plant Allocation Optimization Engine
 * Uses Haversine geometry, Weiszfeld weighted geometric median (Weber facility location),
 * and Capacity-Constrained Nearest-Neighbor + 2-opt TSP route optimization.
 */

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle Haversine distance between two lat/lng points in kilometers
 */
function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((EARTH_RADIUS_KM * c).toFixed(3));
}

/**
 * Weiszfeld iterative algorithm to compute the weighted geometric median
 * (minimizes sum of feedstockWeight * distance to plant site)
 */
function computeOptimalFacilityLocation(weightedPoints) {
  if (!weightedPoints || weightedPoints.length === 0) {
    return { latitude: 25.3176, longitude: 82.9739 };
  }

  const totalWeight = weightedPoints.reduce((acc, p) => acc + Math.max(1, p.weight || 1), 0);
  let currLat = weightedPoints.reduce((acc, p) => acc + p.latitude * Math.max(1, p.weight || 1), 0) / totalWeight;
  let currLng = weightedPoints.reduce((acc, p) => acc + p.longitude * Math.max(1, p.weight || 1), 0) / totalWeight;

  // 25 iterations of Weiszfeld refinement
  for (let iter = 0; iter < 25; iter++) {
    let numLat = 0;
    let numLng = 0;
    let denom = 0;

    for (const p of weightedPoints) {
      const w = Math.max(1, p.weight || 1);
      const dist = haversineDistanceKm(currLat, currLng, p.latitude, p.longitude);
      if (dist < 0.0005) {
        // Already sitting directly on a major contributor point
        continue;
      }
      const factor = w / dist;
      numLat += p.latitude * factor;
      numLng += p.longitude * factor;
      denom += factor;
    }

    if (denom === 0) break;
    const nextLat = numLat / denom;
    const nextLng = numLng / denom;

    if (haversineDistanceKm(currLat, currLng, nextLat, nextLng) < 0.0001) {
      currLat = nextLat;
      currLng = nextLng;
      break;
    }
    currLat = nextLat;
    currLng = nextLng;
  }

  return {
    latitude: Number(currLat.toFixed(5)),
    longitude: Number(currLng.toFixed(5))
  };
}

/**
 * 2-opt refinement on an ordered route (starts & ends at depot)
 */
function twoOptImprove(depot, stops) {
  if (stops.length < 3) return stops;

  const routeDist = (arr) => {
    let total = haversineDistanceKm(depot.latitude, depot.longitude, arr[0].latitude, arr[0].longitude);
    for (let i = 0; i < arr.length - 1; i++) {
      total += haversineDistanceKm(arr[i].latitude, arr[i].longitude, arr[i + 1].latitude, arr[i + 1].longitude);
    }
    total += haversineDistanceKm(arr[arr.length - 1].latitude, arr[arr.length - 1].longitude, depot.latitude, depot.longitude);
    return total;
  };

  let best = [...stops];
  let bestDist = routeDist(best);
  let improved = true;

  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1)
        ];
        const candidateDist = routeDist(candidate);
        if (candidateDist + 0.001 < bestDist) {
          best = candidate;
          bestDist = candidateDist;
          improved = true;
        }
      }
    }
  }
  return best;
}

/**
 * Optimize multi-trip waste collection routes based on resource availability,
 * vehicle carrying capacity, and plant intake capacity.
 */
function optimizeCollectionRoutes({
  depot,
  households,
  vehicleCapacityKg = 250,
  plantCapacityM3 = 25,
  transportCostPerKmINR = 15,
  roadFactor = 1.25 // Rural road winding factor over straight-line distance
}) {
  const maxPlantFeedstockKg = plantCapacityM3 * 25; // 25 kg fresh dung per m3 capacity
  const unvisited = households
    .filter((h) => h.dailyFeedstockKg > 0 && h.latitude && h.longitude)
    .map((h) => ({ ...h }));

  const routes = [];
  let cumulativeAllocatedKg = 0;
  let routeIndex = 1;

  while (unvisited.length > 0 && cumulativeAllocatedKg < maxPlantFeedstockKg) {
    const currentStops = [];
    let currentLoadKg = 0;
    let currPos = { latitude: depot.latitude, longitude: depot.longitude };

    while (unvisited.length > 0) {
      let nearestIdx = -1;
      let nearestDist = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const candidate = unvisited[i];
        const remainingPlantRoom = maxPlantFeedstockKg - cumulativeAllocatedKg;
        const remainingVehicleRoom = vehicleCapacityKg - currentLoadKg;

        // If the household fits in the current trip (or it's the first stop of an empty trip)
        if (
          (candidate.dailyFeedstockKg <= remainingVehicleRoom && candidate.dailyFeedstockKg <= remainingPlantRoom) ||
          currentStops.length === 0
        ) {
          const d = haversineDistanceKm(currPos.latitude, currPos.longitude, candidate.latitude, candidate.longitude);
          if (d < nearestDist) {
            nearestDist = d;
            nearestIdx = i;
          }
        }
      }

      if (nearestIdx === -1) break;

      const chosen = unvisited.splice(nearestIdx, 1)[0];
      const remainingPlantRoom = Math.max(0, maxPlantFeedstockKg - cumulativeAllocatedKg);
      const remainingVehicleRoom = Math.max(0, vehicleCapacityKg - currentLoadKg);
      const collectableKg = Math.min(chosen.dailyFeedstockKg, remainingPlantRoom, remainingVehicleRoom);

      if (collectableKg <= 0.1) break;

      // If household has remaining feedstock beyond this vehicle's capacity, schedule remainder for next trip
      const leftoverKg = Number((chosen.dailyFeedstockKg - collectableKg).toFixed(1));
      if (leftoverKg >= 1 && remainingPlantRoom - collectableKg >= 1 && routeIndex < 20) {
        unvisited.push({
          ...chosen,
          dailyFeedstockKg: leftoverKg
        });
      }

      currentStops.push({
        ...chosen,
        collectedKg: Number(collectableKg.toFixed(1))
      });
      currentLoadKg += collectableKg;
      cumulativeAllocatedKg += collectableKg;
      currPos = { latitude: chosen.latitude, longitude: chosen.longitude };

      if (currentLoadKg >= vehicleCapacityKg * 0.95 || cumulativeAllocatedKg >= maxPlantFeedstockKg) {
        break;
      }
    }

    if (currentStops.length === 0) break;

    // Apply 2-opt TSP optimization
    const optimizedStops = twoOptImprove(depot, currentStops);

    // Compute exact road-adjusted leg distances
    const pathCoordinates = [[depot.latitude, depot.longitude]];
    let straightDistanceKm = 0;
    let prev = depot;

    const detailedStops = optimizedStops.map((stop, idx) => {
      const legStraight = haversineDistanceKm(prev.latitude, prev.longitude, stop.latitude, stop.longitude);
      const legRoad = Number((legStraight * roadFactor).toFixed(2));
      straightDistanceKm += legStraight;
      pathCoordinates.push([stop.latitude, stop.longitude]);
      prev = stop;

      return {
        stopOrder: idx + 1,
        householdId: stop.id,
        householdCode: stop.code,
        headOfFamily: stop.name,
        latitude: stop.latitude,
        longitude: stop.longitude,
        dailyFeedstockKg: stop.dailyFeedstockKg,
        collectedKg: stop.collectedKg,
        legDistanceKm: legRoad,
        directDistanceToDepotKm: Number((haversineDistanceKm(depot.latitude, depot.longitude, stop.latitude, stop.longitude) * roadFactor).toFixed(2))
      };
    });

    // Return leg back to plant depot
    const returnStraight = haversineDistanceKm(prev.latitude, prev.longitude, depot.latitude, depot.longitude);
    straightDistanceKm += returnStraight;
    pathCoordinates.push([depot.latitude, depot.longitude]);

    const totalRoadDistanceKm = Number((straightDistanceKm * roadFactor).toFixed(2));
    const dailyTransportCostINR = Number((totalRoadDistanceKm * transportCostPerKmINR).toFixed(2));

    routes.push({
      routeNumber: routeIndex,
      routeName: `Route #${routeIndex} (${detailedStops.length} Stops)`,
      stopsCount: detailedStops.length,
      totalCollectedKg: Number(currentLoadKg.toFixed(1)),
      vehicleUtilizationPercent: Math.min(100, Math.round((currentLoadKg / vehicleCapacityKg) * 100)),
      totalDistanceKm: totalRoadDistanceKm,
      dailyTransportCostINR,
      monthlyTransportCostINR: Math.round(dailyTransportCostINR * 30),
      costPerKgINR: currentLoadKg > 0 ? Number((dailyTransportCostINR / currentLoadKg).toFixed(2)) : 0,
      pathCoordinates,
      stops: detailedStops
    });

    routeIndex++;
  }

  const totalDistanceAllRoutesKm = Number(routes.reduce((acc, r) => acc + r.totalDistanceKm, 0).toFixed(2));
  const totalDailyCostINR = Number(routes.reduce((acc, r) => acc + r.dailyTransportCostINR, 0).toFixed(2));
  const totalCollectedAllRoutesKg = Number(routes.reduce((acc, r) => acc + r.totalCollectedKg, 0).toFixed(1));

  // Unassigned households (if plant capacity reached)
  const unassignedHouseholds = unvisited.map((u) => ({
    householdId: u.id,
    householdCode: u.code,
    headOfFamily: u.name,
    dailyFeedstockKg: u.dailyFeedstockKg,
    reason: 'Plant design capacity reached'
  }));

  return {
    summary: {
      totalRoutes: routes.length,
      totalStopsServed: routes.reduce((acc, r) => acc + r.stopsCount, 0),
      totalFeedstockCollectedKg: totalCollectedAllRoutesKg,
      plantDesignIntakeKg: maxPlantFeedstockKg,
      plantCapacityUtilizationPercent: Math.min(100, Math.round((totalCollectedAllRoutesKg / Math.max(1, maxPlantFeedstockKg)) * 100)),
      totalDailyDistanceKm: totalDistanceAllRoutesKm,
      totalDailyTransportCostINR: totalDailyCostINR,
      totalMonthlyTransportCostINR: Math.round(totalDailyCostINR * 30),
      avgTransportCostPerKgINR: totalCollectedAllRoutesKg > 0 ? Number((totalDailyCostINR / totalCollectedAllRoutesKg).toFixed(2)) : 0
    },
    routes,
    unassignedHouseholds
  };
}

/**
 * Evaluate and rank candidate community biogas plant sites
 */
function evaluateCandidateSites(candidates, households, transportCostPerKmINR = 15, roadFactor = 1.25) {
  const totalFeedstock = households.reduce((acc, h) => acc + (h.dailyFeedstockKg || 0), 0);

  return candidates
    .map((site) => {
      let weightedDistSum = 0;
      let maxDist = 0;
      let totalRoundTripKm = 0;

      households.forEach((h) => {
        const d = haversineDistanceKm(site.latitude, site.longitude, h.latitude, h.longitude) * roadFactor;
        weightedDistSum += d * (h.dailyFeedstockKg || 10);
        if (d > maxDist) maxDist = d;
        totalRoundTripKm += d * 2;
      });

      const weightedAvgDistKm = totalFeedstock > 0 ? Number((weightedDistSum / totalFeedstock).toFixed(2)) : 0;
      // Estimate consolidated daily route distance (typically ~45% of sum of individual spokes)
      const estimatedConsolidatedDailyKm = Number((Math.max(0.8, totalRoundTripKm * 0.42)).toFixed(2));
      const estimatedDailyTransportCostINR = Number((estimatedConsolidatedDailyKm * transportCostPerKmINR).toFixed(2));

      // Suitability score (0-100): shorter avg distance & higher water/road bonus = higher score
      const distancePenalty = Math.min(40, weightedAvgDistKm * 18);
      const baseBonus = site.infrastructureBonus || 0;
      const suitabilityScore = Math.max(45, Math.min(99, Math.round(94 - distancePenalty + baseBonus)));

      return {
        ...site,
        weightedAvgDistanceKm: weightedAvgDistKm,
        maxHouseholdDistanceKm: Number(maxDist.toFixed(2)),
        estimatedDailyTransportKm: estimatedConsolidatedDailyKm,
        estimatedDailyTransportCostINR,
        estimatedMonthlyTransportCostINR: Math.round(estimatedDailyTransportCostINR * 30),
        suitabilityScore
      };
    })
    .sort((a, b) => b.suitabilityScore - a.suitabilityScore);
}

module.exports = {
  haversineDistanceKm,
  computeOptimalFacilityLocation,
  optimizeCollectionRoutes,
  evaluateCandidateSites
};
