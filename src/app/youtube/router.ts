import express from 'express'
import YoutubeService from './service'
import dtoValidationMiddleware from '../../middleware/validation';
import { RES_MESSAGE, RES_STATUS, STATUS_CODE } from '../../common/statusMessageCode';
import Handler from '../../common/handler';
import { callback, uploadVideo } from '../../dto/youtube';
import handleAuthorization from '../../middleware/handleAuthorization';
import upload from '../../middleware/multer';
import { loggingMiddleware } from '../../middleware/logging';

class YoutubeRouterClass {
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private async getYoutubeConsentUrl(req: any, res: any): Promise<void> {
    try {
      const result = await YoutubeService.getYoutubeConsentUrl(req);
      res.status(result?.success?.statusCode || result?.error?.statusCode).json(result);
    } catch (error: any) {
      res.status(STATUS_CODE.EC500).json(Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500));
    }
  }

  private async uploadVideo(req: any, res: any): Promise<void> {
    try {
      const result = await YoutubeService.uploadVideo(req);
      res.status(result?.success?.statusCode || result?.error?.statusCode).json(result);
    } catch (error: any) {
      res.status(STATUS_CODE.EC500).json(Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500));
    }
  }

   private async uploadVideoApp(req: any, res: any): Promise<void> {
    try {
      const result = await YoutubeService.uploadVideoApp(req);
      res.status(result?.success?.statusCode || result?.error?.statusCode).json(result);
    } catch (error: any) {
      res.status(STATUS_CODE.EC500).json(Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500));
    }
  }

  private initializeRoutes(): void {
    this.router.get("/url", handleAuthorization, loggingMiddleware('YouTube', 'getConsentUrl'), this.getYoutubeConsentUrl)
    this.router.get("/callback", loggingMiddleware('YouTube', 'callback'), YoutubeService.youtubeCallback)
    this.router.post("/upload-video-app", dtoValidationMiddleware(uploadVideo), loggingMiddleware('YouTube', 'uploadVideoApp'), this.uploadVideoApp)
    this.router.post("/upload-video", handleAuthorization, upload.single("file"), dtoValidationMiddleware(uploadVideo), loggingMiddleware('YouTube', 'uploadVideo'), this.uploadVideo)
  }
}

export default new YoutubeRouterClass().router;
