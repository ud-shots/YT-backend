import dotenv from "dotenv"
dotenv.config();
import { RES_MESSAGE, RES_STATUS, STATUS_CODE } from "../../common/statusMessageCode";
import bcrypt from 'bcrypt'
import { Users } from "../../models/users";
import Handler from "../../common/handler";
import { Login_History } from "../../models/login_history";
import { OAuth2Client } from 'google-auth-library';
// Your Google Client ID
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);
import axios from 'axios'

class AuthService {

  async generateRandomString(length: number = 10) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  async loginService(req: any) {
    try {

      const { email, password } = req.body

      const exitUser: any = await Users.findOne({ where: { email, is_active: true } })

      if (!exitUser) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC404, "An Account With This Email Does Not Exist!")
      }

      if (!exitUser.is_email_verified) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC401, "Email Not Verified Please Verify To Login!")
      }

      if (!exitUser?.dataValues?.password) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC400, "Please Forgot Your Password!")
      }

      let dPass = await bcrypt.compare(password, exitUser?.dataValues?.password)

      if (!dPass) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC401, "The Password You Entered Is Incorrect!")
      }

      // if (exitUser.dataValues.login_token != null) {
      //   const decode = await Handler.verifyToken(exitUser.dataValues.login_token)

      //   if (decode) {
      //     return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC409, "Oops! You’re Already Logged In On Another Device!")
      //   }
      // }

      let vr = await this.generateRandomString()
      const token = await Handler.generateToken({ ...exitUser.dataValues, vr }, '24h')

      await Users.update({ login_token: token, vr }, { where: { id: exitUser.dataValues.id } })

      let history_data: any = { user_id: exitUser.dataValues.id, email: exitUser.dataValues.email, login_token: token, vr }
      await Login_History.create(history_data)

      return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "Login Successfully!", { jwt: token, vr, user: { id: exitUser.dataValues.id, email: exitUser.dataValues.email } })

    } catch (error: any) {
      console.log('Error From Login:- ', error)
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500)
    }
  }

  async logoutService(req: any) {
    try {

      const token: any = await req.header('Authorization')?.replace('Bearer ', '');
      console.log("🚀 ~ AuthService ~ logoutService ~ token:", token)
      const { userId } = req

      const exitUser: any = await Users.findOne({ where: { id: userId } })

      if (!exitUser) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC404, "An Account With This Email Does Not Exist!")
      }

      let history_data: any = { user_id: exitUser.dataValues.id, email: exitUser.dataValues.email, login_token: token, type: 'Logout', ip: req.user_ip }
      await Login_History.create(history_data)

      if (!exitUser.login_token) {
        return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "You Have Already Logged Out!", null)
      }

      await exitUser.update({ login_token: null, vr: null })

      return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "Logout Successfully!", null)

    } catch (error: any) {
      console.log('Error From Logout:- ', error)
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500)
    }
  }

  async validateGoogleToken(accessToken: string) {
    try {
      // Step 1: Validate token
      const tokenInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/tokeninfo', {
        params: { access_token: accessToken },
      });

      const tokenInfo = tokenInfoRes.data;

      if (tokenInfo.aud !== CLIENT_ID) {
        return { status: false, message: "Invalid Client Id!" }
      }

      // Step 2: Get user info
      const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const user = userInfoRes.data;
      return { status: true, message: "Data Fetch Successfully!", data: { email: user.email, name: user.name, picture: user.picture, sub: user.id } };

    } catch (error: any) {
      console.error('Google token validation failed:', error.message);
      return { status: false, message: "Invalid Or Expired Google Access Token!" }
    }
  };

  async ssoLoginService(req: any) {
    try {
      let { token } = req.body
      // Verify the token using Google's OAuth2 client
      // const ticket = await client.verifyIdToken({
      //   idToken: token,
      //   audience: CLIENT_ID,
      // });

      // Get user details from the token
      // const payload = ticket.getPayload();

      const { data, status, message } = await this.validateGoogleToken(token)

      if (!status) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC400, message)
      }

      if (data) {
        const { email, name } = data as { email: string, name: string };

        let user: any = await Users.findOne({ where: { email } })

        if (!user) {

          let obj: any = {
            username: name,
            email,
            is_email_verified: true
          }
          let createUser = await Users.create(obj)
        }

        const exitUser = await Users.findOne({ where: { email } })

        if (!exitUser) {
          return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC403, "An Account With This Email Does Not Exist!")
        }

        if (!exitUser.is_email_verified) {
          await Users.update({ is_email_verified: true }, { where: { id: exitUser?.dataValues.id } })
        }

        // if (exitUser.dataValues.login_token != null) {
        //   const decode = await Handler.verifyToken(exitUser.dataValues.login_token)

        //   if (decode) {
        //     return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC409, "Oops! You’re Already Logged In On Another Device!")
        //   }
        // }

        let vr = await this.generateRandomString()
        const token = await Handler.generateToken({ ...exitUser.dataValues, vr }, '24h')

        await Users.update({ login_token: token, vr }, { where: { id: exitUser.dataValues.id } })

        let history_data: any = { user_id: exitUser.dataValues.id, email: exitUser.dataValues.email, login_token: token, vr }
        await Login_History.create(history_data)

        return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "Login Successfully!", { jwt: token, vr, user: { id: exitUser.dataValues.id } })

      } else {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC400, "Invalid Token!")
      }
    } catch (error: any) {
      console.log('Error From SSO-Login:- ', error)
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500)
    }
  }

}

export default new AuthService();
