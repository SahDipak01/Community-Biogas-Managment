const DailyContributionLog = require('../models/DailyContributionLog');
const CommunityContribution = require('../models/CommunityContribution');
const Household = require('../models/Household');
const Village = require('../models/Village');

// Incentive Engine Constants
const INCENTIVE_RATES = {
  dungPointsPerKg: 1.0,
  agriPointsPerKg: 1.2,
  kitchenPointsPerKg: 1.5,
  inrPerKgBase: 2.0,          // ₹2.00 per kg organic waste delivered
  slurryLitersPerKg: 0.85,    // 0.85 L organic bio-slurry dividend per kg contributed
  weeklyConsistencyBonusINR: 75,  // Bonus for >= 5 days active in a week
  monthlyConsistencyBonusINR: 350 // Bonus for >= 20 days active in a month
};

function computeTier(monthlyKg) {
  if (monthlyKg >= 1200) return { name: 'Platinum Champion', bonusMultiplier: 1.25, color: 'emerald' };
  if (monthlyKg >= 750) return { name: 'Gold Contributor', bonusMultiplier: 1.15, color: 'amber' };
  if (monthlyKg >= 400) return { name: 'Silver Partner', bonusMultiplier: 1.08, color: 'sky' };
  return { name: 'Bronze Supporter', bonusMultiplier: 1.0, color: 'slate' };
}

// @desc    Get Community Contribution & Incentive Dashboard (Daily, Weekly, Monthly + Rankings)
// @route   GET /api/incentives/dashboard
// @access  Private
const getIncentiveDashboard = async (req, res, next) => {
  try {
    const { villageId, period = 'monthly' } = req.query;

    const query = {};
    if (req.user.role === 'coordinator' && req.user.village) {
      query.village = req.user.village._id || req.user.village;
    } else if (villageId && villageId !== 'all') {
      query.village = villageId;
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch last 30 days logs
    const logs = await DailyContributionLog.find({
      ...query,
      contributionDate: { $gte: thirtyDaysAgo }
    })
      .sort({ contributionDate: -1 })
      .populate('household', 'householdCode headOfFamily familyMembers contactPhone')
      .populate('village', 'name district');

    // Compute Daily (last 24h / latest day), Weekly (7d), and Monthly (30d) totals
    let dailyTotalKg = 0;
    let weeklyTotalKg = 0;
    let monthlyTotalKg = 0;
    let totalIncentiveINR = 0;
    let totalSlurryCreditsLiters = 0;

    // Group by household for rankings
    const householdMap = {};
    // Group by date for daily trend chart (last 14 days)
    const dailyTrendMap = {};

    logs.forEach((log) => {
      const logDate = new Date(log.contributionDate);
      const dateKey = logDate.toISOString().split('T')[0];

      monthlyTotalKg += log.totalKg;
      totalIncentiveINR += log.incentiveValueINR;
      totalSlurryCreditsLiters += log.slurryCreditLiters;

      if (logDate >= sevenDaysAgo) {
        weeklyTotalKg += log.totalKg;
      }
      if (logDate >= startOfToday) {
        dailyTotalKg += log.totalKg;
      }

      // Daily trend accumulation
      if (!dailyTrendMap[dateKey]) {
        dailyTrendMap[dateKey] = {
          date: dateKey,
          label: logDate.toLocaleDateString([], { month: 'short', day: 'numeric' }),
          dungKg: 0,
          agriWasteKg: 0,
          kitchenWasteKg: 0,
          totalKg: 0,
          incentiveINR: 0
        };
      }
      dailyTrendMap[dateKey].dungKg += log.dungKg;
      dailyTrendMap[dateKey].agriWasteKg += log.agriWasteKg;
      dailyTrendMap[dateKey].kitchenWasteKg += log.kitchenWasteKg;
      dailyTrendMap[dateKey].totalKg += log.totalKg;
      dailyTrendMap[dateKey].incentiveINR += log.incentiveValueINR;

      // Household aggregation
      if (log.household) {
        const hId = log.household._id.toString();
        if (!householdMap[hId]) {
          householdMap[hId] = {
            householdId: hId,
            householdCode: log.household.householdCode,
            headOfFamily: log.household.headOfFamily,
            villageName: log.village ? log.village.name : 'Village',
            dailyKg: 0,
            weeklyKg: 0,
            monthlyKg: 0,
            monthlyDungKg: 0,
            monthlyAgriKg: 0,
            monthlyKitchenKg: 0,
            activeDaysWeekly: new Set(),
            activeDaysMonthly: new Set(),
            baseIncentiveINR: 0,
            totalPoints: 0,
            slurryCreditsLiters: 0,
            lastContributionDate: log.contributionDate
          };
        }

        const entry = householdMap[hId];
        entry.monthlyKg += log.totalKg;
        entry.monthlyDungKg += log.dungKg;
        entry.monthlyAgriKg += log.agriWasteKg;
        entry.monthlyKitchenKg += log.kitchenWasteKg;
        entry.baseIncentiveINR += log.incentiveValueINR;
        entry.totalPoints += log.incentivePointsEarned;
        entry.slurryCreditsLiters += log.slurryCreditLiters;
        entry.activeDaysMonthly.add(dateKey);

        if (logDate >= sevenDaysAgo) {
          entry.weeklyKg += log.totalKg;
          entry.activeDaysWeekly.add(dateKey);
        }
        if (logDate >= startOfToday) {
          entry.dailyKg += log.totalKg;
        }
      }
    });

    // Calculate Final Ranked Leaderboard with Tiers & Consistency Bonuses
    const rankings = Object.values(householdMap)
      .map((h) => {
        const tier = computeTier(h.monthlyKg);
        const activeDaysM = h.activeDaysMonthly.size;
        const activeDaysW = h.activeDaysWeekly.size;
        const consistencyBonusINR =
          activeDaysM >= 20
            ? INCENTIVE_RATES.monthlyConsistencyBonusINR
            : activeDaysW >= 5
            ? INCENTIVE_RATES.weeklyConsistencyBonusINR
            : 0;

        const finalMonthlyIncentiveINR = Math.round(h.baseIncentiveINR * tier.bonusMultiplier + consistencyBonusINR);

        return {
          householdId: h.householdId,
          householdCode: h.householdCode,
          headOfFamily: h.headOfFamily,
          villageName: h.villageName,
          dailyKg: Number(h.dailyKg.toFixed(1)),
          weeklyKg: Number(h.weeklyKg.toFixed(1)),
          monthlyKg: Number(h.monthlyKg.toFixed(1)),
          monthlyDungKg: Number(h.monthlyDungKg.toFixed(1)),
          monthlyAgriKg: Number(h.monthlyAgriKg.toFixed(1)),
          monthlyKitchenKg: Number(h.monthlyKitchenKg.toFixed(1)),
          activeDaysWeekly: activeDaysW,
          activeDaysMonthly: activeDaysM,
          totalPoints: Math.round(h.totalPoints),
          baseIncentiveINR: Math.round(h.baseIncentiveINR),
          consistencyBonusINR,
          finalMonthlyIncentiveINR,
          slurryCreditsLiters: Math.round(h.slurryCreditsLiters),
          tier: tier.name,
          tierColor: tier.color,
          bonusMultiplier: tier.bonusMultiplier,
          lastContributionDate: h.lastContributionDate
        };
      })
      .sort((a, b) => {
        if (period === 'weekly') return b.weeklyKg - a.weeklyKg;
        if (period === 'daily') return b.dailyKg - a.dailyKg;
        return b.monthlyKg - a.monthlyKg;
      })
      .map((item, idx) => ({ rank: idx + 1, ...item }));

    // Weekly rollup (last 4 weeks)
    const weeklySummary = [1, 2, 3, 4].map((weekNum) => {
      const wEnd = new Date(now);
      wEnd.setDate(wEnd.getDate() - (weekNum - 1) * 7);
      const wStart = new Date(now);
      wStart.setDate(wStart.getDate() - weekNum * 7);

      const weekLogs = logs.filter((l) => {
        const d = new Date(l.contributionDate);
        return d >= wStart && d <= wEnd;
      });

      const totalKg = weekLogs.reduce((acc, l) => acc + l.totalKg, 0);
      const incentiveINR = weekLogs.reduce((acc, l) => acc + l.incentiveValueINR, 0);
      return {
        weekLabel: weekNum === 1 ? 'This Week' : `${weekNum - 1} wk ago`,
        totalKg: Math.round(totalKg),
        incentiveINR: Math.round(incentiveINR),
        entriesCount: weekLogs.length
      };
    }).reverse();

    const dailyTrend = Object.values(dailyTrendMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);

    // If no logs exist for "today" specifically, display latest active day's total as reference
    const latestDayTotalKg =
      dailyTotalKg > 0 ? dailyTotalKg : dailyTrend.length > 0 ? dailyTrend[dailyTrend.length - 1].totalKg : 0;

    res.json({
      success: true,
      data: {
        summary: {
          dailyTotalKg: Math.round(latestDayTotalKg),
          weeklyTotalKg: Math.round(weeklyTotalKg),
          monthlyTotalKg: Math.round(monthlyTotalKg),
          totalIncentiveDisbursedINR: Math.round(
            rankings.reduce((acc, r) => acc + r.finalMonthlyIncentiveINR, 0) || totalIncentiveINR
          ),
          totalSlurryCreditsLiters: Math.round(totalSlurryCreditsLiters),
          activeContributorsCount: rankings.length
        },
        incentiveRules: INCENTIVE_RATES,
        rankings,
        dailyTrend,
        weeklySummary,
        recentLogs: logs.slice(0, 25)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log a household's daily waste contribution & calculate incentives
// @route   POST /api/incentives/log
// @access  Private
const logDailyContribution = async (req, res, next) => {
  try {
    const {
      villageId,
      householdId,
      contributionDate,
      dungKg = 0,
      agriWasteKg = 0,
      kitchenWasteKg = 0,
      notes = ''
    } = req.body;

    if (!householdId) {
      return res.status(400).json({ success: false, message: 'Household ID is required' });
    }

    const household = await Household.findById(householdId);
    if (!household) {
      return res.status(404).json({ success: false, message: 'Household not found' });
    }

    const assignedVillage = villageId || household.village;
    const dung = Math.max(0, Number(dungKg) || 0);
    const agri = Math.max(0, Number(agriWasteKg) || 0);
    const kitchen = Math.max(0, Number(kitchenWasteKg) || 0);
    const totalKg = Number((dung + agri + kitchen).toFixed(2));

    if (totalKg <= 0) {
      return res.status(400).json({ success: false, message: 'Total waste contribution must be greater than 0 kg' });
    }

    const incentivePointsEarned = Math.round(
      dung * INCENTIVE_RATES.dungPointsPerKg +
        agri * INCENTIVE_RATES.agriPointsPerKg +
        kitchen * INCENTIVE_RATES.kitchenPointsPerKg
    );
    const incentiveValueINR = Number((totalKg * INCENTIVE_RATES.inrPerKgBase).toFixed(2));
    const slurryCreditLiters = Math.round(totalKg * INCENTIVE_RATES.slurryLitersPerKg);

    const log = await DailyContributionLog.create({
      village: assignedVillage,
      household: householdId,
      contributionDate: contributionDate ? new Date(contributionDate) : new Date(),
      dungKg: dung,
      agriWasteKg: agri,
      kitchenWasteKg: kitchen,
      totalKg,
      incentivePointsEarned,
      incentiveValueINR,
      slurryCreditLiters,
      verified: true,
      recordedBy: req.user._id,
      notes
    });

    // Also increment incentiveCredits on CommunityContribution if agreement exists
    await CommunityContribution.findOneAndUpdate(
      { household: householdId, agreementStatus: 'Active' },
      { $inc: { incentiveCredits: incentivePointsEarned } }
    );

    res.status(201).json({
      success: true,
      data: log
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export Community Contribution & Incentive Report as CSV
// @route   GET /api/incentives/report-csv
// @access  Private
const exportContributionReportCsv = async (req, res, next) => {
  try {
    const { villageId } = req.query;
    const query = {};
    if (villageId && villageId !== 'all') {
      query.village = villageId;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    query.contributionDate = { $gte: thirtyDaysAgo };

    const logs = await DailyContributionLog.find(query)
      .sort({ contributionDate: -1 })
      .populate('household', 'householdCode headOfFamily')
      .populate('village', 'name');

    // Aggregate household summary for clean contribution report
    const summaryMap = {};
    logs.forEach((l) => {
      const hCode = l.household ? l.household.householdCode : 'N/A';
      if (!summaryMap[hCode]) {
        summaryMap[hCode] = {
          code: hCode,
          head: l.household ? l.household.headOfFamily : 'Unknown',
          village: l.village ? l.village.name : 'Unknown',
          dungKg: 0,
          agriKg: 0,
          kitchenKg: 0,
          totalKg: 0,
          points: 0,
          incentiveINR: 0,
          slurryLiters: 0,
          days: new Set()
        };
      }
      summaryMap[hCode].dungKg += l.dungKg;
      summaryMap[hCode].agriKg += l.agriWasteKg;
      summaryMap[hCode].kitchenKg += l.kitchenWasteKg;
      summaryMap[hCode].totalKg += l.totalKg;
      summaryMap[hCode].points += l.incentivePointsEarned;
      summaryMap[hCode].incentiveINR += l.incentiveValueINR;
      summaryMap[hCode].slurryLiters += l.slurryCreditLiters;
      summaryMap[hCode].days.add(new Date(l.contributionDate).toISOString().split('T')[0]);
    });

    const rows = Object.values(summaryMap).sort((a, b) => b.totalKg - a.totalKg);

    let csv =
      'Rank,Household Code,Head of Family,Village,Active Days (30d),Dung (kg),Agri Waste (kg),Kitchen Waste (kg),Total 30-Day Contribution (kg),Tier,Points Earned,Total Incentive Value (INR),Slurry Credit (Liters)\n';

    rows.forEach((r, idx) => {
      const tier = computeTier(r.totalKg);
      const bonus = r.days.size >= 20 ? INCENTIVE_RATES.monthlyConsistencyBonusINR : 0;
      const finalINR = Math.round(r.incentiveINR * tier.bonusMultiplier + bonus);
      csv += `${idx + 1},"${r.code}","${r.head}","${r.village}",${r.days.size},${r.dungKg.toFixed(1)},${r.agriKg.toFixed(
        1
      )},${r.kitchenKg.toFixed(1)},${r.totalKg.toFixed(1)},"${tier.name}",${Math.round(
        r.points
      )},${finalINR},${Math.round(r.slurryLiters)}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="community_contribution_incentives_${Date.now()}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getIncentiveDashboard,
  logDailyContribution,
  exportContributionReportCsv
};
