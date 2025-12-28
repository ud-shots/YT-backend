import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { Users } from "../../models/users";
import moment from 'moment'
import Logger from "../../common/logger";
import { Videos } from "../../models/videos";
import { YouTubeCredential } from "../../models/youtube_credential";
import Handler from "../../common/handler";

const uploadOnYoutube = async (pending_upload_media_id: string, user_id: string, filePath: string, seo: any, publishType: "public" | "private" | "scheduled", publishAt: string | null, video_id: string, youtube_credential: any) => {

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.SECRET_KEY,
        process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
        access_token: youtube_credential.access_token,
        refresh_token: youtube_credential.refresh_token,
        expiry_date: youtube_credential.token_expiry ? new Date(youtube_credential.token_expiry).getTime() : null,
    });

    oauth2Client.on("tokens", async (tokens) => {
        let expiry: Date | null = null;
        if (tokens.access_token) {
            youtube_credential.access_token = tokens.access_token;
            if (tokens.expiry_date) {
                if (typeof tokens.expiry_date === "number") {
                    expiry = new Date(tokens.expiry_date);
                }
            }

            //@ts-ignore
            await YouTubeCredential.update({ access_token: tokens.access_token, token_expiry: expiry ? expiry.toISOString() : null }, { where: { user_id } });
        }
    });

    const youtube = google.youtube({
        version: "v3",
        auth: oauth2Client,
    });

    // 4️⃣ Validate file
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
        const mockReq: any = { method: 'POST', url: '/youtube/upload-video', headers: {}, body: {}, user: { id: user_id }, userId: user_id };
        await Logger.logError(new Error("Video file not found"), mockReq, 'YouTube', 'uploadVideoWithSEO', 'Video file not found during upload');
        throw new Error("Video file not found");
    }

    const fullDescription = `
${seo.description}

Keywords:
${seo.keywords?.join(", ")}

Trending Topics:
${seo.trendingTopics?.join(", ")}

${seo.suggestedHashtags?.join(" ")}
`;

    console.log("🚀 Uploading video to YouTube...");

    await Videos.update({ title: seo.title, description: seo.description, tags: seo.tags, keywords: seo.keywords, hashtags: seo.suggestedHashtags, status: "uploading", progress: 50 }, { where: { id: video_id } });

    const uploadRes = await youtube.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
            snippet: {
                title: seo.title,
                description: fullDescription,
                tags: seo.tags,
                categoryId: "2", // Autos & Vehicles
            },
            status: {
                privacyStatus:
                    publishType === "public" ? "public" : "private",
                ...(publishType === "scheduled" && publishAt
                    ? { publishAt }
                    : {}),
            },
        },
        media: {
            body: fs.createReadStream(absolutePath),
        },
    });

    const youtubeVideoId = uploadRes.data.id!;
    console.log("✅ Uploaded Video ID:", youtubeVideoId);

    await Videos.update({ youtube_video_id: youtubeVideoId, status: "processing", progress: 90 }, { where: { id: video_id } });
    await validateVideo(pending_upload_media_id, youtube, youtubeVideoId, video_id, user_id);

    const finalStatus = publishType === "scheduled" ? "scheduled" : "published";
    const publishedAt = finalStatus === "published" ? moment().format('YYYY-MM-DD HH:mm:ss') : null;

    const obj: any = { status: finalStatus, progress: 100, published_at: publishedAt, thumbnail_url: `https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg` };
    await Videos.update(obj, { where: { id: video_id } });

    return youtubeVideoId;
}

async function validateVideo(pending_upload_media_id: string, youtube: any, videoId: string, video_id: string, user_id: string) {
    console.log("⏳ Waiting for YouTube processing...");
    await new Promise((r) => setTimeout(r, 60_000));

    try {
        const res = await youtube.videos.list({
            part: ["status"],
            id: [videoId],
        });

        const status = res.data.items?.[0]?.status;

        if (!status || status.uploadStatus === "failed" || status.rejectionReason || status.privacyStatus === "blocked") {
            console.log("❌ Video blocked or rejected, deleting...");
            await youtube.videos.delete({ id: videoId });

            // Update video status to 'blocked' in our database
            await Videos.update({ status: 'blocked', rejection_reason: status?.rejectionReason || 'Video rejected or blocked by YouTube' }, { where: { id: video_id } });
            throw new Error("Video rejected or blocked");
        }

        console.log("🎉 Video is valid and safe!");
    } catch (error: any) {
        await Videos.update({ status: 'check_failed', rejection_reason: error.message || 'Unknown error occurred during validation' }, { where: { id: video_id } });
        await Handler.addLogs(user_id, pending_upload_media_id, error.message, "youtube");
    }
}

export = uploadOnYoutube