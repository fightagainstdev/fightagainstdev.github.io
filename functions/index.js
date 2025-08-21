const functions = require("firebase-functions");
const fetch = require("node-fetch");

exports.generateStory = functions.https.onCall(async (data, context) => {
  const photoUrl = data.photoUrl;
  if (!photoUrl) {
    throw new functions.https.HttpsError("invalid-argument", "photoUrl 必填");
  }

const apiKey = functions.config().xai.key; // ✅ 安全读取 key
const model = functions.config().xai.model || "grok-beta";

const resp = await fetch("https://api.x.ai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model,
    messages: [
      {role: "system", content: "你是一个写作助手，帮用户根据照片生成有趣的故事。"},
      {role: "user", content: `请根据这张照片生成一个简短的故事: ${photoUrl}`},
    ],
  }),
});
  if (!resp.ok) {
    const text = await resp.text();
    throw new functions.https.HttpsError("internal", `XAI 调用失败: ${resp.status} ${text}`);
  }

  return await resp.json();
});
