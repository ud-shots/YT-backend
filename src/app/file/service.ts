import { RES_MESSAGE, RES_STATUS, STATUS_CODE } from "../../common/statusMessageCode"
import Handler from "../../common/handler"

class FileService {

  async clearFiles(req: any) {
    try {

      const path = `${process.cwd()}/public/uploads/media`;
      const fs = require('fs');

      if (fs.existsSync(path)) {
        const files = fs.readdirSync(path);
        for (const file of files) {
          const filePath = `${path}/${file}`;
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        }
      }

      return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, 'File deleted!', null)

    } catch (error: any) {
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500)
    }
  }

  async getFile(req: any, res: any) {
    try {
      const { name } = req.params
      const path = `${process.cwd()}/public/uploads/media/${name}`;

      // Check if file exists and send it directly
      const fs = require('fs');
      if (!fs.existsSync(path)) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC404, 'File not found');
      }

      // Set appropriate headers for file streaming
      const stats = fs.statSync(path);
      const fileSize = stats.size;
      const range = req.headers.range;

      if (range) {
        // Handle partial content requests (for video streaming)
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;

        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        };

        res.writeHead(206, head);
        const readStream = fs.createReadStream(path, { start, end });
        return readStream.pipe(res);
      } else {
        // Send full file
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        });
        const readStream = fs.createReadStream(path);
        return readStream.pipe(res);
      }

    } catch (error: any) {
    }
  }

}

export default new FileService()