const express = require("express");
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

const aiServices = require("./helpers/aiServices");
const { getPRDiff, getFileContent, postComment, emojiReaction, parseDiffByFile } = require("./helpers/githubHelper");

const app = express();
app.use(express.json());

// Endpoint สำหรับรับ Webhook จาก GitHub
app.post("/api/github-webhook", async (req, res) => {
  const comment = req.body.comment?.body;
  const repoFullName = req.body.repository?.full_name;
  const prNumber = req.body.issue?.number;
  // ตรวจสอบว่าเป็นคำสั่งที่ต้องการหรือไม่
  if (
    comment &&
    comment.trim() === "/code review" &&
    repoFullName &&
    prNumber
  ) {
    console.log(
      `ได้รับคำสั่ง /code review สำหรับ PR #${prNumber} ใน ${repoFullName}`,
    );
    
    try {
      await emojiReaction(repoFullName, req.body.comment?.id, process.env.GITHUB_TOKEN);
      
      const prUrl = `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}`;
      const prResponse = await axios.get(prUrl, {
        headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` },
      });
      const prRef = prResponse.data.head.ref;
      
      const codeDiff = await getPRDiff(repoFullName, prNumber, process.env.GITHUB_TOKEN);
      const files = parseDiffByFile(codeDiff);

      const skillPath = path.join(__dirname, "context", "skill.md");
      const skillPrompt = await fs.readFile(skillPath, "utf-8");

      for (const file of files) {
        let contentToReview = file.content;
        
        const hasActualChanges = /^[+-][^+-]/.test(file.content);
        
        if (!hasActualChanges) {
          console.log(`No diff changes for ${file.name}, fetching file content from branch ${prRef}...`);
          contentToReview = await getFileContent(repoFullName, file.name, process.env.GITHUB_TOKEN, prRef);
        }

        const finalPrompt = `${skillPrompt}\n\n---\n\nFile: ${file.name}\n\`\`\`\n${contentToReview}\n\`\`\``;
        
        let reviewResult;
        let retries = 3;
        for (let i = 0; i < retries; i++) {
          reviewResult = await aiServices.callGemini(finalPrompt);
          if (reviewResult && !reviewResult.startsWith("Error calling")) {
            break;
          }
          if (i < retries - 1) {
            const waitTime = Math.pow(2, i) * 1000;
            console.log(`Retry ${i + 1}/${retries - 1} after ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }

        if (!reviewResult || reviewResult.startsWith("Error calling")) {
          reviewResult = "⚠️ Unable to generate review due to API limitations. Please try again later.";
        }

        await postComment(
          repoFullName,
          prNumber,
          `###  File: ${file.name}\n\n${reviewResult}`,
          process.env.GITHUB_TOKEN
        );

        console.log(`Posted review for file: ${file.name}`);
      }

      console.log("Posted review results for all files");
    } catch (error) {
      console.error(
        "เกิดข้อผิดพลาดระหว่างการทำงาน:",
        error.response?.data || error.message,
      );
    }
  }

  // ตอบกลับ GitHub ทันทีเพื่อยืนยันว่าได้รับ Webhook
  res.status(200).send("OK");
});

// Export เพื่อให้ Vercel รู้จัก
module.exports = app;

// Local development server
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
