const EmergencyIncident = require('../models/EmergencyIncident');
const BiogasPlant = require('../models/BiogasPlant');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

// @desc    Get emergency safety incidents
// @route   GET /api/emergencies
// @access  Private
const getIncidents = async (req, res, next) => {
  try {
    const { status, villageId } = req.query;
    const query = {};

    if (req.user.role === 'coordinator' && req.user.village) {
      query.village = req.user.village._id || req.user.village;
    } else if (villageId && villageId !== 'all') {
      query.village = villageId;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const incidents = await EmergencyIncident.find(query)
      .populate('biogasPlant', 'plantName plantCode capacityM3')
      .populate('village', 'name district state')
      .populate('reportedBy', 'name role email contactPhone')
      .populate('resolvedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(50);

    const activeCount = incidents.filter((i) =>
      ['Active Emergency', 'First Responders On Site'].includes(i.status)
    ).length;

    res.json({
      success: true,
      count: incidents.length,
      activeEmergencyCount: activeCount,
      data: incidents
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger an emergency safety alert (Gas Leakage, Rupture, Fire Hazard)
// @route   POST /api/emergencies
// @access  Private
const reportEmergency = async (req, res, next) => {
  try {
    const {
      biogasPlantId,
      villageId,
      incidentType,
      severity,
      locationDescription,
      details,
      immediateActionsTaken
    } = req.body;

    let targetPlant = null;
    if (biogasPlantId) {
      targetPlant = await BiogasPlant.findById(biogasPlantId);
    } else {
      const vid = villageId || (req.user.village?._id || req.user.village);
      targetPlant = await BiogasPlant.findOne({ village: vid });
    }

    const vid = targetPlant?.village || villageId || (req.user.village?._id || req.user.village);
    if (!vid) {
      return res.status(400).json({ success: false, message: 'Village association is required' });
    }

    const count = await EmergencyIncident.countDocuments();
    const incidentNumber = `EMG-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const incident = await EmergencyIncident.create({
      incidentNumber,
      biogasPlant: targetPlant?._id || null,
      village: vid,
      reportedBy: req.user._id,
      incidentType: incidentType || 'Suspected Gas Leakage',
      severity: severity || 'Critical Emergency',
      locationDescription: locationDescription || 'Village Biogas Network',
      details,
      immediateActionsTaken: immediateActionsTaken || [
        'Evacuate immediate proximity',
        'Extinguish any open flames',
        'Turn off pipeline main valve'
      ],
      techniciansContacted: true,
      status: 'Active Emergency',
      broadcastSent: true
    });

    // Mark plant as critical breakdown if applicable
    if (targetPlant) {
      targetPlant.operationalStatus = 'Maintenance / Breakdown';
      await targetPlant.save();
    }

    // High priority system-wide emergency broadcast
    await Notification.create({
      recipient: null,
      title: `EMERGENCY ALERT: ${incident.incidentType}`,
      message: `CRITICAL SAFETY ALERT in ${locationDescription}: ${details}. Follow emergency evacuation protocols. Avoid sparks/flames.`,
      type: 'emergency',
      category: 'emergency',
      village: vid
    });

    await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'EMERGENCY_INCIDENT_TRIGGERED',
      entityType: 'EmergencyIncident',
      entityId: incident._id.toString(),
      summary: `TRIGGERED EMERGENCY ${incidentNumber}: ${incident.incidentType} (${incident.severity})`,
      metadata: { incidentNumber, severity, locationDescription }
    });

    res.status(201).json({
      success: true,
      message: 'EMERGENCY BROADCAST TRANSMITTED. Technicians and Village Coordinator alerted.',
      safetyChecklist: [
        'Move away from the suspected leak area immediately.',
        'DO NOT operate electrical switches, phones, or machinery near the gas.',
        'DO NOT light matches or introduce any flame or spark source.',
        'If safe, isolate the manual emergency shutoff valve.',
        'Stay upwind and keep children and livestock away.'
      ],
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update emergency incident status (Containment, All-Clear)
// @route   PUT /api/emergencies/:id/status
// @access  Private (Coordinator, Admin)
const updateEmergencyStatus = async (req, res, next) => {
  try {
    const { status, details } = req.body;
    const incident = await EmergencyIncident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Emergency record not found' });
    }

    incident.status = status;
    if (status === 'Threat Contained' || status === 'All Clear & Resolved') {
      incident.containedAt = new Date();
      incident.resolvedBy = req.user._id;

      await Notification.create({
        recipient: null,
        title: `SAFETY UPDATE: ${status}`,
        message: `Emergency situation (${incident.incidentNumber}) is now ${status}. Technical inspection complete.`,
        type: 'info',
        category: 'emergency',
        village: incident.village
      });
    }

    await incident.save();

    await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'EMERGENCY_STATUS_UPDATED',
      entityType: 'EmergencyIncident',
      entityId: incident._id.toString(),
      summary: `Updated emergency ${incident.incidentNumber} to ${status}`,
      metadata: { status }
    });

    res.json({
      success: true,
      message: `Emergency status updated to ${status}`,
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getIncidents,
  reportEmergency,
  updateEmergencyStatus
};
