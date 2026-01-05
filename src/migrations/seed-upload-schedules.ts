import { UploadSchedule } from '../models/upload_schedule';

/**
 * Sample data for upload schedules
 * This script can be used to seed initial schedule data
 */
export const seedUploadSchedules = async () => {
  try {
    // Check if schedules already exist to avoid duplicates
    const existingSchedules = await UploadSchedule.count();
    if (existingSchedules > 0) {
      console.log('Upload schedules already exist, skipping seed');
      return;
    }

    // Sample schedule data - Monday example with max 2 uploads (1 before noon, 1 after noon)
    const scheduleData: any[] = [
      // Monday
      {
        user_id: 'user-123', // Replace with actual user ID
        day: 'monday',
        start_time: '09:00:00',
        end_time: '11:59:59',
        max_uploads: 1,
        slot_name: 'morning',
        is_active: true
      },
      {
        user_id: 'user-123',
        day: 'monday',
        start_time: '12:00:00',
        end_time: '17:59:59',
        max_uploads: 1,
        slot_name: 'afternoon',
        is_active: true
      },
      // Tuesday
      {
        user_id: 'user-123',
        day: 'tuesday',
        start_time: '08:00:00',
        end_time: '10:59:59',
        max_uploads: 1,
        slot_name: 'morning',
        is_active: true
      },
      {
        user_id: 'user-123',
        day: 'tuesday',
        start_time: '14:00:00',
        end_time: '16:59:59',
        max_uploads: 1,
        slot_name: 'afternoon',
        is_active: true
      },
      // Wednesday
      {
        user_id: 'user-123',
        day: 'wednesday',
        start_time: '10:00:00',
        end_time: '12:59:59',
        max_uploads: 1,
        slot_name: 'morning',
        is_active: true
      },
      {
        user_id: 'user-123',
        day: 'wednesday',
        start_time: '18:00:00',
        end_time: '20:59:59',
        max_uploads: 1,
        slot_name: 'evening',
        is_active: true
      },
      // Thursday
      {
        user_id: 'user-123',
        day: 'thursday',
        start_time: '07:00:00',
        end_time: '09:59:59',
        max_uploads: 1,
        slot_name: 'morning',
        is_active: true
      },
      {
        user_id: 'user-123',
        day: 'thursday',
        start_time: '15:00:00',
        end_time: '17:59:59',
        max_uploads: 1,
        slot_name: 'afternoon',
        is_active: true
      },
      // Friday
      {
        user_id: 'user-123',
        day: 'friday',
        start_time: '11:00:00',
        end_time: '13:59:59',
        max_uploads: 1,
        slot_name: 'lunch',
        is_active: true
      },
      {
        user_id: 'user-123',
        day: 'friday',
        start_time: '19:00:00',
        end_time: '21:59:59',
        max_uploads: 1,
        slot_name: 'evening',
        is_active: true
      },
      // Saturday
      {
        user_id: 'user-123',
        day: 'saturday',
        start_time: '10:00:00',
        end_time: '12:59:59',
        max_uploads: 1,
        slot_name: 'morning',
        is_active: true
      },
      {
        user_id: 'user-123',
        day: 'saturday',
        start_time: '16:00:00',
        end_time: '18:59:59',
        max_uploads: 1,
        slot_name: 'afternoon',
        is_active: true
      },
      // Sunday - no uploads (is_active: false)
      {
        user_id: 'user-123',
        day: 'sunday',
        start_time: '14:00:00',
        end_time: '16:59:59',
        max_uploads: 1,
        slot_name: 'afternoon',
        is_active: false
      }
    ];

    await UploadSchedule.bulkCreate(scheduleData);
    console.log('Upload schedules seeded successfully');
  } catch (error) {
    console.error('Error seeding upload schedules:', error);
  }
};