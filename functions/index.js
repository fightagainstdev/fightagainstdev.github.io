const functions = require("firebase-functions");

exports.generateStory = functions.https.onCall(async (data, context) => {
  const photoUrl = data.photoUrl;
  if (!photoUrl) {
    throw new functions.https.HttpsError("invalid-argument", "photoUrl 必填");
  }

  const apiKey = functions.config().xai.key;
  if (!apiKey) {
    throw new functions.https.HttpsError("failed-precondition", "缺少 XAI API Key");
  }

  const resp = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-beta",
      messages: [
        { role: "system", content: "你是一个写作助手，帮用户根据照片生成有趣的故事。" },
        { role: "user", content: `请根据这张照片生成一个简短的故事: ${photoUrl}` },
      ],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("XAI 调用失败:", resp.status, text);
    throw new functions.https.HttpsError("internal", `XAI 调用失败: ${resp.status}`);
  }

  const result = await resp.json();
  console.log("XAI 返回:", result);
  return result;
});
