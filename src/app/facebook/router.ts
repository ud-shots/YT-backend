import express from 'express'
import FacebookService from './service'
import { RES_MESSAGE, RES_STATUS, STATUS_CODE } from '../../common/statusMessageCode'
import Handler from '../../common/handler'
import handleAuthorization from '../../middleware/handleAuthorization'
import dtoValidationMiddleware from '../../middleware/validation'
import { FinalConnect, GetFacebookAccessToken } from '../../dto/facebook'
import { loggingMiddleware } from '../../middleware/logging'

class FacebookRouterClass {
  public router = express.Router()

  constructor() {
    this.initializeRoutes()
  }

  private async getFacebookAccessToken(req: any, res: any): Promise<void> {
    try {
      const result = await FacebookService.getFacebookAccessToken(req)
      res.status(result?.success?.statusCode || result?.error?.statusCode).json(result)
    } catch (error: any) {
      res.status(STATUS_CODE.EC500).json(Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500))
    }
  }

   private async finalConnect(req: any, res: any): Promise<void> {
    try {
      const result = await FacebookService.finalConnect(req)
      res.status(result?.success?.statusCode || result?.error?.statusCode).json(result)
    } catch (error: any) {
      res.status(STATUS_CODE.EC500).json(Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500))
    }
  }

  private initializeRoutes(): void {
    this.router.post("/get-access-token", handleAuthorization, dtoValidationMiddleware(GetFacebookAccessToken), loggingMiddleware('Facebook', 'getAccessToken'), this.getFacebookAccessToken)
    this.router.post("/final-connect", handleAuthorization, dtoValidationMiddleware(FinalConnect), loggingMiddleware('Facebook', 'finalConnect'), this.finalConnect)

  }
}

export default new FacebookRouterClass().router