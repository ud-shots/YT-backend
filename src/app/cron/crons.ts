import cron from 'node-cron';
import { Pending_Uplaod_Media } from '../../models/pending_upload_media';
import mediaProccess from './media_proccess';
import { UploadSchedulerService } from '../services/upload-scheduler.service';

// Global variable to prevent parallel execution
let isProcessing = false;

/**
 * Cron runs every minute - Database-driven implementation
 */
cron.schedule('* * * * *', async () => {
  console.log('⏱ Cron running (database-driven schedule-aware check)');
  
  // Prevent parallel execution
  if (isProcessing) {
    console.log('⚠️  Previous job still running, skipping...');
    return;
  }
  
  isProcessing = true;
  
  try {
    // Reset any stale pending videos (failed uploads from previous attempts)
    await UploadSchedulerService.resetStalePendingVideos();
    
    // Find if there's an active slot we can upload in
    const activeSlot = await UploadSchedulerService.findActiveSlot();
    
    if (!activeSlot) {
      console.log('❌ No active upload slot or max uploads reached for current time');
      return;
    }
    
    console.log(`✅ Inside active upload slot: ${activeSlot.slot.slot_name || 'N/A'}, uploads today: ${activeSlot.uploadCount}/${activeSlot.slot.max_uploads}`);
    
    // Find next video to upload with proper locking
    const pending = await UploadSchedulerService.findNextVideoToUpload();
    
    if (pending && pending.id) {
      console.log(`🚀 Processing media ID: ${pending.id}`);
      await mediaProccess(pending.id);
    } else {
      console.log('ℹ No pending media found for upload');
    }
    
  } catch (error) {
    console.error('🔥 Cron error:', error);
  } finally {
    isProcessing = false;
  }
});

// Keep the existing 15-second cron for health check
cron.schedule('*/15 * * * * *', async () => {
  console.log('Cron job running every 15 second');
  try {
    const response = await fetch('https://yt-backend-rvma.onrender.com/');

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.text();
    console.log('External API Response:', data);

  } catch (error) {
    console.error('Error calling external API:', error);
  }
});