import axios from "axios";

const YOUTUBE_API_KEY = "AIzaSyAYfDNmATPNe78OEv06ED8YRj1bzViwtl8";
const YOUTUBE_BASE_URL = "https://www.googleapis.com/youtube/v3";

/**
 * STEP 1: Search top 5 videos by keyword/category
 */
export async function getTop5YoutubeVideos(query: string) {
    const res = await axios.get(
        "https://www.googleapis.com/youtube/v3/search",
        {
            params: {
                part: "snippet",
                q: query,
                type: "video",
                maxResults: 5,
                order: "viewCount",
                key: YOUTUBE_API_KEY,
            },
        }
    );

    return res.data.items.map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
    }));
}

/**
 * STEP 2: Get full metadata for those videos
 */
export async function getVideoDetails(videoIds: string[]) {
    const res = await axios.get(`${YOUTUBE_BASE_URL}/videos`, {
        params: {
            part: "snippet,statistics",
            id: videoIds.join(","),
            key: YOUTUBE_API_KEY,
        },
    });

    return res.data.items.map((video: any) => ({
        title: video.snippet.title,
        description: video.snippet.description,
        tags: video.snippet.tags || [],
        views: video.statistics.viewCount,
        likes: video.statistics.likeCount,
        publishedAt: video.snippet.publishedAt,
    }));
}



export const test = async () => {
    console.log('called')
    // 1. Get top 5 competitors
    const videoIds = await getTop5YoutubeVideos(
        "car shorts"
    );

    console.log(videoIds, 'videoIdsvideoIdsvideoIds')


    const topVideos = await getVideoDetails(videoIds);

    // 2. Send THIS to Gemini
    const seoContext = `
These are top ranking YouTube videos in this niche:
${JSON.stringify(topVideos, null, 2)}

Generate ONE better SEO optimized metadata JSON.
`;

    console.log(seoContext, 'seoContextseoContextseoContext')


}

// test()