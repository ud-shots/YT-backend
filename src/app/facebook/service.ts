import { RES_MESSAGE, RES_STATUS, STATUS_CODE } from "../../common/statusMessageCode"
import Handler from "../../common/handler"
import { Videos } from "../../models/videos"
import { Op } from "sequelize"
import axios from "axios"
import { Users } from "../../models/users"
import { FacebookCredential } from "../../models/facebook_credential"
import Logger from "../../common/logger"

const GRAPH_URL = process.env.GRAPH_URL || ''
const appId = process.env.FACEBOOK_APP_ID || ''
const appSecret = process.env.FACEBOOK_APP_SECRET || ''

class FacebookService {

  async getPageTokens(longUserToken: string) {
    const res = await axios.get(`${GRAPH_URL}/me/accounts`, {
      params: {
        access_token: longUserToken
      }
    });

    return res.data.data;
  }

  async getInstagramBusinessId(pageId: string, pageToken: string) {
    const res = await axios.get(`${GRAPH_URL}/${pageId}`, {
      params: {
        fields: 'instagram_business_account',
        access_token: pageToken
      }
    });

    return res.data.instagram_business_account?.id || null;
  }

  async getFacebookAccessToken(req: any) {
    try {
      const { userId } = req;
      const { short_token } = req.body;

      const user = await Users.findOne({ where: { id: userId } });

      if (!user) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC404, "User not found!");
      }

      // Exchange short-lived token for long-lived token
      const res = await axios.get(`${GRAPH_URL}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: short_token
        }
      });

      // Update Facebook credential record
      await FacebookCredential.upsert({
        user_id: userId,
        access_token: res.data.access_token,
      } as any);

      console.log(res.data, 'Facebook access token updated----------->');
      return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "Access token fetched successfully!", { access_token: res.data.access_token });

    } catch (error: any) {
      await Logger.logError(error, req, 'Facebook', 'getFacebookAccessToken', 'Error fetching Facebook access token');
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500);
    }
  }

  async finalConnect(req: any) {
    try {
      const { userId } = req;
      const { long_live_token } = req.body;

      // Use the long-lived token to get page tokens
      const pages = await this.getPageTokens(long_live_token);

      if (!pages.length) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC400, 'No pages found');
      }

      const page = pages[0];

      const igId = await this.getInstagramBusinessId(page.id, page.access_token);
      
      // Update Facebook credential record
      await FacebookCredential.upsert({
        user_id: userId,
        page_id: page.id,
        page_name: page.name,
        page_access_token: page.access_token,
        insta_business_account_id: igId,
        is_active: true,
      } as any);

      return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "Facebook page connected successfully!", null);

    } catch (error: any) {
      await Logger.logError(error, req, 'Facebook', 'finalConnect', 'Error in finalConnect');
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500);
    }
  }

}

export default new FacebookService()