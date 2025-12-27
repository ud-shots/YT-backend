import dotenv from "dotenv"
dotenv.config();
import { RES_MESSAGE, RES_STATUS, STATUS_CODE } from "../../common/statusMessageCode";
import Handler from "../../common/handler";
import { google } from "googleapis";
import { Users } from "../../models/users";
import { YouTubeCredential } from "../../models/youtube_credential";
import { Videos } from "../../models/videos";
import { autoUploadVideo } from "./start_process";
import Logger from "../../common/logger";

export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.SECRET_KEY,
  process.env.GOOGLE_REDIRECT_URI
);

export const SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.force-ssl",];

class YoutubeService {

  async getYoutubeConsentUrl(req: any) {
    try {

      const { userId } = req;
      const state = Buffer.from(JSON.stringify({ userId })).toString("base64");

      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: SCOPES,
        state,
      });

      return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "Link Created Successfully!", { url })

    } catch (error: any) {
      await Logger.logError(error, req, 'YouTube', 'getYoutubeConsentUrl', 'Error getting YouTube consent URL');
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500);
    }
  }

  async youtubeCallback(req: any, res: any) {
    try {

      const { code, state } = req.query;

      const decodedState = JSON.parse(
        Buffer.from(state as string, "base64").toString()
      );

      const { userId } = decodedState;

      const { tokens } = await oauth2Client.getToken(code as string);
      oauth2Client.setCredentials(tokens);

      const youtube = google.youtube({
        version: "v3",
        auth: oauth2Client,
      });

      const channelRes = await youtube.channels.list({
        part: ["snippet"],
        mine: true,
      });

      console.log(tokens, 'hello token---------->')
      const channel = channelRes.data.items?.[0];

      // Create or update YouTube credential record
      await YouTubeCredential.upsert({
        user_id: userId,
        channel_id: channel?.id,
        channel_title: channel?.snippet?.title,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokens.expiry_date
          ? String(new Date(tokens.expiry_date))
          : null,
        is_active: true,
      } as any);

      console.log(tokens, 'hello token---------->')
      console.log({
        user_id: userId,
        channel_id: channel?.id,
        channel_title: channel?.snippet?.title,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokens.expiry_date ? String(new Date(tokens.expiry_date)) : null,
        is_active: true,
      }, 'YouTube credential saved---------->')

      // Close popup safely
      res.send(`<script>window.close();</script>`);

    } catch (error: any) {
      await Logger.logError(error, req, 'YouTube', 'youtubeCallback', 'Error in YouTube callback');
      res.send(`<script>alert('Error connecting to YouTube: ${error.message}');window.close();</script>`);
    }
  }

  async uploadVideo(req: any) {
    try {

      const { url, visibility, schedule } = req.body;
      const { file, userId } = req;

      if (!file && !url) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC422, 'file or url any one require');
      }

      // Verify user has YouTube credentials
      const youtubeCredential = await YouTubeCredential.findOne({ where: { user_id: userId } });
      if (!youtubeCredential || !youtubeCredential.is_active) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC400, 'YouTube account not connected or not active');
      }

      // Create video record in database
      let obj: any = {
        user_id: userId,
        filename: file ? file.originalname : url,
        original_url: url || null,
        local_path: file ? file.path : null,
        visibility: visibility || 'private',
        status: 'uploading',
        scheduled_at: schedule ? new Date(schedule) : undefined
      };
      const videoRecord = await Videos.create(obj);

      // Start the upload process
      if (url) {
        autoUploadVideo('url', req?.body, null, userId || '', videoRecord.id?.toString() || '');
      } else {
        autoUploadVideo('file', req?.body, file, userId || '', videoRecord.id?.toString() || '');
      }

      return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "Video In Progress!", { videoId: videoRecord.id });

    } catch (error: any) {
      await Logger.logError(error, req, 'YouTube', 'uploadVideo', 'Error uploading video');
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500);
    }
  }

  async uploadVideoApp(req: any) {
    try {

      const { url, visibility, schedule } = req.body;

      // Find a user for the app (this should be improved in a real app)
      const user = await Users.findOne({ where: { email: 'shots.ud@gmail.com' }, attributes: ['id'] });
      const userId = user?.id;

      if (!userId) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC404, 'Default user not found');
      }

      if (!url) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC422, 'URL is required');
      }

      // Verify user has YouTube credentials
      const youtubeCredential = await YouTubeCredential.findOne({ where: { user_id: userId } });
      if (!youtubeCredential || !youtubeCredential.is_active) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC400, 'YouTube account not connected or not active');
      }

      // Create video record in database
      let obj: any = {
        user_id: userId,
        filename: url,
        original_url: url || null,
        local_path: null,
        visibility: visibility || 'private',
        status: 'uploading',
        scheduled_at: schedule ? new Date(schedule) : undefined
      };
      const videoRecord = await Videos.create(obj);

      // Start the upload process
      if (url) {
        autoUploadVideo('url', req?.body, null, userId || '', videoRecord.id?.toString() || '');
      } else {
        autoUploadVideo('file', req?.body, undefined, userId || '', videoRecord.id?.toString() || '');
      }

      return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "Video In Progress!", { videoId: videoRecord.id });

    } catch (error: any) {
      await Logger.logError(error, req, 'YouTube', 'uploadVideoApp', 'Error uploading video from app');
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500);
    }
  }

}

export default new YoutubeService();
