const axios = require("axios");

async function getPRDiff(repoFullName, prNumber, githubToken) {
  const prUrl = `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}`;
  const prResponse = await axios.get(prUrl, {
    headers: { Authorization: `token ${githubToken}` },
  });
  const diffUrl = prResponse.data.diff_url;
  const diffResponse = await axios.get(diffUrl);
  return diffResponse.data;
}

async function getFileContent(repoFullName, filePath, githubToken, ref) {
  const url = `https://api.github.com/repos/${repoFullName}/contents/${filePath}${ref ? `?ref=${ref}` : ''}`;
  const response = await axios.get(url, {
    headers: { Authorization: `token ${githubToken}` },
  });
  return Buffer.from(response.data.content, "base64").toString("utf-8");
}

async function postComment(repoFullName, prNumber, body, githubToken) {
  const commentUrl = `https://api.github.com/repos/${repoFullName}/issues/${prNumber}/comments`;
  await axios.post(
    commentUrl,
    { body },
    { headers: { Authorization: `token ${githubToken}` } },
  );
}

async function emojiReaction(repoFullName, prNumber, githubToken) {
  const commentUrl = `https://api.github.com/repos/${repoFullName}/issues/comments/${prNumber}/reactions`;
  await axios.post(
    commentUrl,
    { content: "eyes" },
    {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github+json",
      },
    },
  );
}

function parseDiffByFile(diff) {
  const files = [];
  const fileRegex = /^diff --git a\/(.+?) b\/(.+)$/gm;
  let match;
  let currentFile = null;
  let currentContent = "";

  while ((match = fileRegex.exec(diff)) !== null) {
    if (currentFile) {
      files.push({ name: currentFile, content: currentContent.trim() });
    }
    currentFile = match[1];
    currentContent = diff.slice(match.index, match.index + match[0].length) + "\n";
  }

  if (currentFile) {
    files.push({ name: currentFile, content: currentContent.trim() });
  }

  return files;
}

module.exports = { getPRDiff, getFileContent, postComment, emojiReaction, parseDiffByFile };
