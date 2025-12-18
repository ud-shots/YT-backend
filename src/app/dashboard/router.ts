import express from 'express'
import DashboardService from './service'
import { RES_MESSAGE, RES_STATUS, STATUS_CODE } from '../../common/statusMessageCode'
import Handler from '../../common/handler'
import handleAuthorization from '../../middleware/handleAuthorization'

class DashboardRouterClass {
  public router = express.Router()

  constructor() {
    this.initializeRoutes()
  }

  private async getDashboardStats(req: any, res: any): Promise<void> {
    try {
      const result = await DashboardService.getDashboardStats(req)
      res.status(result?.success?.statusCode || result?.error?.statusCode).json(result)
    } catch (error: any) {
      res.status(STATUS_CODE.EC500).json(Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500))
    }
  }

  private async getVideos(req: any, res: any): Promise<void> {
    try {
      const result = await DashboardService.getVideos(req)
      res.status(result?.success?.statusCode || result?.error?.statusCode).json(result)
    } catch (error: any) {
      res.status(STATUS_CODE.EC500).json(Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500))
    }
  }

  private async deleteVideo(req: any, res: any): Promise<void> {
    try {
      const result = await DashboardService.deleteVideo(req)
      res.status(result?.success?.statusCode || result?.error?.statusCode).json(result)
    } catch (error: any) {
      res.status(STATUS_CODE.EC500).json(Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500))
    }
  }

  private initializeRoutes(): void {
    this.router.get("/stats", handleAuthorization, this.getDashboardStats)
    this.router.get("/videos", handleAuthorization, this.getVideos)
    this.router.delete("/videos/:id", handleAuthorization, this.deleteVideo)
  }
}

export default new DashboardRouterClass().router