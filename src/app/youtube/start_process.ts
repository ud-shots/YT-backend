import { uploadVideoWithSEO } from "./auto_video_upload_process";
import { downloadVideo } from "./download_video";
import { analyzeVideoForYouTubeSEO } from "./generate_video_details";
import { Videos } from "../../models/videos";

export async function autoUploadVideo(type: string, data: any, file: any | null = null, user_id: string, video_id: string) {

    let path = null;

    try {
        if (type === 'url') {
            let outputPath = `${process.cwd()}/public/uploads/videos`;
            path = await downloadVideo(data.url, outputPath);
        } else {
            path = file.filename;
        }

        console.log('✅ Video saved at:', path);

        let full_path = `${process.cwd()}/public/uploads/videos/${path}`
        const seo = await analyzeVideoForYouTubeSEO(
            full_path,
            "Give a detailed YouTube SEO optimized title, description, tags and keywords for this yt legender car delivery short video"
        );
        console.log('seo', seo)

        const youtube = await uploadVideoWithSEO(full_path, seo, data.visibility, data?.date || null, user_id, video_id)
        console.log('youtube-=----------------->', youtube)
    } catch (error:any) {
        console.error('Error in autoUploadVideo:', error);
        
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
