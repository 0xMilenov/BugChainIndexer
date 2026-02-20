const bookmarkService = require('../services/bookmark.service');

exports.getBookmarks = async (req, res) => {
  try {
    const bookmarks = await bookmarkService.getBookmarks();
    res.json({ ok: true, bookmarks });
  } catch (err) {
    console.error('getBookmarks failed:', err?.message || err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
};

exports.addBookmark = async (req, res) => {
  try {
    const body = req.body || {};
    const address = (body.address || '').trim();
    const network = (body.network || '').trim();
    const contractName = (body.contract_name || body.contractName || '').trim() || undefined;

    const result = await bookmarkService.addBookmark(address, network, contractName);
    if (!result.ok) {
      return res.status(400).json({ ok: false, error: result.error });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('addBookmark failed:', err?.message || err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
};

exports.removeBookmark = async (req, res) => {
  try {
    const network = req.params?.network || req.query?.network;
    const address = req.params?.address || req.query?.address;
    if (!address || !network) {
      return res.status(400).json({ ok: false, error: 'address and network are required' });
    }
    await bookmarkService.removeBookmark(address, network);
    res.json({ ok: true });
  } catch (err) {
    console.error('removeBookmark failed:', err?.message || err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
};
