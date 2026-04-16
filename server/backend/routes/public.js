const { Router } = require('express');
const ctrl = require('../controllers/address.controller');
const bookmarkCtrl = require('../controllers/bookmark.controller');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// Bookmarks
router.get('/bookmarks', bookmarkCtrl.getBookmarks);
router.post('/bookmarks', bookmarkCtrl.addBookmark);
router.delete('/bookmarks/:network/:address', bookmarkCtrl.removeBookmark);

// Endpoints
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
