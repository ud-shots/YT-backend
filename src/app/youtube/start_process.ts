import { uploadVideoWithSEO } from "./auto_video_upload_process";
import { downloadVideo } from "./download_video";
import { analyzeVideoForYouTubeSEO } from "./generate_video_details";
import { Videos } from "../../models/videos";
import { Users } from "../../models/users";
import { postToFacebook, postToInstagram } from "../facebook/auto.posts";
import { FacebookCredential } from "../../models/facebook_credential";
import Logger from "../../common/logger";

export async function autoUploadVideo(type: string, data: any, file: any | null = null, user_id: string, video_id: string) {

    let path = null;

    try {
        if (type === 'url') {
            let outputPath = `${process.cwd()}/public/uploads/videos`;
            path = await downloadVideo(data.url, outputPath);
        } else {
            path = file.filename;
        }

        const find_user: any = await Users.findByPk(user_id, { raw: true });

        if (find_user) {

            console.log('✅ Video saved at:', path);


            // Extract file extension and validate if it's a video file
            const fileExtension = path.split('.').pop()?.toLowerCase();
            const validVideoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm'];
            const mediaType = fileExtension ? validVideoExtensions.includes(fileExtension) ? 'video' : 'image' : 'image';

            let full_path = `${process.cwd()}/public/uploads/videos/${path}`;
            const seo = await analyzeVideoForYouTubeSEO(
                full_path,
                "Give a detailed YouTube SEO optimized title, description, tags and keywords for this yt legender car delivery short video"
            );
            console.log('seo', seo)

            const find_facebook_credential = await FacebookCredential.findOne({
                where: { user_id },
                raw: true
            });

            if (find_facebook_credential) {
                const facebook = await postToFacebook(find_facebook_credential?.page_id || '', find_facebook_credential?.page_access_token || '', full_path, seo.title, mediaType)
                const insta = await postToInstagram(find_facebook_credential?.insta_business_account_id || '', find_facebook_credential?.page_access_token || '', full_path, seo.title, mediaType)
            }
            const youtube = await uploadVideoWithSEO(full_path, seo, data.visibility, data?.date || null, user_id, video_id)
            console.log('youtube-=----------------->', youtube)

            // Delete the uploaded video file after processing
            const fs = require('fs');
            const directoryPath = `${process.cwd()}/public/uploads/videos/`;
            if (fs.existsSync(directoryPath)) {
                const files = fs.readdirSync(directoryPath);
                for (const file of files) {
                    const filePath = `${directoryPath}${file}`;
                    if (fs.statSync(filePath).isFile()) {
                        fs.unlinkSync(filePath);
                        console.log('🗑️  Deleted video file:', filePath);
                    }
                }
            }

            console.log('directory cleaned-=----------------->', youtube)

        }

    } catch (error: any) {
        // Create a mock request object for logging purposes
        const mockReq: any = { 
            method: 'POST', 
            url: '/youtube/auto-upload', 
            headers: {}, 
            body: {}, 
            user: { id: user_id },
            userId: user_id
        };
        
        await Logger.logError(error, mockReq, 'YouTube', 'autoUploadVideo', 'Error in auto upload video process');

        // Update video status to 'blocked' if there was an error
        await Videos.update({
            status: 'blocked',
            rejection_reason: error.message || 'Unknown error occurred during upload'
        }, {
            where: {
                id: video_id
            }
        });
    }
}
