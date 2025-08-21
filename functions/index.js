const functions = require("firebase-functions");

exports.generateStory = functions.https.onCall(async (data, context) => {
  try {
    // Log incoming request data
    console.log("Received request with data:", data);

    // Validate photoUrl
    const photoUrl = data?.photoUrl?.trim();
    if (!photoUrl) {
      console.error("Missing or invalid photoUrl in request data");
      throw new functions.https.HttpsError("invalid-argument", "photoUrl 必填");
    }
    console.log("Validated photoUrl:", photoUrl);

    // Validate API key
    const apiKey = functions.config().xai?.key;
    if (!apiKey) {
      console.error("XAI API Key is not configured");
      throw new functions.https.HttpsError("failed-precondition", "缺少 XAI API Key");
    }

    console.log("Initiating X AI API call...");

    // Call xAI API
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

    // Log API response status and body
    const responseText = await response.text();
    console.log("X AI API response status:", response.status);
    console.log("X AI API response body:", responseText);

    // Check if API call was successful
    if (!response.ok) {
      console.error("X AI API call failed:", response.status, responseText);
      throw new functions.https.HttpsError("internal", `X AI API 调用失败: ${response.status} - ${responseText}`);
    }

    // Parse and validate response
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse X AI API response:", parseError);
      throw new functions.https.HttpsError("internal", "X AI API 响应解析失败");
    }

    const story = result.choices?.[0]?.message?.content || "抱歉，无法生成故事";
    console.log("Generated story:", story);

    // Return consistent response structure
    return {
      success: true,
      story: story
    };

  } catch (error) {
    // Log detailed error information
    console.error("generateStory error:", {
      message: error.message,
      stack: error.stack,
      data: data
    });
    throw new functions.https.HttpsError("internal", `生成故事失败: ${error.message}`);
  }
});
