const { Router } = require('express');
const ctrl = require('../controllers/address.controller');
const bookmarkCtrl = require('../controllers/bookmark.controller');

const router = Router();

// Bookmarks
router.get('/bookmarks', bookmarkCtrl.getBookmarks);
router.post('/bookmarks', bookmarkCtrl.addBookmark);
router.delete('/bookmarks/:network/:address', bookmarkCtrl.removeBookmark);

// Endpoints
router.get('/contract/:network/:address/reports', ctrl.getContractReports);
router.post('/contract/:network/:address/audit/start', ctrl.startAudit);
router.post('/contract/:network/:address/audit/import', ctrl.importEvmbenchJob);
router.post('/contract/:network/:address/audit/manual', ctrl.saveManualAuditReport);
router.post('/contract/:network/:address/recon/manual', ctrl.saveManualReconReport);
router.get('/contract/:network/:address', ctrl.getContract);
router.get('/getAddressesByFilter', ctrl.getAddressesByFilter);
router.get('/getContractCount', ctrl.getContractCount);
router.get('/getVerifiedContractStats', ctrl.getVerifiedContractStats);
router.get('/networkCounts', ctrl.getNetworkCounts);
router.get('/nativePrices', ctrl.getNativePrices);
router.post('/searchByCode', ctrl.searchByCode);
router.get('/searchByCode', ctrl.searchByCode);
router.post('/addContract', ctrl.addContract);

module.exports = router;
