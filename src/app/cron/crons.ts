import cron from 'node-cron';
import { Pending_Uplaod_Media } from '../../models/pending_upload_media';
import mediaProccess from './media_proccess';
import moment from 'moment-timezone'
/**
 * Upload schedule (24-hour format)
 */
const schedule: Record<string, { start_time: string; end_time: string }[]> = {
    monday: [
        { start_time: '12:00', end_time: '14:00' },
        { start_time: '19:00', end_time: '21:00' }
    ],
    tuesday: [
        { start_time: '12:00', end_time: '15:00' },
        { start_time: '18:00', end_time: '21:00' }
    ],
    wednesday: [
        { start_time: '12:00', end_time: '15:00' },
        { start_time: '19:00', end_time: '23:59' }
    ],
    thursday: [
        { start_time: '00:01', end_time: '15:00' },
        { start_time: '12:00', end_time: '15:00' },
        { start_time: '18:00', end_time: '21:00' }
    ],
    friday: [
        { start_time: '13:00', end_time: '16:00' },
        { start_time: '17:00', end_time: '20:00' }
    ],
    saturday: [
        { start_time: '09:00', end_time: '11:00' },
        { start_time: '18:00', end_time: '21:00' }
    ],
    sunday: [
        { start_time: '09:00', end_time: '12:00' },
        { start_time: '18:00', end_time: '21:00' }
    ]
};

/**
 * Helper: Check if current time is inside allowed window
 */
function isWithinSchedule(): boolean {
    // Force India timezone
    const now = moment.tz('Asia/Kolkata');

    const day = now.format('dddd').toLowerCase();
    const daySchedule = schedule[day];

    if (!daySchedule) return false;

    return daySchedule.some(({ start_time, end_time }) => {
        // Create start & end in the SAME timezone and SAME day
        const start = moment.tz(
            `${now.format('YYYY-MM-DD')} ${start_time}`,
            'YYYY-MM-DD HH:mm',
            'Asia/Kolkata'
        );

        const end = moment.tz(
            `${now.format('YYYY-MM-DD')} ${end_time}`,
            'YYYY-MM-DD HH:mm',
            'Asia/Kolkata'
        );

        // Inclusive comparison
        return now.isBetween(start, end, undefined, '[]');
    });
}

/**
 * Cron runs every minute
 */
cron.schedule('* * * * *', async () => {
    console.log('⏱ Cron running (schedule-aware check)');

    if (!isWithinSchedule()) {
        console.log('❌ Outside upload schedule');
        return;
    }

    console.log('✅ Inside upload schedule');

    try {
        const pending: any = await Pending_Uplaod_Media.findOne({
            where: { status: 'initiate' },
            order: [['createdAt', 'ASC']],
            raw: true
        });

        if (pending) {
            console.log(`🚀 Processing media ID: ${pending.id}`);
            await mediaProccess(pending.id);
        } else {
            console.log('ℹ No pending media found');
        }

    } catch (error) {
        console.error('🔥 Cron error:', error);
    }
});


cron.schedule('*/15 * * * * *', async () => {
    console.log('Cron job running every 15 second');
    try {
        // isWithinSchedule()
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
