const { Octokit } = require('octokit');

const TEMPLATE_OWNER = 'Recon-Fuzz';
const TEMPLATE_REPO = 'create-chimera-app';

/**
 * Create an empty repository (fallback when template is blocked by org OAuth restrictions).
 * @param {string} accessToken - GitHub personal access token
 * @param {string} repoName - Name for the new repository
 * @param {string} [description] - Repository description
 * @returns {Promise<{owner: string, repo: string, url: string}>}
 */
async function createEmptyRepo(accessToken, repoName, description = '') {
  const octokit = new Octokit({ auth: accessToken });
  const { data } = await octokit.rest.repos.createForAuthenticatedUser({
    name: repoName,
    description: (description || 'Contract from BugChainIndexer').slice(0, 350),
    private: false,
  });
  return {
    owner: data.owner.login,
    repo: data.name,
    url: data.html_url,
  };
}

/**
 * Create a new repository with contract source. Uses empty repo (no template) to avoid org OAuth restrictions.
 * @param {string} accessToken - GitHub personal access token
 * @param {string} repoName - Name for the new repository
 * @param {string} [description] - Repository description
 * @returns {Promise<{owner: string, repo: string, url: string}>}
 */
async function createRepoFromTemplate(accessToken, repoName, description = '') {
  return createEmptyRepo(accessToken, repoName, description);
}

/**
 * Add or update a file in a GitHub repository.
 * @param {string} accessToken - GitHub personal access token
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path (e.g. src/Contract.sol)
 * @param {string} content - File content (will be base64 encoded)
 * @param {string} [message] - Commit message
 */
async function addContractFile(accessToken, owner, repo, path, content, message) {
  const octokit = new Octokit({ auth: accessToken });
  const contentBase64 = Buffer.from(content, 'utf8').toString('base64');
  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: message || `Add ${path}`,
    content: contentBase64,
  });
}

module.exports = {
  createRepoFromTemplate,
  addContractFile,
};
