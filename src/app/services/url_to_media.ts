import Handler from "../../common/handler"
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
type Platform = 'youtube' | 'facebook' | 'instagram';

const execPromise = util.promisify(exec);

async function executeWithRetry(command: string, outputDir: string, jobId: string, retries = 3) {
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {

            console.log(`▶ Attempt ${attempt}/${retries}`);
            await execPromise(command, { maxBuffer: 1024 * 1024 * 20 });

            // 🔍 Find files created by this job
            const files = fs.readdirSync(outputDir).filter(file => file.startsWith(jobId));

            if (!files.length) {
                throw new Error('Command executed but no files were created');
            }

            return { status: true, data: { files }, message: 'Command executed successfully' };

        } catch (error: any) {
            lastError = error;

            console.error(`✗ Attempt ${attempt} failed:`, error.message);
            fs.readdirSync(outputDir).filter(file => file.startsWith(jobId)).forEach(file => fs.unlinkSync(path.join(outputDir, file)));

            if (attempt < retries) {
                const waitTime = Math.pow(2, attempt) * 1000;
                await new Promise(res => setTimeout(res, waitTime));
            }
        }
    }

    return {
        status: false,
        message: `Command failed after ${retries} attempts: ${lastError?.message}`
    };
}


export async function cleanShareUrl(user_id: string, pending_upload_media_id: string, url: string, platform: string) {
    try {
        const parsed = new URL(url);
        return { status: true, data: { url: `${parsed.protocol}//${parsed.hostname}${parsed.pathname}` } }
    } catch (error: any) {
        await Handler.addLogs(user_id, pending_upload_media_id, 'Invalid URL', platform)
        return { status: false, message: 'Invalid URL' }; // fallback if invalid
    }
}


const buildYtDlpCommand = (platform: Platform, cleanedUrl: string, jobId: string, outputDir: string) => {

    const cookiesPath = `${process.cwd()}/public/cookies/www.instagram.com_cookies.txt`;
    const outputTemplate = `${outputDir}/${jobId}_%(playlist_index)s.%(ext)s`;

    switch (platform) {
        case 'youtube':
            return { status: true, data: { command: `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 --no-check-certificates --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" --referer "https://www.youtube.com/" -o "${outputTemplate}" "${cleanedUrl}"` } };

        case 'facebook':
            return { status: true, data: { command: `yt-dlp -f "best" --no-check-certificates -o "${outputTemplate}" "${cleanedUrl}"` } };

        case 'instagram':
            return { status: true, data: { command: `yt-dlp --cookies "${cookiesPath}" --force-ipv4 -f "best" -o "${outputTemplate}" "${cleanedUrl}"` } };

        default:
            return { status: false, message: 'Unsupported platform' }
    }
};


const urlToMedia = async (user_id: string, pending_upload_media_id: string, url: string, platform: string) => {

    try {

        if (platform == 'unknown') {
            await Handler.addLogs(user_id, pending_upload_media_id, 'Unsupported platform', 'Cron Job')
            return { status: false, message: 'Unsupported platform' }
        }

        const cleanedUrl: any = await cleanShareUrl(user_id, pending_upload_media_id, url, platform);

        if (!cleanedUrl.status) {
            return { status: false, message: cleanedUrl.message };
        }

        const outputDir = `${process.cwd()}/public/uploads/media`;

        const jobId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const command: any = buildYtDlpCommand(platform as Platform, cleanedUrl.data.url, jobId, outputDir);

        if (!command.status) {
            await Handler.addLogs(user_id, pending_upload_media_id, command.message, platform)
            return { status: false, message: command.message };
        }

        const data = await executeWithRetry(command.data?.command || '', outputDir, jobId, 3);

        if (!data.status) {
            await Handler.addLogs(user_id, pending_upload_media_id, data.message, platform)
            return { status: false, message: data.message };
        }
        
        return { status: true, data: { file_name: data.data?.files[0] } }

    } catch (error: any) {
        await Handler.addLogs(user_id, pending_upload_media_id, error.message, platform)
        return { status: false, message: error.message };
    }
}


export { urlToMedia }