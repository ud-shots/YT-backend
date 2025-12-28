import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import Logger from "../../common/logger";
import Handler from "../../common/handler";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);

export async function analyzeMedia(user_id: string, pending_upload_media_id: string, mediaPath: string, context?: string, platform: any = 'unknown', file_type?: string, media_type?: string) {

    try {
        console.log("⬆️ Media...", media_type, file_type);
        console.log("⬆️ Uploading video to Gemini...");

        const upload = await fileManager.uploadFile(mediaPath, { mimeType: `${media_type}/${file_type}`, displayName: "media", });
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
                await Handler.addLogs(user_id, pending_upload_media_id, `Video processing failed: ${file.error?.message}`, platform);
                return { status: false, message: `Video processing failed: ${file.error?.message}` };
            }

            attempts++;
        }

        if (state !== "ACTIVE") {
            await Handler.addLogs(user_id, pending_upload_media_id, "File did not become ACTIVE in time", platform);
            return { status: false, message: "File did not become ACTIVE in time" };
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

                response = await model.generateContent([prompt, { fileData: { fileUri: videoUri, mimeType: `${media_type}/${file_type}`, }, },]);
                break;

            } catch (err: any) {

                retry++;

                if (err.status === 503 && retry < MAX_RETRIES) {
                    await new Promise((r) => setTimeout(r, 10_000));
                } else {
                    throw err;
                }

            }

        }

        if (!response) {
            const error = new Error("Gemini failed to generate response");
            await Handler.addLogs(user_id, pending_upload_media_id, `Gemini failed to generate response: ${error.message || error}`, platform);
            return { status: false, message: `Gemini failed to generate response: ${error.message || error}` };
        }


        const text = response.response.text();
        const match = text.match(/\{[\s\S]*\}/);

        if (!match) {
            const error = new Error("Invalid JSON returned by Gemini");
            await Handler.addLogs(user_id, pending_upload_media_id, `Invalid JSON returned by Gemini: ${error.message || error}`, platform);
            return { status: false, message: `Invalid JSON returned by Gemini: ${error.message || error}` };
        }

        return { status: true, data: { seo: JSON.parse(match[0]) } }
    } catch (error: any) {
        console.log(error, 'analyzeMedia')
        await Handler.addLogs(user_id, pending_upload_media_id, `Error analyzing media: ${error.message || error}`, platform);
        return { status: false, message: `Error analyzing media: ${error.message || error}` };
    }
}