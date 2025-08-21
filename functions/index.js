const functions = require("firebase-functions");

exports.generateStory = functions.https.onCall(async (data, context) => {
  try {
    const photoUrl = data.photoUrl;
    if (!photoUrl) {
      throw new functions.https.HttpsError("invalid-argument", "photoUrl 必填");
    }

    const apiKey = functions.config().xai?.key;
    if (!apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "缺少 XAI API Key");
    }

    console.log("调用 X AI API，图片URL:", photoUrl);

    // X AI API call with proper image handling
    const resp = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-vision-beta", // Use vision model
        messages: [
          {
            role: "system",
            content: "你是一个富有创意的写作助手。根据用户提供的照片，创作一个简短而有趣的故事，大约100-200字。故事要生动有趣，富有想象力。请用中文回答。"
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "请根据这张照片创作一个有趣的故事："
              },
              {
                type: "image_url",
                image_url: {
                  url: photoUrl
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.7
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
    
    // 提取故事内容
    const story = result.choices?.[0]?.message?.content || "抱歉，无法生成故事";
    
    return {
      story: story,
      success: true
    };

  } catch (error) {
    console.error("generateStory 详细错误:", error);
    
    // 如果是网络错误或API错误，返回友好的错误信息
    if (error.code === 'invalid-argument' || error.code === 'failed-precondition') {
      throw error;
    }
    
    throw new functions.https.HttpsError("internal", `生成故事失败: ${error.message}`);
  }
});
