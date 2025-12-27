import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import Logger from "../../common/logger";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);

export async function analyzeVideoForYouTubeSEO(
    videoPath: string,
    context?: string
) {
    console.log("⬆️ Uploading video to Gemini...");

    const upload = await fileManager.uploadFile(videoPath, { mimeType: "video/mp4", displayName: "youtube-video", });
    const fileName = upload.file.name;
    const videoUri = upload.file.uri;

    console.log("✅ Uploaded:", videoUri);
    console.log("⏳ Waiting for file processing...");

    let state = upload.file.state;
    let attempts = 0;
    const MAX_ATTEMPTS = 30;

    while (state !== "ACTIVE" && attempts < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 10_000));

        const file = await fileManager.getFile(fileName);
        state = file.state;

        console.log(`🔄 File state: ${state} (${attempts + 1}/${MAX_ATTEMPTS})`);

        if (state === "FAILED") {
            throw new Error(`Video processing failed: ${file.error?.message}`);
        }

        attempts++;
    }

    if (state !== "ACTIVE") {
        throw new Error("File did not become ACTIVE in time");
    }

    console.log("✅ File is ACTIVE");

    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 4096,
        },
    });

    const prompt = `
You are a senior YouTube SEO strategist (2024–2025) with deep knowledge of
YouTube ranking algorithms, CTR optimization, watch-time signals, and
current trending patterns.

TASK:
Carefully analyze the attached video (visuals + audio + context) and generate
high-performing, SEO-optimized YouTube metadata.

${context ? `ADDITIONAL CONTEXT (if any):\n${context}\n` : ""}

SEO REQUIREMENTS:
- Title:
  • 60–70 characters
  • 1-2 emoji
  • 2-3 hastag
  • High CTR, curiosity-driven but NOT clickbait
  • Primary keyword at the beginning if possible
  • title length <=100 count space and all charactors
- Description:
  • 150–250 words
  • First 2 lines must be hook-based and keyword-rich
  • Natural keyword placement (no stuffing)
  • Clear explanation of video content
- Tags:
  • Mix of short-tail & long-tail keywords
  • Focus on search intent
- Keywords:
  • Core SEO phrases people actually search
- Trending Topics:
  • Only relevant to the video niche
  • Avoid unrelated viral topics
- Hashtags:
  • 8–15 hashtags
  • YouTube-safe (no banned or misleading tags)
  • Include brand + niche + trending hashtags

STRICT RULES:
- NO markdown
- NO explanations
- NO extra text
- NO copyright claims
- Output MUST be valid JSON
- JSON keys must match exactly

RETURN ONLY THIS JSON STRUCTURE:
{
  "title": "",
  "description": "",
  "tags": [],
  "keywords": [],
  "trendingTopics": [],
  "suggestedHashtags": []
}
`;



    let response;
    let retry = 0;
    const MAX_RETRIES = 5;

    while (retry < MAX_RETRIES) {

        try {

            response = await model.generateContent([prompt, { fileData: { fileUri: videoUri, mimeType: "video/mp4", }, },]);
            break;

        } catch (err: any) {

            retry++;
            const mockReq: any = { method: 'POST', url: '/youtube/analyze-video', headers: {}, body: { videoPath, context }, userId: 'system' };
            await Logger.logError(err, mockReq, 'YouTube', 'analyzeVideoForYouTubeSEO', `Retry ${retry}/${MAX_RETRIES}: ${err.message}`);

            if (err.status === 503 && retry < MAX_RETRIES) {
                await new Promise((r) => setTimeout(r, 10_000));
            } else {
                throw err;
            }

        }

    }

    if (!response) {
        const error = new Error("Gemini failed to generate response");
        const mockReq: any = { method: 'POST', url: '/youtube/analyze-video', headers: {}, body: { videoPath, context }, userId: 'system' };
        await Logger.logError(error, mockReq, 'YouTube', 'analyzeVideoForYouTubeSEO', 'Gemini failed to generate response');
        throw error;
    }


    const text = response.response.text();
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
        const error = new Error("Invalid JSON returned by Gemini");
        const mockReq: any = { method: 'POST', url: '/youtube/analyze-video', headers: {}, body: { videoPath, context }, userId: 'system' };
        await Logger.logError(error, mockReq, 'YouTube', 'analyzeVideoForYouTubeSEO', 'Invalid JSON returned by Gemini');
        throw error;
    }

    return JSON.parse(match[0]);
}