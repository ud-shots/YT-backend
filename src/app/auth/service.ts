import dotenv from "dotenv"
dotenv.config();
import { RES_MESSAGE, RES_STATUS, STATUS_CODE } from "../../common/statusMessageCode";
import { Users } from "../../models/users";
import { YouTubeCredential } from "../../models/youtube_credential";
import { FacebookCredential } from "../../models/facebook_credential";
import Handler from "../../common/handler";
import { Login_History } from "../../models/login_history";
import { OAuth2Client } from 'google-auth-library';
import { CommonUtils } from "../../common/utils";
// Your Google Client ID
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);
import axios from 'axios'

class AuthService {

  async loginService(req: any) {
    try {

      const { email, password } = req.body;

      // Find user with basic information only
      const user: any = await Users.findOne({
        where: { email, is_active: true },
        attributes: ['id', 'email', 'password', 'is_email_verified', 'username'] // Only fetch necessary fields
      });

      if (!user) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC404, "An Account With This Email Does Not Exist!");
      }

      if (!user.is_email_verified) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC401, "Email Not Verified Please Verify To Login!");
      }

      // Check if user has a password set
      if (!user.password) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC401, "Account not properly set up. Please reset your password!");
      }

      // Compare password using bcrypt
      const isPasswordValid = await CommonUtils.comparePassword(password, user.password);

      if (!isPasswordValid) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC401, "The Password You Entered Is Incorrect!");
      }

      // Generate verification random string
      const vr = CommonUtils.generateRandomString();

      // Generate JWT token
      const token = await Handler.generateToken({
        id: user.id,
        email: user.email,
        username: user.username,
        vr
      }, '5d');

      // Update user with login token and vr
      await Users.update({ login_token: token, vr }, { where: { id: user.id } });

      // Create login history record
      await Login_History.create({
        user_id: user.id,
        email: user.email,
        login_token: token,
        vr: vr
      } as any);

      return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "Login Successfully!", {
        jwt: token,
        vr,
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      });

    } catch (error: any) {
      console.error('Error From Login:- ', error);
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500);
    }
  }

  async logoutService(req: any) {
    try {
      const token: any = req.header('Authorization')?.replace('Bearer ', '');
      const { userId } = req;

      const user = await Users.findOne({ where: { id: userId } });

      if (!user) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC404, "An Account With This Email Does Not Exist!");
      }

      // Create logout history record
      await Login_History.create({
        user_id: user.id,
        email: user.email,
        login_token: token,
        vr: user.vr || undefined
      } as any);

      if (!user.login_token) {
        return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "You Have Already Logged Out!", null);
      }

      await user.update({ login_token: null as any, vr: null as any });

      return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "Logout Successfully!", null);

    } catch (error: any) {
      console.error('Error From Logout:- ', error);
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500);
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
        return { status: false, message: "Invalid Client Id!" };
      }

      // Step 2: Get user info
      const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const user = userInfoRes.data;
      return {
        status: true,
        message: "Data Fetch Successfully!",
        data: {
          email: user.email,
          name: user.name,
          picture: user.picture,
          sub: user.id
        }
      };

    } catch (error: any) {
      console.error('Google token validation failed:', error.message);
      return { status: false, message: "Invalid Or Expired Google Access Token!" };
    }
  };

  async validateGoogleTokenApp(idToken: string) {
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID, // MUST be Web Client ID
      });

      const payload = ticket.getPayload();

      if (!payload) {
        return {
          status: false,
          message: 'Invalid Google ID token',
        };
      }

      return {
        status: true,
        data: {
          email: payload.email,
          name: payload.name,
          sub: payload.sub,
          email_verified: payload.email_verified,
        },
      };
    } catch (error) {
      console.error('Google ID token validation failed:', error);
      return {
        status: false,
        message: 'Invalid or expired Google ID token',
      };
    }
  };

  async ssoLoginService(req: any) {
    try {
      const { token, platform = 'web' } = req.body;

      console.log(token, 'sso token')

      const { data, status, message } = platform === 'app' ? await this.validateGoogleTokenApp(token) : await this.validateGoogleToken(token);

      if (!status) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC400, message);
      }

      if (data) {
        const { email, name } = data as { email: string, name: string };

        let user = await Users.findOne({ where: { email } });

        if (!user) {
          // Hash a default password for SSO users
          const defaultPassword = await CommonUtils.hashPassword(CommonUtils.generateRandomString(12));

          const newUser = await Users.create({
            username: name,
            email,
            password: defaultPassword,
            is_email_verified: true
          } as any);

          user = newUser;
        }

        if (!user) {
          return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC403, "An Account With This Email Does Not Exist!");
        }

        if (!user.is_email_verified) {
          await Users.update({ is_email_verified: true }, { where: { id: user.id } });
        }

        const vr = CommonUtils.generateRandomString();
        const jwtToken = await Handler.generateToken({
          id: user.id,
          email: user.email,
          username: user.username,
          vr
        }, '24h');

        await Users.update({ login_token: jwtToken, vr }, { where: { id: user.id } });

        const history_data = {
          user_id: user.id,
          email: user.email,
          login_token: jwtToken,
          vr
        };
        await Login_History.create({
          user_id: user.id,
          email: user.email,
          login_token: jwtToken,
          vr: vr
        } as any);

        return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "Login Successfully!", {
          jwt: jwtToken,
          vr,
          user: {
            id: user.id,
            email: user.email,
            username: user.username
          }
        });
      } else {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC400, "Invalid Token!");
      }
    } catch (error: any) {
      console.error('Error From SSO-Login:- ', error);
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500);
    }
  }

  async signupService(req: any) {
    try {
      const { email, username, password } = req.body;

      // Check if user already exists
      const existingUser = await Users.findOne({ where: { email } });
      if (existingUser) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC409, "A user with this email already exists!");
      }

      // Validate password strength
      const passwordValidation = CommonUtils.validatePassword(password);
      if (!passwordValidation.status) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC400, passwordValidation.message);
      }

      // Hash the password
      const hashedPassword = await CommonUtils.hashPassword(password);

      // Create new user
      const newUser = await Users.create({
        username,
        email,
        password: hashedPassword,
        is_email_verified: false // User needs to verify email
      } as any);

      return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC201, "Account created successfully! Please verify your email.", {
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username
        }
      });

    } catch (error: any) {
      console.error('Error From Signup:- ', error);
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500);
    }
  }

}

export default new AuthService();
