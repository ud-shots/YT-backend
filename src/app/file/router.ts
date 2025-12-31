import express from 'express'
import FileService from './service'
import { RES_MESSAGE, RES_STATUS, STATUS_CODE } from '../../common/statusMessageCode'
import Handler from '../../common/handler'


class FileRouterClass {
  public router = express.Router()

  constructor() {
    this.initializeRoutes()
  }

  private async clearFiles(req: any, res: any): Promise<void> {
    try {
      const result = await FileService.clearFiles(req)
      res.status(result?.success?.statusCode || result?.error?.statusCode).json(result)
    } catch (error: any) {
      res.status(STATUS_CODE.EC500).json(Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500))
    }
  }

  private initializeRoutes(): void {
    this.router.get("/clear-all-file", this.clearFiles)
    this.router.get("/:name", FileService.getFile)
  }
}

export default new FileRouterClass().router