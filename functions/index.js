const functions = require("firebase-functions");

exports.generateStory = functions.https.onCall(async (data, context) => {
  try {
    console.log("收到请求，data:", data);
    
    const photoUrl = data.photoUrl;
    if (!photoUrl) {
      console.error("photoUrl 参数缺失");
      throw new functions.https.HttpsError("invalid-argument", "photoUrl 必填");
    }

    console.log("photoUrl:", photoUrl);

    const apiKey = functions.config().xai?.key;
    if (!apiKey) {
      console.error("XAI API Key 未配置");
      throw new functions.https.HttpsError("failed-precondition", "缺少 XAI API Key");
    }

    console.log("开始调用 X AI API...");

    // X AI API 调用
    const resp = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-beta",
        messages: [
          {
            role: "system",
            content: "你是一个富有创意的写作助手。根据用户提供的照片，创作一个简短而有趣的故事，大约100-200字。故事要生动有趣，富有想象力。请用中文回答。"
          },
          {
            role: "user",
            content: `请根据这张照片创作一个有趣的故事。照片链接：${photoUrl}`
          }
        ],
        max_tokens: 500,
        temperature: 0.8
      }),
    });

    const responseText = await resp.text();
    console.log("X AI 响应状态:", resp.status);
    console.log("X AI 响应内容:", responseText);

    if (!resp.ok) {
      console.error("X AI API 调用失败:", resp.status, responseText);
      throw new functions.https.HttpsError("internal", `X AI API 调用失败: ${resp.status} - ${responseText}`);
    }

    const result = JSON.parse(responseText);
    const story = result.choices?.[0]?.message?.content || "抱歉，无法生成故事";
    
    console.log("提取的故事:", story);
    
    return {
      story: story,
      success: true
    };

  } catch (error) {
    console.error("generateStory 详细错误:", error);
    throw new functions.https.HttpsError("internal", `生成故事失败: ${error.message}`);
  }
});
