import dotenv from "dotenv"
dotenv.config();
import { RES_MESSAGE, RES_STATUS, STATUS_CODE } from "../../common/statusMessageCode";
import Handler from "../../common/handler";
import { google } from "googleapis";
import { YouTubeCredential } from "../../models/youtube_credential";
import Logger from "../../common/logger";
import moment from "moment";
import { Pending_Uplaod_Media } from "../../models/pending_upload_media";

export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.SECRET_KEY,
  process.env.GOOGLE_REDIRECT_URI
);

export const SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.force-ssl",];

class YoutubeService {

  async detectPlatform(url: string) {
    try {

      const { hostname } = new URL(url);

      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        return 'youtube';
      }

      if (hostname.includes('instagram.com')) {
        return 'instagram';
      }

      if (hostname.includes('facebook.com') || hostname.includes('fb.watch') || hostname.includes('fb.com')) {
        return 'facebook';
      }

      return 'unknown';

    } catch {
      return 'unknown'; // invalid URL
    }
  }

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

      const { url = null, visibility, schedule } = req.body;
      const { file, userId } = req;

      if (!file && !url) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC422, 'file or url any one require');
      }

      const obj: any = { user_id: userId, type: 'file', visibility, schedule_date: schedule ? moment(schedule).format('YYYY-MM-DD') : null, url, file_name: file ? file.filename : null }
      await Pending_Uplaod_Media.create(obj);

      return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "Video In Progress!", null);

    } catch (error: any) {
      await Logger.logError(error, req, 'YouTube', 'uploadVideo', 'Error uploading video');
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500);
    }
  }

  async uploadVideoApp(req: any) {
    try {

      const { userId } = req
      const { url, visibility, schedule } = req.body;

      const platform = await this.detectPlatform(url);
      const obj: any = { user_id: userId, type: 'url', url, visibility, schedule_date: schedule ? moment(schedule).format('YYYY-MM-DD') : null, platform }
      const data: any = await Pending_Uplaod_Media.create(obj);

      return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "Video In Progress!", null);

    } catch (error: any) {
      await Logger.logError(error, req, 'YouTube', 'uploadVideoApp', 'Error uploading video from app');
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500);
    }
  }

}

export default new YoutubeService();