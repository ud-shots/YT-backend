import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { Users } from "../../models/users";
import moment from 'moment'
import Logger from "../../common/logger";
import { Videos } from "../../models/videos";
import { YouTubeCredential } from "../../models/youtube_credential";

export async function uploadVideoWithSEO(filePath: string, seo: any, publishType: "public" | "private" | "scheduled", publishAt: string | null, user_id: string, video_id: string) {
  // 1️⃣ Fetch user
  const user = await Users.findByPk(user_id, { raw: true });
  const youtube_credential = await YouTubeCredential.findOne({ where: { user_id } });

  if (!user) {
    const mockReq: any = { method: 'POST', url: '/youtube/upload-video', headers: {}, body: {}, user: { id: user_id }, userId: user_id };
    await Logger.logError(new Error("User not found"), mockReq, 'YouTube', 'uploadVideoWithSEO', 'User not found during video upload');
    throw new Error("User not found");
  }

  if (!youtube_credential) {
    const mockReq: any = { method: 'POST', url: '/youtube/upload-video', headers: {}, body: {}, user: { id: user_id }, userId: user_id };
    await Logger.logError(new Error("YouTube credential not found"), mockReq, 'YouTube', 'uploadVideoWithSEO', 'YouTube credential not found during video upload');
    throw new Error("YouTube credential not found");
  }

  if (!youtube_credential.access_token || !youtube_credential.refresh_token) {
    const mockReq: any = { method: 'POST', url: '/youtube/upload-video', headers: {}, body: {}, user: { id: user_id }, userId: user_id };
    await Logger.logError(new Error("YouTube not connected for this user"), mockReq, 'YouTube', 'uploadVideoWithSEO', 'YouTube not connected for user during video upload');
    throw new Error("YouTube not connected for this user");
  }

  // 2️⃣ Create OAuth client PER USER
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

  // 3️⃣ Auto-save refreshed tokens
  oauth2Client.on("tokens", async (tokens) => {
    let expiry: Date | null = null;
    if (tokens.access_token) {
      youtube_credential.access_token = tokens.access_token;
      if (tokens.expiry_date) {
        if (typeof tokens.expiry_date === "number") {
          expiry = new Date(tokens.expiry_date);
        }
      }

      await user.save();
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

  // 5️⃣ Build SEO description
  const fullDescription = `
${seo.description}

Keywords:
${seo.keywords?.join(", ")}

Trending Topics:
${seo.trendingTopics?.join(", ")}

${seo.suggestedHashtags?.join(" ")}
`;

  console.log("🚀 Uploading video to YouTube...");

  // Update video record with SEO data
  await Videos.update({ title: seo.title, description: seo.description, tags: seo.tags, keywords: seo.keywords, hashtags: seo.suggestedHashtags, status: "uploading", progress: 50 }, { where: { id: video_id } });

  // 6️⃣ Upload video
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

  // Update video record with YouTube video ID
  await Videos.update({ youtube_video_id: youtubeVideoId, status: "processing", progress: 90 }, { where: { id: video_id } });

  // 7️⃣ Validate upload
  await validateVideo(youtube, youtubeVideoId, video_id, user_id);

  // Update video record with final status
  const finalStatus = publishType === "scheduled" ? "scheduled" : "published";
  const publishedAt = finalStatus === "published" ? moment().format('YYYY-MM-DD HH:mm:ss') : null;

  const obj: any = { status: finalStatus, progress: 100, published_at: publishedAt, thumbnail_url: `https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg` };
  await Videos.update(obj, { where: { id: video_id } });

  return youtubeVideoId;
}

async function validateVideo(youtube: any, videoId: string, video_id: string, user_id?: string) {
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
    const mockReq: any = { method: 'POST', url: '/youtube/upload-video', headers: {}, body: {}, user: { id: user_id }, userId: user_id };
    await Logger.logError(error, mockReq, 'YouTube', 'validateVideo', 'Error validating video');
    await Videos.update({ status: 'blocked', rejection_reason: error.message || 'Unknown error occurred during validation' }, { where: { id: video_id } });
  }
}
