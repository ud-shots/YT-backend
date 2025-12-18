import dotenv from "dotenv"
dotenv.config();
import { RES_MESSAGE, RES_STATUS, STATUS_CODE } from "../../common/statusMessageCode";
import Handler from "../../common/handler";
import { google } from "googleapis";
import { Users } from "../../models/users";
import { Videos } from "../../models/videos";
import { downloadVideo } from './download_video';
import { autoUploadVideo } from "./start_process";

export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.SECRET_KEY,
  process.env.GOOGLE_REDIRECT_URI
);

export const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.force-ssl",
];

class YoutubeService {

  async getYoutubeConsentUrl(req: any) {
    try {

      const { userId } = req;

      const state = Buffer.from(
        JSON.stringify({ userId })
      ).toString("base64");

      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: SCOPES,
        state,
      });

      return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "Link Created Successfully!", { url })

    } catch (error: any) {
      console.log('Error From Logout:- ', error)
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500)
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

      const channel = channelRes.data.items?.[0];

      const obj: any = {
        user_id: userId, // from your SSO
        channel_id: channel?.id,
        channel_title: channel?.snippet?.title,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        is_active: true,
      }

      console.log(tokens, 'hello token---------->')
      console.log(obj, 'hello obj---------->')
      //@ts-ignore
      await Users.update({ channel_id: channel?.id, channel_title: channel?.snippet?.title, access_token: tokens.access_token, refresh_token: tokens.refresh_token, yt_token_expiry: tokens.expiry_date ? new Date(tokens?.expiry_date) : null, is_active: true }, { where: { id: userId } });



      // await YoutubeAccount.upsert({
      //   user_id: req.user.id, // from your SSO
      //   channel_id: channel?.id,
      //   channel_title: channel?.snippet?.title,
      //   access_token: tokens.access_token,
      //   refresh_token: tokens.refresh_token,
      //   token_expiry: tokens.expiry_date
      //     ? new Date(tokens.expiry_date)
      //     : null,
      //   is_active: true,
      // });

      // Close popup safely
      res.send(`
         <script>
          window.close();
        </script>
        `)

    } catch (error: any) {
      console.log('Error From Logout:- ', error)
      res.send(`Error`)
    }
  }

  async uploadVideo(req: any) {
    try {

      const { url, visibility, schedule } = req.body;
      const { file, userId } = req;

      if (!file && !url) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC422, 'file or url any one require')
      }

      // Create video record in database
      let obj:any = {
        user_id: userId,
        filename: file ? file.originalname : url,
        original_url: url || null,
        local_path: file ? file.path : null,
        visibility: visibility || 'private',
        status: 'uploading',
        scheduled_at: schedule ? new Date(schedule) : undefined
      }
      const videoRecord = await Videos.create(obj);

      // Start the upload process
      if (url) {
        //@ts-ignore
        autoUploadVideo('url', req?.body, null, userId || '', videoRecord.id?.toString())
      } else {
        //@ts-ignore
        autoUploadVideo('file', req?.body, file, userId || '', videoRecord.id?.toString())
      }

      return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "Video In Progress!", { videoId: videoRecord.id })

    } catch (error: any) {
      console.log('Error :- ', error)
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500)
    }
  }

}

export default new YoutubeService();
