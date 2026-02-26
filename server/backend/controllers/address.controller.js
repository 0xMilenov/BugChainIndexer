const service = require('../services/address.service');
const addContractService = require('../services/addContract.service');
const authService = require('../services/auth.service');
const githubService = require('../services/github.service');
const { parseNumber, parseStringArray, parseBool, decodeCursor } = require('../utils/parsers');

function sanitizeRepoName(s) {
  return String(s || '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 80) || 'contract';
}

function sanitizeSolFileName(s) {
  let name = String(s || 'contract').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_') || 'Contract';
  if (!name.endsWith('.sol')) name += '.sol';
  return name;
}

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

exports.getContractReports = async (req, res) => {
  try {
    const network = req.params?.network || req.query?.network;
    const address = req.params?.address || req.query?.address;
    if (!address || !network) {
      return res.status(400).json({ ok: false, error: 'address and network are required' });
    }
    const { auditReport, fuzzReport, evmbenchJob } = await service.getContractReports(address, network);
    res.json({ ok: true, auditReport, fuzzReport, evmbenchJob: evmbenchJob || undefined });
  } catch (err) {
    console.error('getContractReports failed:', err?.message || err);
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

exports.startAudit = async (req, res) => {
  try {
    const network = req.params?.network || req.query?.network;
    const address = req.params?.address || req.query?.address;
    if (!address || !network) {
      return res.status(400).json({ ok: false, error: 'address and network are required' });
    }
    const body = req.body || {};
    const openaiKey = body.openai_key || body.openaiKey;
    const model = body.model || 'codex-gpt-5.2';

    const result = await service.startAudit(address, network, openaiKey, model);
    if (!result.ok) {
      const status = result.error === 'Contract not found' ? 404 : 400;
      return res.status(status).json({ ok: false, error: result.error });
    }
    res.json({ ok: true, auditReport: result.auditReport });
  } catch (err) {
    console.error('startAudit failed:', err?.message || err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
};

exports.importEvmbenchJob = async (req, res) => {
  try {
    const network = req.params?.network || req.query?.network;
    const address = req.params?.address || req.query?.address;
    if (!address || !network) {
      return res.status(400).json({ ok: false, error: 'address and network are required' });
    }
    const evmbenchJobId = (req.body?.evmbench_job_id ?? req.body?.evmbenchJobId ?? '').trim();
    if (!evmbenchJobId) {
      return res.status(400).json({ ok: false, error: 'evmbench_job_id is required' });
    }

    const result = await service.importEvmbenchJob(address, network, evmbenchJobId);
    if (!result.ok) {
      const status = result.error === 'Contract not found' ? 404 : 400;
      return res.status(status).json({ ok: false, error: result.error });
    }
    res.json({ ok: true, auditReport: result.auditReport });
  } catch (err) {
    console.error('importEvmbenchJob failed:', err?.message || err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
};

exports.saveManualAuditReport = async (req, res) => {
  try {
    const network = req.params?.network || req.query?.network;
    const address = req.params?.address || req.query?.address;
    if (!address || !network) {
      return res.status(400).json({ ok: false, error: 'address and network are required' });
    }
    const markdown = (req.body?.markdown ?? '').trim();
    if (!markdown) {
      return res.status(400).json({ ok: false, error: 'Markdown content is required' });
    }

    const result = await service.saveManualAuditReport(address, network, markdown);
    if (!result.ok) {
      const status = result.error === 'Contract not found' ? 404 : 400;
      return res.status(status).json({ ok: false, error: result.error });
    }
    res.json({ ok: true, auditReport: result.auditReport });
  } catch (err) {
    console.error('saveManualAuditReport failed:', err?.message || err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
};

exports.saveManualReconReport = async (req, res) => {
  try {
    const network = req.params?.network || req.query?.network;
    const address = req.params?.address || req.query?.address;
    if (!address || !network) {
      return res.status(400).json({ ok: false, error: 'address and network are required' });
    }
    const markdown = (req.body?.markdown ?? '').trim();
    if (!markdown) {
      return res.status(400).json({ ok: false, error: 'Markdown content is required' });
    }

    const result = await service.saveManualReconReport(address, network, markdown);
    if (!result.ok) {
      const status = result.error === 'Contract not found' ? 404 : 400;
      return res.status(status).json({ ok: false, error: result.error });
    }
    res.json({ ok: true, fuzzReport: result.fuzzReport });
  } catch (err) {
    console.error('saveManualReconReport failed:', err?.message || err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
};

exports.scaffoldRecon = async (req, res) => {
  try {
    const network = req.params?.network || req.query?.network;
    const address = req.params?.address || req.query?.address;
    if (!address || !network) {
      return res.status(400).json({ ok: false, error: 'address and network are required' });
    }
    const user = req.user;
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const accessToken = await authService.getGitHubToken(user.user_id);
    if (!accessToken) {
      return res.status(401).json({ ok: false, error: 'Re-authenticate required. Please sign out and sign in again with GitHub.' });
    }

    const contract = await service.getContractByAddress(address, network);
    if (!contract) {
      return res.status(404).json({ ok: false, error: 'Contract not found' });
    }
    if (!contract.source_code || !contract.source_code.trim()) {
      return res.status(400).json({ ok: false, error: 'No source code available for this contract' });
    }

    const contractName = contract.contract_name || contract.contract_file_name || 'Contract';
    const addressSlice = address.slice(2, 10).toLowerCase();
    const repoName = sanitizeRepoName(`${contractName}-${addressSlice}-recon`);
    const solFileName = sanitizeSolFileName(contract.contract_file_name || contractName);
    const filePath = `src/${solFileName}`;

    const { owner, repo, url } = await githubService.createRepoFromTemplate(
      accessToken,
      repoName,
      `Contract ${contractName} (${address}) from BugChainIndexer`
    );

    await githubService.addContractFile(
      accessToken,
      owner,
      repo,
      filePath,
      contract.source_code,
      `Add contract ${solFileName} from BugChainIndexer`
    );

    await service.setGetReconUrl(address, network, url);

    res.json({ ok: true, repoUrl: url });
  } catch (err) {
    console.error('scaffoldRecon failed:', err?.message || err);
    const msg = err?.response?.data?.message || err?.message || 'Internal Server Error';
    const status = err?.response?.status === 422 ? 422 : 500;
    res.status(status).json({ ok: false, error: msg });
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
