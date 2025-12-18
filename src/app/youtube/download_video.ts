import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const execPromise = promisify(exec);

/**
 * Downloads a video from YouTube, Facebook, or Instagram in highest quality
 * @param url - Video URL from supported platforms
 * @param folderPath - Local folder path where video will be saved
 * @param retries - Number of retry attempts (default: 3)
 * @returns Promise<string> - Returns the full path of the downloaded video file
 */
export async function downloadVideo(
  url: string, 
  folderPath: string, 
  retries: number = 3
): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Ensure the directory exists
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      // Generate unique filename using timestamp and random hash
      const timestamp = Date.now();
      const randomHash = crypto.randomBytes(8).toString('hex');
      const uniqueFilename = `video_${timestamp}_${randomHash}.mp4`;
      const outputPath = path.join(folderPath, uniqueFilename);

      // Clean URL (remove tracking parameters)
      const cleanedUrl = cleanUrl(url);
      
      // Detect platform for optimized download command
      const platform = detectPlatform(cleanedUrl);
      
      let command: string;
      
      if (platform === 'youtube') {
        // Enhanced YouTube command with anti-403 measures
        command = `yt-dlp -f "best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best" --merge-output-format mp4 --no-check-certificates --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" --referer "https://www.youtube.com/" -o "${outputPath}" "${cleanedUrl}"`;
      } else if (platform === 'facebook') {
        // Facebook optimized command
        command = `yt-dlp -f "best[ext=mp4]/best" --merge-output-format mp4 --no-check-certificates -o "${outputPath}" "${cleanedUrl}"`;
      } else if (platform === 'instagram') {
        // Instagram optimized command
        command = `yt-dlp -f "best[ext=mp4]/best" --merge-output-format mp4 --no-check-certificates -o "${outputPath}" "${cleanedUrl}"`;
      } else {
        throw new Error('Unsupported platform. Please provide a YouTube, Facebook, or Instagram URL.');
      }

      console.log(`Attempt ${attempt}/${retries}: Downloading ${platform} video in highest quality...`);
      console.log(`Output: ${outputPath}`);
      
      // Execute download command with increased buffer
      const { stdout, stderr } = await execPromise(command, {
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer for large outputs
      });
      
      if (stderr && !stderr.includes('Deleting original file')) {
        console.log('Download info:', stderr);
      }
      
      // Verify file exists and has content
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        
        if (stats.size === 0) {
          fs.unlinkSync(outputPath); // Delete empty file
          throw new Error('Downloaded file is empty');
        }
        
        console.log(`✓ Download completed successfully!`);
        console.log(`✓ File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`✓ Saved at: ${outputPath}`);
        return uniqueFilename;
        // return outputPath;
      } else {
        throw new Error('Video file was not created');
      }
      
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      
      // Retry with exponential backoff
      if (attempt < retries) {
        const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
        console.log(`⏳ Retrying in ${waitTime / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw new Error(`Download failed after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Cleans URL by removing tracking parameters
 * @param url - Original URL
 * @returns Cleaned URL
 */
function cleanUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // For YouTube, keep only essential parameters
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
      return urlObj.hostname.includes('youtu.be') 
        ? `https://www.youtube.com/watch?v=${videoId}`
        : `https://www.youtube.com/watch?v=${videoId}`;
    }
    
    // For other platforms, remove query parameters
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
  } catch {
    // If URL parsing fails, return original
    return url.split('?')[0];
  }
}

/**
 * Detects the platform from URL
 * @param url - Video URL
 * @returns Platform name
 */
function detectPlatform(url: string): 'youtube' | 'facebook' | 'instagram' | 'unknown' {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'youtube';
  } else if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch') || lowerUrl.includes('fb.com')) {
    return 'facebook';
  } else if (lowerUrl.includes('instagram.com')) {
    return 'instagram';
  }
  return 'unknown';
}