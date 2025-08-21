const functions = require("firebase-functions");

exports.generateStory = functions.https.onCall(async (data, context) => {
  try {
    // 记录请求数据
    console.log("收到云函数请求，data:", JSON.stringify(data, null, 2));

    // 验证 photoUrl
    const photoUrl = data?.photoUrl;
    if (!photoUrl || typeof photoUrl !== 'string' || photoUrl.trim() === '') {
      console.error("photoUrl 参数无效:", photoUrl);
      throw new functions.https.HttpsError("invalid-argument", "photoUrl 必填且必须为有效字符串");
    }
    console.log("验证通过，photoUrl:", photoUrl);

    // 验证 API Key
    const apiKey = functions.config().xai?.key;
    if (!apiKey) {
      console.error("未配置 XAI API Key");
      throw new functions.https.HttpsError("failed-precondition", "缺少 XAI API Key");
    }

    console.log("开始调用 X AI API...");

    // 调用 X AI API
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
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

    // 记录 API 响应
    const responseText = await response.text();
    console.log("X AI API 响应状态:", response.status);
    console.log("X AI API 响应内容:", responseText);

    // 检查 API 响应
    if (!response.ok) {
      console.error("X AI API 调用失败:", response.status, responseText);
      throw new functions.https.HttpsError("internal", `X AI API 调用失败: ${response.status} - ${responseText}`);
    }

    // 解析响应
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("解析 X AI API 响应失败:", parseError);
      throw new functions.https.HttpsError("internal", "X AI API 响应解析失败");
    }

    const story = result.choices?.[0]?.message?.content || "抱歉，无法生成故事";
    console.log("生成的故事:", story);

    // 返回结果
    return {
      success: true,
      story: story
    };

  } catch (error) {
    console.error("generateStory 错误:", {
      message: error.message,
      stack: error.stack,
      data: JSON.stringify(data, null, 2)
    });
    throw new functions.https.HttpsError("internal", `生成故事失败: ${error.message}`);
  }
});
