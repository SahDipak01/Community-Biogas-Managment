const mongoose = require('mongoose');
const PlantMonitoring = require('../models/PlantMonitoring');
const BiogasPlant = require('../models/BiogasPlant');
const Notification = require('../models/Notification');
const { evaluatePlantAlerts } = require('../utils/alertEngine');
const { validateNumberInRange, collectErrors } = require('../utils/validators');
const { logAuditEvent } = require('../utils/auditLogger');

// @desc    Get monitoring records for a plant or village
// @route   GET /api/monitoring
// @access  Private
const getMonitoringRecords = async (req, res, next) => {
  try {
    const { plantId, readingType, page = 1, limit = 20 } = req.query;

    const query = {};
    if (plantId && plantId !== 'all') {
      query.plant = mongoose.Types.ObjectId.isValid(plantId)
        ? new mongoose.Types.ObjectId(plantId)
        : plantId;
    }

    if (readingType && readingType !== 'all') {
      query.readingType = readingType;
    }

    const total = await PlantMonitoring.countDocuments(query);
    const records = await PlantMonitoring.find(query)
      .sort({ date: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('plant', 'plantName plantCode capacityM3 village status location')
      .populate('recordedBy', 'name role');

    // Aggregate average health indicators
    const averages = await PlantMonitoring.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          avgTemp: { $avg: '$temperatureC' },
          avgPh: { $avg: '$phLevel' },
          avgGas: { $avg: '$gasProducedM3' },
          avgSlurry: { $avg: '$slurryProducedLiters' },
          totalFeedstock: { $sum: '$feedstockInputKg' }
        }
      }
    ]);

    res.json({
      success: true,
      count: records.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      averages: averages[0] || {
        avgTemp: 32,
        avgPh: 7.2,
        avgGas: 2.1,
        avgSlurry: 48,
        totalFeedstock: 1200
      },
      data: records
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record new operational monitoring reading
// @route   POST /api/monitoring
// @access  Private
const recordPlantMonitoring = async (req, res, next) => {
  try {
    const {
      plantId,
      date,
      feedstockInputKg,
      waterAddedLiters,
      gasProducedM3,
      temperatureC,
      phLevel,
      slurryProducedLiters,
      pressureKPa,
      readingType = 'manual',
      notes
    } = req.body;

    const plant = await BiogasPlant.findById(plantId);
    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Biogas plant not found'
      });
    }

    const errors = collectErrors([
      validateNumberInRange(feedstockInputKg, 'Feedstock input (kg)', 0, 100000, { required: true }),
      validateNumberInRange(waterAddedLiters, 'Water added (liters)', 0, 200000),
      validateNumberInRange(gasProducedM3, 'Gas produced (m3)', 0, 5000, { required: true }),
      validateNumberInRange(temperatureC, 'Digester temperature (°C)', -5, 70, { required: true }),
      validateNumberInRange(phLevel, 'Slurry pH level', 0, 14, { required: true }),
      validateNumberInRange(pressureKPa, 'Gas pressure (kPa)', 0, 50),
      validateNumberInRange(slurryProducedLiters, 'Slurry produced (liters)', 0, 200000)
    ]);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors
      });
    }

    // Evaluate alerts using biochemistry engine
    const evaluation = evaluatePlantAlerts(plant, {
      feedstockInputKg: Number(feedstockInputKg) || 0,
      gasProducedM3: Number(gasProducedM3) || 0,
      temperatureC: Number(temperatureC),
      phLevel: Number(phLevel),
      slurryProducedLiters: Number(slurryProducedLiters) || 0,
      pressureKPa: Number(pressureKPa) || 2.5
    });

    const monitoringRecord = await PlantMonitoring.create({
      plant: plantId,
      date: date || Date.now(),
      feedstockInputKg: Number(feedstockInputKg),
      waterAddedLiters: waterAddedLiters !== undefined && waterAddedLiters !== '' ? Number(waterAddedLiters) : Number(feedstockInputKg),
      gasProducedM3: Number(gasProducedM3),
      temperatureC: Number(temperatureC),
      phLevel: Number(phLevel),
      slurryProducedLiters:
        slurryProducedLiters !== undefined && slurryProducedLiters !== ''
          ? Number(slurryProducedLiters)
          : Math.round(Number(feedstockInputKg) * 0.95),
      pressureKPa: pressureKPa !== undefined && pressureKPa !== '' ? Number(pressureKPa) : 2.5,
      operationalStatus: evaluation.overallStatus,
      readingType: readingType === 'simulated' ? 'simulated' : 'manual',
      alerts: evaluation.alerts,
      recordedBy: req.user.id,
      notes: notes || ''
    });

    // If alerts detected, create system notifications
    if (evaluation.alerts.length > 0) {
      for (const alert of evaluation.alerts) {
        await Notification.create({
          targetRole: 'all',
          village: plant.village,
          plant: plant._id,
          type: alert.severity === 'critical' ? 'alert' : 'warning',
          category: 'PLANT_ANOMALY',
          title: `[${alert.alertType}] Plant: ${plant.plantName}`,
          message: alert.message
        });
      }
    }

    await logAuditEvent(req, {
      action: 'RECORD_PLANT_MONITORING',
      entityType: 'PlantMonitoring',
      entityId: monitoringRecord._id,
      summary: `Logged ${monitoringRecord.readingType} reading for ${plant.plantName}: ${monitoringRecord.gasProducedM3} m3, ${monitoringRecord.temperatureC}°C, pH ${monitoringRecord.phLevel}`,
      metadata: {
        plantId: String(plant._id),
        operationalStatus: evaluation.overallStatus,
        alertsTriggered: evaluation.alerts.length
      }
    });

    res.status(201).json({
      success: true,
      data: monitoringRecord,
      alertsTriggered: evaluation.alerts.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active plant anomaly alerts
// @route   GET /api/monitoring/alerts
// @access  Private
const getActiveAlerts = async (req, res, next) => {
  try {
    const records = await PlantMonitoring.find({
      'alerts.0': { $exists: true }
    })
      .sort({ date: -1 })
      .limit(30)
      .populate('plant', 'plantName plantCode capacityM3 village status');

    const formattedAlerts = [];
    records.forEach(r => {
      r.alerts.forEach(a => {
        formattedAlerts.push({
          id: a._id,
          plantId: r.plant ? r.plant._id : null,
          plantName: r.plant ? r.plant.plantName : 'General Plant',
          plantCode: r.plant ? r.plant.plantCode : 'BG-00',
          capacityM3: r.plant ? r.plant.capacityM3 : 2,
          date: r.date,
          readingType: r.readingType,
          alertType: a.alertType,
          severity: a.severity,
          message: a.message,
          resolved: a.resolved
        });
      });
    });

    res.json({
      success: true,
      count: formattedAlerts.length,
      data: formattedAlerts
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMonitoringRecords,
  recordPlantMonitoring,
  getActiveAlerts
};
