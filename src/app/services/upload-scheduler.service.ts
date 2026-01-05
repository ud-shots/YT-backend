import { Pending_Uplaod_Media } from '../../models/pending_upload_media';
import { UploadSchedule } from '../../models/upload_schedule';
import moment from 'moment-timezone';
import { Op } from 'sequelize';

/**
 * Upload Scheduler Service
 * Handles database-driven video upload scheduling with time slots and limits
 */
export class UploadSchedulerService {
  
  /**
   * Get current day and time in Asia/Kolkata timezone
   */
  static getCurrentTimeInfo() {
    const now = moment.tz('Asia/Kolkata');
    return {
      now,
      day: now.format('dddd').toLowerCase(), // monday, tuesday, etc.
      time: now.format('HH:mm'), // HH:mm format
      date: now.format('YYYY-MM-DD') // for daily counts
    };
  }

  /**
   * Find active time slots for current day from database
   */
  static async getActiveSlotsForDay(day: string) {
    const slots = await UploadSchedule.findAll({
      where: {
        day: day,
        is_active: true
      },
      order: [['start_time', 'ASC']]
    });
    
    return slots.map(slot => ({
      id: slot.id!,
      start_time: slot.start_time!,
      end_time: slot.end_time!,
      max_uploads: slot.max_uploads!,
      slot_name: slot.slot_name,
      user_id: slot.user_id
    }));
  }

  /**
   * Check if current time is within a specific time slot
   */
  static isWithinTimeSlot(currentTime: string, startTime: string, endTime: string): boolean {
    const current = moment(currentTime, 'HH:mm');
    const start = moment(startTime, 'HH:mm');
    const end = moment(endTime, 'HH:mm');
    
    // Handle case where time slot crosses midnight
    if (end.isBefore(start)) {
      return current.isSameOrAfter(start) || current.isSameOrBefore(end);
    }
    
    return current.isBetween(start, end, undefined, '[]');
  }

  /**
   * Count how many videos have been uploaded today for a specific slot
   */
  static async getUploadCountForSlot(slotId: string, date: string) {
    const count = await Pending_Uplaod_Media.count({
      where: {
        createdAt: {
          [Op.gte]: moment(date).startOf('day').toDate(),
          [Op.lt]: moment(date).endOf('day').toDate()
        },
        status: {
          [Op.in]: ['success', 'uploading', 'pending'] // Videos that are uploaded, in progress, or being processed
        }
      },
      include: [{
        model: UploadSchedule,
        as: 'schedule',
        attributes: [],
        where: {
          id: slotId
        },
        required: true // Inner join
      }]
    });
    
    return count;
  }

  /**
   * Find active slot for current time from database
   */
  static async findActiveSlot(): Promise<{ slot: any; uploadCount: number } | null> {
    const { day, time, date } = this.getCurrentTimeInfo();
    
    // Get all active slots for the current day
    const slots = await this.getActiveSlotsForDay(day);
    
    for (const slot of slots) {
      if (this.isWithinTimeSlot(time, slot.start_time, slot.end_time)) {
        const uploadCount = await this.getUploadCountForSlot(slot.id, date);
        
        // Check if we've reached the max uploads for this slot
        if (uploadCount < slot.max_uploads) {
          return { slot, uploadCount };
        }
      }
    }
    
    return null;
  }

  /**
   * Find next available video to upload with proper locking
   */
  static async findNextVideoToUpload() {
    // First, find the oldest pending video
    const pendingVideo = await Pending_Uplaod_Media.findOne({
      where: { 
        status: 'initiate' 
      },
      order: [['createdAt', 'ASC']],
      raw: true
    });
    
    if (pendingVideo) {
        return pendingVideo;
    }
    
    return null;
  }
  
  /**
   * Reset stale 'pending' statuses
   * This helps recover from failed uploads that didn't complete properly
   */
  static async resetStalePendingVideos() {
    // Find videos that have been in 'pending' status for more than 30 minutes
    const thirtyMinutesAgo = moment().subtract(30, 'minutes').toDate();
    
    const [affectedRows] = await Pending_Uplaod_Media.update(
      { 
        status: 'initiate',
        updatedAt: new Date()
      },
      {
        where: { 
          status: 'pending',
          updatedAt: {
            [Op.lt]: thirtyMinutesAgo
          }
        }
      }
    );
    
    if (affectedRows > 0) {
      console.log(`Reset ${affectedRows} stale pending videos back to 'initiate'`);
    }
    
    return affectedRows;
  }
}