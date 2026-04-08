const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());

// ฟังก์ชันสำหรับเรียก GLM API
async function callGLM(prompt) {
  try {
    const response = await axios.post('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      model: "glm-4.7",
      messages: [{ role: "user", content: prompt }],
    }, {
      headers: { 'Authorization': `Bearer ${process.env.GLM_API_KEY}` }
    });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling GLM API:", error.response?.data || error.message);
    return "เกิดข้อผิดพลาดในการเรียกใช้ GLM API ครับ 😥";
  }
}

// Endpoint สำหรับรับ Webhook จาก GitHub
app.post('/api/github-webhook', async (req, res) => {
  const comment = req.body.comment?.body;
  const repoFullName = req.body.repository?.full_name;
  const prNumber = req.body.issue?.number; // In a PR, the "issue" is the PR itself

  // ตรวจสอบว่าเป็นคำสั่งที่ต้องการหรือไม่
  if (comment && comment.trim() === '/code review' && repoFullName && prNumber) {
    console.log(`ได้รับคำสั่ง /code review สำหรับ PR #${prNumber} ใน ${repoFullName}`);

    try {
      // 1. ดึงข้อมูล PR เพื่อหา URL ของไฟล์ Diff
      const prUrl = `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}`;
      const prResponse = await axios.get(prUrl, {
        headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }
      });
      const diffUrl = prResponse.data.diff_url;
      const diffResponse = await axios.get(diffUrl);
      const codeDiff = diffResponse.data;

      // 2. อ่านไฟล์ skill.md
      const skillPath = path.join(__dirname, 'skill.md');
      const skillPrompt = await fs.readFile(skillPath, 'utf-8');

      // 3. สร้างคำสั่งสุดท้ายและส่งไปให้ GLM
      const finalPrompt = `${skillPrompt}\n\n---\n\nนี่คือโค้ดที่ต้องการรีวิว:\n\`\`\`diff\n${codeDiff}\n\`\`\``;
      const reviewResult = await callGLM(finalPrompt);

      // 4. โพสต์ผลลัพธ์กลับไปที่ PR
      const commentUrl = `https://api.github.com/repos/${repoFullName}/issues/${prNumber}/comments`;
      await axios.post(commentUrl, {
        body: `### 🤖 รายงานจาก Code Review Master\n\n${reviewResult}`
      }, {
        headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }
      });

      console.log("โพสต์ผลการรีวิวเรียบร้อยแล้ว");

    } catch (error) {
      console.error("เกิดข้อผิดพลาดระหว่างการทำงาน:", error.response?.data || error.message);
    }
  }

  // ตอบกลับ GitHub ทันทีเพื่อยืนยันว่าได้รับ Webhook
  res.status(200).send('OK');
});

// Export เพื่อให้ Vercel รู้จัก
module.exports = app;