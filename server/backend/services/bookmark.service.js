const { pool } = require('./db');

const MAX_BOOKMARKS = 50;

/**
 * Get all bookmarks.
 * @returns {Promise<Array<{address: string, network: string, contract_name?: string}>>}
 */
async function getBookmarks() {
  const { rows } = await pool.query(`
    SELECT address, network, contract_name
    FROM contract_bookmarks
    ORDER BY created_at DESC
    LIMIT $1
  `, [MAX_BOOKMARKS]);
  return rows.map((r) => ({
    address: r.address,
    network: r.network,
    contract_name: r.contract_name || undefined,
  }));
}

/**
 * Add a bookmark.
 * @param {string} address
 * @param {string} network
 * @param {string} [contractName]
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function addBookmark(address, network, contractName) {
  const addr = String(address || '').trim().toLowerCase();
  const net = String(network || '').trim().toLowerCase();
  if (!addr || !net) {
    return { ok: false, error: 'address and network are required' };
  }
  if (!/^0x[0-9a-f]{40}$/i.test(addr)) {
    return { ok: false, error: 'Invalid contract address' };
  }

  const { rowCount } = await pool.query(`
    INSERT INTO contract_bookmarks (address, network, contract_name)
    VALUES ($1, $2, $3)
    ON CONFLICT (address, network) DO UPDATE SET contract_name = EXCLUDED.contract_name
  `, [addr, net, contractName || null]);

  return { ok: true };
}

/**
 * Remove a bookmark.
 * @param {string} address
 * @param {string} network
 * @returns {Promise<{ok: boolean}>}
 */
async function removeBookmark(address, network) {
  const addr = String(address || '').trim().toLowerCase();
  const net = String(network || '').trim().toLowerCase();
  await pool.query(`
    DELETE FROM contract_bookmarks
    WHERE address = $1 AND network = $2
  `, [addr, net]);
  return { ok: true };
}

module.exports = {
  getBookmarks,
  addBookmark,
  removeBookmark,
};
