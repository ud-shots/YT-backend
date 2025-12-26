import { uploadVideoWithSEO } from "./auto_video_upload_process";
import { downloadVideo } from "./download_video";
import { analyzeVideoForYouTubeSEO } from "./generate_video_details";
import { Videos } from "../../models/videos";
import { Users } from "../../models/users";
import { postToFacebook, postToInstagram } from "../facebook/auto.posts";
import { FacebookCredential } from "../../models/facebook_credential";

export async function autoUploadVideo(type: string, data: any, file: any | null = null, user_id: string, video_id: string) {

    let path = null;

    try {
        if (type === 'url') {
            let outputPath = `${process.cwd()}/public/uploads/videos`;
            // path = await downloadVideo(data.url, outputPath);
        } else {
            path = file.filename;
        }

        const find_user: any = await Users.findByPk(user_id, { raw: true });

        if (find_user) {

            console.log('✅ Video saved at:', path);


            // Extract file extension and validate if it's a video file
            const fileExtension = 'mp4';
            // const fileExtension = path.split('.').pop()?.toLowerCase();
            const validVideoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm'];
            const mediaType = fileExtension ? validVideoExtensions.includes(fileExtension) ? 'video' : 'image' : 'image';

            let full_path = `${process.cwd()}/public/uploads/videos/video_1766764358757_e4cfabaf947485b0.mp4`;
            // let full_path = `${process.cwd()}/public/uploads/videos/${path}`;
            // const seo = await analyzeVideoForYouTubeSEO(
            //     full_path,
            //     "Give a detailed YouTube SEO optimized title, description, tags and keywords for this yt legender car delivery short video"
            // );
            // console.log('seo', seo)

            let seo = { title: 'test' }

            const find_facebook_credential = await FacebookCredential.findOne({
                where: { user_id },
                raw: true
            });

            if (find_facebook_credential) {
                const facebook = await postToFacebook(find_facebook_credential?.page_id || '', find_facebook_credential?.page_access_token || '', full_path, seo.title, mediaType)
                const insta = await postToInstagram(find_facebook_credential?.insta_business_account_id || '', find_facebook_credential?.page_access_token || '', full_path, seo.title, mediaType)
            }
            // const youtube = await uploadVideoWithSEO(full_path, seo, data.visibility, data?.date || null, user_id, video_id)
            // console.log('youtube-=----------------->', youtube)
            console.log('insta-=----------------->')
        }

    } catch (error: any) {
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
