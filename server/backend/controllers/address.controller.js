const service = require('../services/address.service');
const addContractService = require('../services/addContract.service');
const { parseNumber, parseStringArray, parseBool, decodeCursor } = require('../utils/parsers');

exports.getVerifiedContractStats = async (req, res) => {
  try {
    const byNetwork = req.query?.byNetwork === '1' || req.query?.byNetwork === 'true';
    const result = await service.getVerifiedContractStats(byNetwork);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('getVerifiedContractStats failed:', err?.message || err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

exports.getContractCount = async (req, res) => {
  try{
    const result = await service.getContractCount();
    res.json(result)
  }catch(err){
    res.status(401).json({error: err.message})
  }
}

// Number/array parsing helpers remain the same as existing implementation
// parseNumber, parseStringArray, decodeCursor ...

exports.getAddressesByFilter = async (req, res) => {
  try {
    const q = { ...req.query, ...req.body };

    // Pagination parameters
    const MAX_LIMIT = 200;
    const limit = Math.min(Math.max(parseNumber(q.limit) ?? 50, 1), MAX_LIMIT);
    const cursor = decodeCursor(q.cursor); // { deployed, fund, address } or null

    // Whether to include total count/pages (default false)
    const includeTotal = parseBool(q.includeTotal);

    const filters = {
      // Range filters
      deployedFrom: parseNumber(q.deployedFrom), // deployed >= deployedFrom
      deployedTo:   parseNumber(q.deployedTo),   // deployed  < deployedTo
      fundFrom:     parseNumber(q.fundFrom),     // fund     >= fundFrom
      fundTo:       parseNumber(q.fundTo),       // fund      < fundTo

      // Array filters (normalize to lowercase - DB stores network lowercase)
      networks: parseStringArray(q.networks).map(n => n.toLowerCase()),
      tags:     parseStringArray(q.tags),        // tags && $tags

      // Partial/exact match filters
      address:      q.address ? String(q.address).trim() : null,           // address ILIKE %address%
      contractName: q.contractName ? String(q.contractName).trim() : null, // contract_name ILIKE %contractName%

      // Sorting
      sortBy: q.sortBy && ['fund', 'first_seen'].includes(q.sortBy) ? q.sortBy : 'fund',

      // Hide unnamed/duplicate contracts
      hideUnnamed: parseBool(q.hideUnnamed),

      // Cursor pagination
      limit,
      cursor,

      // Whether to calculate total count (service performs COUNT based on this value)
      includeTotal,
    };

    // Service call (keyset version; COUNT executed only when includeTotal=true)
    const result = await service.getAddressesByFilter(filters);
    const { data = [], nextCursor = null, totalCount = null, totalPages = null } = result || {};

    // Default response returns only hasNext
    const response = {
      limit,
      hasNext: !!nextCursor,
      nextCursor,  // Frontend encodes this object as base64 and sends as cursor for next request
      data,
    };

    // Include total information if includeTotal=true
    if (includeTotal) {
      response.totalCount = totalCount;
      response.totalPages = totalPages;
    }

    res.json(response);
  } catch (err) {
    console.error('getAddressesByFilter handler failed:', err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
};


// getAddress / getBridge removed


exports.getNetworkCounts = async (req, res) => {
  try {
    const refresh = req.query?.refresh === '1' || req.query?.refresh === 'true';
    const map = await service.getNetworkCounts(refresh);
    res.json({ ok: true, networks: map });
  } catch (err) {
    console.error('getNetworkCounts failed:', err?.message || err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
}

exports.getNativePrices = async (req, res) => {
  try {
    const prices = await service.getNativePrices();
    res.json({ ok: true, prices });
  } catch (err) {
    console.error('getNativePrices failed:', err?.message || err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
};

exports.getContract = async (req, res) => {
  try {
    const network = req.params?.network || req.query?.network;
    const address = req.params?.address || req.query?.address;
    if (!address || !network) {
      return res.status(400).json({ ok: false, error: 'address and network are required' });
    }
    const contract = await service.getContractByAddress(address, network);
    if (!contract) {
      return res.status(404).json({ ok: false, error: 'Contract not found' });
    }
    res.json({ ok: true, contract });
  } catch (err) {
    console.error('getContract failed:', err?.message || err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
};

exports.getContractAudit = async (req, res) => {
  try {
    const network = req.params?.network || req.query?.network;
    const address = req.params?.address || req.query?.address;
    if (!address || !network) {
      return res.status(400).json({ ok: false, error: 'address and network are required' });
    }
    const audit = await service.getContractAuditByAddress(address, network);
    if (!audit) {
      return res.status(404).json({ ok: false, error: 'No completed audit for this contract' });
    }
    res.json({ ok: true, audit });
  } catch (err) {
    console.error('getContractAudit failed:', err?.message || err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
};

exports.searchByCode = async (req, res) => {
  try {
    const body = req.body || {};
    const q = { ...req.query, ...body };
    const opts = {
      codeSnippet: q.codeSnippet || q.code || '',
      limit: parseNumber(q.limit) ?? 50,
      networks: parseStringArray(q.networks)
    };
    const result = await service.searchByCode(opts);
    if (result.error) {
      return res.status(400).json({ ok: false, error: result.error });
    }
    res.json({ ok: true, matches: result.matches });
  } catch (err) {
    console.error('searchByCode failed:', err?.message || err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
};

exports.addContract = async (req, res) => {
  try {
    const body = req.body || {};
    const address = (body.address || '').trim();
    const network = (body.network || '').trim();
    if (!address || !network) {
      return res.status(400).json({ ok: false, error: 'address and network are required' });
    }
    const result = await addContractService.addContract(address, network);
    if (!result.ok) {
      const clientErrors = [
        'Invalid contract address',
        'Unsupported network',
        'Address is not a smart contract (EOA)',
        'Contract is not verified',
        'Contract is not verified / missing source code',
      ];
      const status = clientErrors.includes(result.error) ? 400 : 500;
      return res.status(status).json({ ok: false, error: result.error });
    }
    res.json({ ok: true, contract: result.contract });
  } catch (err) {
    console.error('addContract failed:', err?.message || err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
};
