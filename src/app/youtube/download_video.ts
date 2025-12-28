import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import Logger from "../../common/logger";

const execPromise = promisify(exec);

/**
 * Downloads a video from YouTube, Facebook, or Instagram in highest quality
 * @param url - Video URL from supported platforms
 * @param folderPath - Local folder path where video will be saved
 * @param retries - Number of retry attempts (default: 3)
 * @returns Promise<string> - Returns the full path of the downloaded video file
 */

export async function downloadVideo(url: string, folderPath: string, retries: number = 3): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Ensure the directory exists
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const fileExtension = 'mp4';
      // Generate unique filename using timestamp and random hash
      const timestamp = Date.now();
      const randomHash = crypto.randomBytes(8).toString('hex');
      const uniqueFilename = `video_${timestamp}_${randomHash}.${fileExtension}`;
      const outputPath = path.join(folderPath, uniqueFilename);

      const cleanedUrl = cleanUrl(url);
      const platform = detectPlatform(cleanedUrl);

      let command: string;

      if (platform === 'youtube') {
        command = `yt-dlp -f "best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best" --merge-output-format mp4 --no-check-certificates --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" --referer "https://www.youtube.com/" -o "${outputPath}" "${cleanedUrl}"`;
      } else if (platform === 'facebook') {
        command = `yt-dlp -f "best[ext=mp4]/best" --merge-output-format mp4 --no-check-certificates -o "${outputPath}" "${cleanedUrl}"`;
      } else if (platform === 'instagram') {
        let cookiesPath = `${process.cwd()}/public/cookies/www.instagram.com_cookies.txt`

        command = `yt-dlp \
  --cookies "${cookiesPath}" \
  --force-ipv4 \
  -f "best[ext=mp4]/best" \
  --merge-output-format mp4 \
  -o "${outputPath}" \
  "${cleanedUrl}"`;

      } else {
        throw new Error('Unsupported platform. Please provide a YouTube, Facebook, or Instagram URL.');
      }

      console.log(`Attempt ${attempt}/${retries}: Downloading ${platform} video in highest quality...`);
      console.log(`Output: ${outputPath}`);

      const { stdout, stderr } = await execPromise(command, { maxBuffer: 1024 * 1024 * 10 });

      if (stderr && !stderr.includes('Deleting original file')) {
        console.log('Download info:', stderr);
      }

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
      } else {
        throw new Error('Video file was not created');
      }

    } catch (error: any) {
      lastError = error;

      const mockReq: any = { method: 'POST', url: '/youtube/download-video', headers: {}, body: { url, folderPath }, userId: 'system' };
      await Logger.logError(error, mockReq, 'YouTube', 'downloadVideo', `Attempt ${attempt} failed: ${error.message}`);

      if (attempt < retries) {
        const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
        console.log(`⏳ Retrying in ${waitTime / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  const finalError = new Error(`Download failed after ${retries} attempts: ${lastError?.message}`);

  const mockReq: any = { method: 'POST', url: '/youtube/download-video', headers: {}, body: { url, folderPath }, userId: 'system' };
  await Logger.logError(finalError, mockReq, 'YouTube', 'downloadVideo', 'Download failed after all retries');

  throw finalError;
}

/**
 * Cleans URL by removing tracking parameters
 * @param url - Original URL
 * @returns Cleaned URL
 */
function cleanUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
      return urlObj.hostname.includes('youtu.be') ? `https://www.youtube.com/watch?v=${videoId}` : `https://www.youtube.com/watch?v=${videoId}`;
    }
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
  } catch {
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