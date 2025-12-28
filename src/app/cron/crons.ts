import cron from 'node-cron';
import { Pending_Uplaod_Media } from '../../models/pending_upload_media';
import mediaProccess from './media_proccess';

cron.schedule('*/15 * * * * *', () => {

    console.log('Cron job running every 15 second');

    (async () => {
        try {
            const pending_upload_media: any = await Pending_Uplaod_Media.findOne({ where: { status: 'initiate' }, order: [['createdAt', 'ASC']] })

            if (pending_upload_media) {
                mediaProccess(pending_upload_media?.id)
            }

            const response = await fetch('https://yt-backend-rvma.onrender.com/');
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            const data = await response.text();
            console.log('External API Response:', data);
        } catch (error) {
            console.error('Error calling external API:', error);
        }
    })()
});