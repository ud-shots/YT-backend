import { RES_MESSAGE, RES_STATUS, STATUS_CODE } from "../../common/statusMessageCode"
import Handler from "../../common/handler"
import { Videos } from "../../models/videos"
import { Op } from "sequelize"

class DashboardService {

  async getDashboardStats(req: any) {
    try {
      const { userId } = req

      // Get all videos for this user
      const videos = await Videos.findAll({
        where: {
          user_id: userId
        }
      })

      // Calculate stats
      const totalViews = videos.reduce((sum, video) => sum + (video.views || 0), 0)
      const totalLikes = videos.reduce((sum, video) => sum + (video.likes || 0), 0)
      
      const pendingUploads = videos.filter(video => 
        ['uploading', 'processing', 'checking'].includes(video.status || '')
      ).length
      
      const scheduledVideos = videos.filter(video => 
        video.status === 'scheduled'
      ).length

      const data = {
        totalViews,
        totalLikes,
        pendingUploads,
        scheduledVideos
      }

      return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "Stats fetched successfully!", data)
    } catch (error: any) {
      console.log('Error fetching dashboard stats:', error)
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500)
    }
  }

  async getVideos(req: any) {
    try {
      const { userId } = req
      const { limit = 20, offset = 0 } = req.query

      // Get videos for this user with pagination
      const { rows: videos, count } = await Videos.findAndCountAll({
        where: {
          user_id: userId
        },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      })

      const data = {
        videos: videos.map(video => ({
          id: video.id,
          filename: video.filename,
          title: video.title,
          description: video.description,
          thumbnail_url: video.thumbnail_url,
          status: video.status,
          progress: video.progress,
          views: video.views,
          likes: video.likes,
          comments: video.comments,
          scheduled_at: video.scheduled_at,
          published_at: video.published_at,
          createdAt: video.createdAt,
          visibility: video.visibility
        })),
        totalCount: count,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }

      return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "Videos fetched successfully!", data)
    } catch (error: any) {
      console.log('Error fetching videos:', error)
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500)
    }
  }

  async deleteVideo(req: any) {
    try {
      const { userId } = req
      const { id } = req.params

      // Find the video and check ownership
      const video = await Videos.findOne({
        where: {
          id,
          user_id: userId
        }
      })

      if (!video) {
        return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC404, "Video not found!")
      }

      // Delete the video
      await video.destroy()

      return Handler.Success(RES_STATUS.E1, STATUS_CODE.EC200, "Video deleted successfully!", null)
    } catch (error: any) {
      console.log('Error deleting video:', error)
      return Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, RES_MESSAGE.EM500)
    }
  }
}

export default new DashboardService()