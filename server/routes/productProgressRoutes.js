const express = require('express');
const router = express.Router();
// const { protect } = require('../middleware/authMiddleware'); // COMMENTED OUT - will be uncommented when implementing
// const {
//   getProgressReports,
//   getProgressReportById,
//   createProgressReport,
//   updateProgressReport,
//   deleteProgressReport
// } = require('../controllers/productProgressController'); // DELETED - Controller not implemented in Prisma yet
// const {
//   uploadProgressPhoto,
//   getProgressPhotos,
//   deleteProgressPhoto
// } = require('../controllers/photoUploadController'); // DELETED - Controller not implemented in Prisma yet

// Temporary 501 responses for all routes until Prisma implementation
const notImplemented = (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
};

// Authentication middleware will be applied when implementing
// router.use(protect);

// Progress report routes
router.get('/', notImplemented);
router.get('/:id', notImplemented);
router.post('/', notImplemented);
router.put('/:id', notImplemented);
router.delete('/:id', notImplemented);

// Photo upload routes
router.post('/:reportId/photos', notImplemented);
router.get('/:reportId/photos', notImplemented);
router.delete('/photos/:photoId', notImplemented);

module.exports = router; 