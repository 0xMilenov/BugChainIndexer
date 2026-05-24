const { pool } = require('./db');

const MAX_BOOKMARKS = 50;

/**
 * Get all bookmarks for a user.
 * @param {string} userId
 * @returns {Promise<Array<{address: string, network: string, contract_name?: string}>>}
 */
async function getBookmarks(userId) {
  const { rows } = await pool.query(`
    SELECT address, network, contract_name
    FROM contract_bookmarks
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `, [userId, MAX_BOOKMARKS]);
  return rows.map((r) => ({
    address: r.address,
    network: r.network,
    contract_name: r.contract_name || undefined,
  }));
}

/**
 * Add a bookmark.
 * @param {string} userId
 * @param {string} address
 * @param {string} network
 * @param {string} [contractName]
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function addBookmark(userId, address, network, contractName) {
  const addr = String(address || '').trim().toLowerCase();
  const net = String(network || '').trim().toLowerCase();
  const uid = String(userId || '').trim().toLowerCase();
  if (!uid || !addr || !net) {
    return { ok: false, error: 'address and network are required' };
  }
  if (!/^0x[0-9a-f]{40}$/i.test(addr)) {
    return { ok: false, error: 'Invalid contract address' };
  }

  await pool.query(`
    INSERT INTO contract_bookmarks (user_id, address, network, contract_name)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, address, network) DO UPDATE SET contract_name = EXCLUDED.contract_name
  `, [uid, addr, net, contractName || null]);

  return { ok: true };
}

/**
 * Remove a bookmark.
 * @param {string} userId
 * @param {string} address
 * @param {string} network
 * @returns {Promise<{ok: boolean}>}
 */
async function removeBookmark(userId, address, network) {
  const addr = String(address || '').trim().toLowerCase();
  const net = String(network || '').trim().toLowerCase();
  const uid = String(userId || '').trim().toLowerCase();
  await pool.query(`
    DELETE FROM contract_bookmarks
    WHERE user_id = $1 AND address = $2 AND network = $3
  `, [uid, addr, net]);
  return { ok: true };
}

module.exports = {
  getBookmarks,
  addBookmark,
  removeBookmark,
};
