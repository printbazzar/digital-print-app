// Print Bazzar - Automated GitHub Repository Sync Engine
// Zero-dependency native sync script using GitHub Git Data REST API
const fs = require('fs');
const path = require('path');

const REPO_OWNER = 'printbazzar';
const REPO_NAME = 'digital-print-app';
const BRANCH = 'main';

// Helper to load .env without external packages
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        val = val.trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const IGNORE_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  '.system_generated',
  '.gemini',
  'scratch',
]);

const IGNORE_FILES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.DS_Store',
]);

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.has(file)) {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (!IGNORE_FILES.has(file) && !file.endsWith('.log')) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

async function githubRequest(endpoint, method = 'GET', body = null) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}${endpoint}`;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'PrintBazzar-Sync-Agent',
    Authorization: `token ${GITHUB_TOKEN}`,
  };

  const options = { method, headers };
  if (body) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `GitHub API error: ${res.status}`);
  }
  return data;
}

async function syncToGitHub(commitMessage = 'Automated update from Print Bazzar AI Agent') {
  if (!GITHUB_TOKEN) {
    console.log('\n❌ GITHUB_TOKEN is not configured in .env yet.');
    console.log('----------------------------------------------------');
    console.log('To enable 100% automatic GitHub commits:');
    console.log('1. Go to: https://github.com/settings/tokens?type=beta (or classic tokens)');
    console.log('2. Generate a token with "repo" write permission.');
    console.log('3. Add to your .env file: GITHUB_TOKEN=ghp_yourTokenHere');
    console.log('----------------------------------------------------\n');
    process.exit(1);
  }

  console.log(`🚀 Connecting to GitHub: ${REPO_OWNER}/${REPO_NAME} (branch: ${BRANCH})...`);

  // 1. Get latest commit SHA on main
  console.log('1️⃣ Fetching latest main branch ref...');
  const refData = await githubRequest(`/git/ref/heads/${BRANCH}`);
  const latestCommitSha = refData.object.sha;

  // 2. Get latest commit details to get tree SHA
  const commitData = await githubRequest(`/git/commits/${latestCommitSha}`);
  const baseTreeSha = commitData.tree.sha;

  // 3. Scan all files to upload
  const rootDir = process.cwd();
  const allFiles = getAllFiles(rootDir);
  console.log(`2️⃣ Processing ${allFiles.length} files...`);

  // 4. Create blobs for files in batch
  const treeItems = [];
  for (const filePath of allFiles) {
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath);
    const isBinary = content.includes(0);

    let blob;
    if (isBinary) {
      blob = await githubRequest('/git/blobs', 'POST', {
        content: content.toString('base64'),
        encoding: 'base64',
      });
    } else {
      blob = await githubRequest('/git/blobs', 'POST', {
        content: content.toString('utf-8'),
        encoding: 'utf-8',
      });
    }

    treeItems.push({
      path: relPath,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    });
  }

  // 5. Create new tree
  console.log('3️⃣ Creating tree on GitHub...');
  const newTree = await githubRequest('/git/trees', 'POST', {
    base_tree: baseTreeSha,
    tree: treeItems,
  });

  // 6. Create new commit
  console.log('4️⃣ Creating commit...');
  const newCommit = await githubRequest('/git/commits', 'POST', {
    message: commitMessage,
    tree: newTree.sha,
    parents: [latestCommitSha],
  });

  // 7. Update main branch ref
  console.log('5️⃣ Updating main branch reference...');
  await githubRequest(`/git/refs/heads/${BRANCH}`, 'PATCH', {
    sha: newCommit.sha,
    force: true,
  });

  console.log('\n🎉 SUCCESS! All changes committed and pushed to GitHub main branch!');
  console.log(`🔗 Commit URL: https://github.com/${REPO_OWNER}/${REPO_NAME}/commit/${newCommit.sha}`);
  console.log('⚡ Vercel will automatically build and deploy the changes live in 30 seconds!');
}

const customMessage = process.argv.slice(2).join(' ') || undefined;
syncToGitHub(customMessage).catch((err) => {
  console.error('❌ Sync failed:', err.message);
  process.exit(1);
});
