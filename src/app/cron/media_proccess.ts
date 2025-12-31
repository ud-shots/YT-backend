import Handler from "../../common/handler";
import { Pending_Uplaod_Media } from "../../models/pending_upload_media";
import path from 'path'
import fs from 'fs'
import { urlToMedia } from "../services/url_to_media";
import { analyzeMedia } from "../services/media_to_details";
import { FacebookCredential } from "../../models/facebook_credential";
import { YouTubeCredential } from "../../models/youtube_credential";
import uploadOnInstagram from "../services/upload.instagram";
import uploadOnFacebook from "../services/upload.facebook";
import uploadOnYoutube from "../services/upload.youtube";
import { Videos } from "../../models/videos";

const mediaProccess = async (pending_upload_media_id: string) => {
    try {

        const find_pending_media: any = await Pending_Uplaod_Media.findOne({ where: { id: pending_upload_media_id, status: 'pending' }, raw: true });

        if (find_pending_media) {
            await Handler.addLogs(find_pending_media.user_id, pending_upload_media_id, 'One Media already pending', 'Cron Job')
            return false
        }

        const find_media: any = await Pending_Uplaod_Media.findOne({ where: { id: pending_upload_media_id, status: 'initiate' }, raw: true });
        const user_id: string = find_media?.user_id;

        if (!find_media) {
            await Handler.addLogs(user_id, pending_upload_media_id, 'Media not found', 'Cron Job')
            return false
        }

        let file_path = null;
        let file_name = null;
        await Handler.addLogs(user_id, pending_upload_media_id, 'Media status updated to pending', 'Cron Job')
        await Pending_Uplaod_Media.update({ status: 'pending' }, { where: { id: pending_upload_media_id } });

        if (find_media.type == 'url') {
            await Handler.addLogs(user_id, pending_upload_media_id, `Converting url to file`, 'Cron Job')

            if (!find_media.url) {
                await Pending_Uplaod_Media.update({ status: 'failed' }, { where: { id: pending_upload_media_id } });
                await Handler.addLogs(user_id, pending_upload_media_id, `Url is null`, 'Cron Job')
                return false
            }

            const convert_url_to_file: any = await urlToMedia(find_media.user_id, find_media.id, find_media.url, find_media.platform);

            if (!convert_url_to_file.status) {
                await Pending_Uplaod_Media.update({ status: 'failed' }, { where: { id: pending_upload_media_id } });
                await Handler.addLogs(user_id, pending_upload_media_id, convert_url_to_file.message, find_media.platform)
                return false
            }

            file_path = `${process.cwd()}/public/uploads/media/${convert_url_to_file.data.file_name}`
            file_name = convert_url_to_file.data.file_name

            if (!file_path) {
                await Pending_Uplaod_Media.update({ status: 'failed' }, { where: { id: pending_upload_media_id } });
                await Handler.addLogs(user_id, pending_upload_media_id, `Url to Media File path is null`, 'Cron Job')
                return false
            }

        } else {
            file_path = `${process.cwd()}/public/uploads/media/${find_media.file_name}`
            file_name = find_media.file_name

            if (!fs.existsSync(file_path)) {
                await Pending_Uplaod_Media.update({ status: 'failed' }, { where: { id: pending_upload_media_id } });
                await Handler.addLogs(user_id, pending_upload_media_id, `File not found ${file_path}`, 'Cron Job')
                return false
            }
        }

        if (!file_path) {
            await Pending_Uplaod_Media.update({ status: 'failed' }, { where: { id: pending_upload_media_id } });
            await Handler.addLogs(user_id, pending_upload_media_id, `File or Url is null`, 'Cron Job')
            return false
        }

        const ext = path.extname(file_path);
        const file_type = ext.replace('.', '');

        const VIDEO_EXTENSIONS = ['mp4', 'mov', 'mkv', 'webm', 'avi'];
        const media_type = VIDEO_EXTENSIONS.includes(file_type) ? 'video' : 'image';

        await Pending_Uplaod_Media.update({ file_type, media_type }, { where: { id: pending_upload_media_id } });
        await Handler.addLogs(user_id, pending_upload_media_id, `Media proccess started`, 'Cron Job')

        console.log('file_path---------->', file_path);

        const analyzing = await analyzeMedia(user_id, pending_upload_media_id, file_path, "Give a detailed YouTube SEO optimized title, description, tags and keywords for this yt legender car delivery short video", find_media.platform, file_type, media_type);

        if (!analyzing.status) {
            await Pending_Uplaod_Media.update({ status: 'failed' }, { where: { id: pending_upload_media_id } });
            return false
        }

        let seo = analyzing.data?.seo;
        console.log('seo---------->', seo);

        await Pending_Uplaod_Media.update({ status: 'uploading' }, { where: { id: pending_upload_media_id } });

        const find_insta_facebook_credential = await FacebookCredential.findOne({ where: { user_id }, raw: true });
        const find_youtube_credential = await YouTubeCredential.findOne({ where: { user_id }, raw: true });

        if (!find_insta_facebook_credential) {
            await Handler.addLogs(user_id, pending_upload_media_id, `Facebook credential not found`, find_media.platform)
        }

        if (!find_youtube_credential) {
            await Handler.addLogs(user_id, pending_upload_media_id, `YouTube credential not found`, find_media.platform)
        }

        if (find_insta_facebook_credential) {
            const instagram = uploadOnInstagram(pending_upload_media_id, find_insta_facebook_credential?.insta_business_account_id || '', find_insta_facebook_credential?.page_access_token || '', `${process.env.FILE_URL}${file_name}`, seo.title, media_type)
            console.log('instagram---------->', instagram);
            const facebook = uploadOnFacebook(pending_upload_media_id, find_insta_facebook_credential?.page_id || '', find_insta_facebook_credential?.page_access_token || '', file_path, seo.title, media_type)
            console.log('facebook---------->', facebook);
        }

        if (find_youtube_credential) {
            let obj: any = { user_id: user_id, filename: file_path, original_url: find_media.url || null, local_path: file_path, visibility: find_media.visibility || 'private', status: 'uploading', scheduled_at: find_media.schedule_date ? new Date(find_media.schedule_date) : undefined };
            const video: any = await Videos.create(obj);
            const youtube = uploadOnYoutube(pending_upload_media_id, user_id, file_path, seo, find_media.visibility, find_media.schedule_date, video?.id)
            console.log('youtube---------->', youtube);
        }

        // await Pending_Uplaod_Media.update({ status: 'success' }, { where: { id: pending_upload_media_id } });
        return true

    } catch (error: any) {
        await Pending_Uplaod_Media.update({ status: 'failed' }, { where: { id: pending_upload_media_id } });
        console.log('Error From Media Proccess :- ', error.message);
    }
}

export default mediaProccess