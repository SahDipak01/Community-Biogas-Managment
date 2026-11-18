const express = require('express');
const router = express.Router();
const {
  getVillageBaseline,
  runWhatIfSimulation,
  getSavedScenarios,
  saveScenario,
  deleteScenario,
  exportScenariosCsv
} = require('../controllers/simulatorController');
const { protect } = require('../middleware/authMiddleware');

router.get('/baseline', protect, getVillageBaseline);
router.post('/run', protect, runWhatIfSimulation);
router.get('/scenarios', protect, getSavedScenarios);
router.post('/scenarios', protect, saveScenario);
router.delete('/scenarios/:id', protect, deleteScenario);
router.get('/export-csv', protect, exportScenariosCsv);

module.exports = router;
