const axios = require("axios");
const crypto = require("crypto");

function randomId() {
  return crypto.randomUUID().replace(/-/g, "");
}

module.exports = async function unlimitedAI(question) {
  try {
    if (!question) {
      return {
        success: false,
        message: "Question is required."
      };
    }

    const inst = axios.create({
      baseURL: "https://app.unlimitedai.chat/api",
      headers: {
        referer: "https://app.unlimitedai.chat/id",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36"
      }
    });

    const { data: tokenData } = await inst.get("/token");

    const { data: raw } = await inst.post(
      "/chat",
      {
        messages: [
          {
            id: randomId(),
            createdAt: new Date().toISOString(),
            role: "user",
            content: question,
            parts: [{ type: "text", text: question }]
          }
        ],
        id: randomId(),
        selectedChatModel: "chat-model-reasoning",
        selectedCharacter: null,
        selectedStory: null
      },
      {
        headers: {
          "x-api-token": tokenData.token
        }
      }
    );

    const lines = String(raw).split("\n");
    const found = lines.find((l) => l.trim().startsWith("0:"));

    if (!found) {
      return {
        success: false,
        message: "No result returned from UnlimitedAI"
      };
    }

    let answer = found.replace(/^0:/, "").trim();
    answer = answer.replace(/^"+|"+$/g, "");

    return {
      success: true,
      answer
    };
  } catch (e) {
    return {
      success: false,
      message: e.message || String(e)
    };
  }
};