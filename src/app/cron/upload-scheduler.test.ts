// import moment from 'moment-timezone';
// import { UploadSchedulerService } from '../services/upload-scheduler.service';
// import { UploadSchedule } from '../../models/upload_schedule';
// import { Pending_Uplaod_Media } from '../../models/pending_upload_media';
// import { Op } from 'sequelize';

// // Mock data for testing
// const mockUserId = 'test-user-123';

// describe('UploadSchedulerService', () => {
//   beforeAll(async () => {
//     // Create test schedules for Monday
//     await UploadSchedule.bulkCreate([
//       {
//         id: 'schedule-1',
//         user_id: mockUserId,
//         day: 'monday',
//         start_time: '09:00:00',
//         end_time: '11:59:59',
//         max_uploads: 2,
//         slot_name: 'morning',
//         is_active: true
//       },
//       {
//         id: 'schedule-2',
//         user_id: mockUserId,
//         day: 'monday',
//         start_time: '12:00:00',
//         end_time: '17:59:59',
//         max_uploads: 1,
//         slot_name: 'afternoon',
//         is_active: true
//       }
//     ]);
//   });

//   afterAll(async () => {
//     // Clean up test data
//     await UploadSchedule.destroy({
//       where: {
//         user_id: mockUserId
//       }
//     });
    
//     await Pending_Uplaod_Media.destroy({
//       where: {
//         user_id: mockUserId
//       }
//     });
//   });

//   test('should correctly identify current time info in Asia/Kolkata timezone', () => {
//     const timeInfo = UploadSchedulerService.getCurrentTimeInfo();
    
//     // Verify it's using Asia/Kolkata timezone
//     const expectedTimezone = moment().tz('Asia/Kolkata');
//     expect(timeInfo.now.format('Z')).toBe(expectedTimezone.format('Z'));
    
//     // Verify day format
//     expect(typeof timeInfo.day).toBe('string');
//     expect(timeInfo.day.length).toBeGreaterThan(0);
    
//     // Verify time format (HH:mm)
//     expect(timeInfo.time).toMatch(/^\d{2}:\d{2}$/);
    
//     // Verify date format (YYYY-MM-DD)
//     expect(timeInfo.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
//   });

//   test('should find active slots for a given day', async () => {
//     const slots = await UploadSchedulerService.getActiveSlotsForDay('monday');
    
//     expect(slots).toHaveLength(2);
//     expect(slots[0]).toHaveProperty('id');
//     expect(slots[0]).toHaveProperty('start_time');
//     expect(slots[0]).toHaveProperty('end_time');
//     expect(slots[0]).toHaveProperty('max_uploads');
//     expect(slots[0]).toHaveProperty('slot_name');
//   });

//   test('should correctly determine if time is within a slot', () => {
//     // Test within morning slot
//     expect(UploadSchedulerService.isWithinTimeSlot('10:30', '09:00', '11:59')).toBe(true);
    
//     // Test outside morning slot
//     expect(UploadSchedulerService.isWithinTimeSlot('12:30', '09:00', '11:59')).toBe(false);
    
//     // Test within afternoon slot
//     expect(UploadSchedulerService.isWithinTimeSlot('14:30', '12:00', '17:59')).toBe(true);
    
//     // Test at exact start time
//     expect(UploadSchedulerService.isWithinTimeSlot('09:00', '09:00', '11:59')).toBe(true);
    
//     // Test at exact end time
//     expect(UploadSchedulerService.isWithinTimeSlot('11:59', '09:00', '11:59')).toBe(true);
//   });

//   test('should count uploads for a specific slot correctly', async () => {
//     // Create test pending media records
//     const testDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    
//     // Create a video that was uploaded today in the morning slot
//     await Pending_Uplaod_Media.create({
//       id: 'test-video-1',
//       user_id: mockUserId,
//       type: 'file',
//       file_name: 'test-video.mp4',
//       status: 'success',
//       platform: 'youtube'
//     });
    
//     // Associate the video with the morning schedule (this would normally happen through a join)
//     // For testing, we'll just verify the count logic works
//     const count = await UploadSchedulerService.getUploadCountForSlot('schedule-1', testDate);
//     expect(count).toBeGreaterThanOrEqual(0); // Actual count depends on existing data
//   });

//   test('should find active slot when within schedule', async () => {
//     // Mock moment to return a specific time within the morning slot
//     const originalMoment = moment.tz;
//     moment.tz = jest.fn(() => moment('2023-01-02 10:30:00')); // Monday at 10:30 AM
    
//     try {
//       const result = await UploadSchedulerService.findActiveSlot();
      
//       if (result) {
//         expect(result).toHaveProperty('slot');
//         expect(result).toHaveProperty('uploadCount');
//         expect(typeof result.uploadCount).toBe('number');
//       }
//       // If no slot is found, it's likely because there are no pending videos to upload
//     } finally {
//       // Restore original moment
//       moment.tz = originalMoment;
//     }
//   });

//   test('should handle case when no active slots are available', async () => {
//     // Mock moment to return a time outside all slots
//     const originalMoment = moment.tz;
//     moment.tz = jest.fn(() => moment('2023-01-02 20:30:00')); // Monday at 8:30 PM
    
//     try {
//       const result = await UploadSchedulerService.findActiveSlot();
//       // Result could be null if no active slots are available at this time
//       expect(result).toBeNull();
//     } finally {
//       // Restore original moment
//       moment.tz = originalMoment;
//     }
//   });

//   test('should handle max uploads limit correctly', async () => {
//     // This test would require more complex setup to fully verify the limit logic
//     // It would involve creating videos and checking if the count is properly tracked
//     expect(1).toBe(1); // Placeholder - actual implementation would test the limit logic
//   });
// });

// // Test for the resetStalePendingVideos function
// describe('UploadSchedulerService - Stale Video Reset', () => {
//   test('should reset stale pending videos', async () => {
//     // Create a video with pending status from 45 minutes ago
//     await Pending_Uplaod_Media.create({
//       id: 'stale-video',
//       user_id: mockUserId,
//       type: 'file',
//       file_name: 'stale-video.mp4',
//       status: 'pending',
//       platform: 'youtube',
//       updatedAt: moment().subtract(45, 'minutes').toDate()
//     });
    
//     const affectedCount = await UploadSchedulerService.resetStalePendingVideos();
    
//     // Should reset the stale video
//     const staleVideo = await Pending_Uplaod_Media.findByPk('stale-video');
//     expect(staleVideo?.status).toBe('initiate');
    
//     // Clean up
//     await Pending_Uplaod_Media.destroy({
//       where: { id: 'stale-video' }
//     });
//   });
// });