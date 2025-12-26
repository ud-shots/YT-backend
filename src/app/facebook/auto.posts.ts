import axios from "axios";

const GRAPH_URL = process.env.GRAPH_URL || "https://graph.facebook.com/v24.0";

type MediaType = "image" | "video";

/* =========================
   FACEBOOK (IMAGE / VIDEO)
========================= */
export async function postToFacebook(
  pageId: string,
  pageToken: string,
  mediaUrl: string,
  caption: string,
  mediaType: MediaType
) {
  const endpoint =
    mediaType === "video"
      ? `${GRAPH_URL}/${pageId}/videos`
      : `${GRAPH_URL}/${pageId}/photos`;

  const payload =
    mediaType === "video"
      ? {
          file_url: mediaUrl,
          description: caption,
          access_token: pageToken,
        }
      : {
          url: mediaUrl,
          caption,
          access_token: pageToken,
        };

  const res = await axios.post(endpoint, payload);
  return res.data;
}

/* =========================
   INSTAGRAM (IMAGE / VIDEO)
========================= */
export async function postToInstagram(
  igBusinessId: string,
  pageToken: string,
  mediaUrl: string,
  caption: string,
  mediaType: MediaType
) {
  // Step 1: Create container
  const containerPayload: any = {
    access_token: pageToken,
    caption,
  };

  if (mediaType === "video") {
    containerPayload.media_type = "REELS";
    containerPayload.video_url = mediaUrl;
  } else {
    containerPayload.image_url = mediaUrl;
  }

  const container = await axios.post(
    `${GRAPH_URL}/${igBusinessId}/media`,
    containerPayload
  );

  // Step 2: Publish
  const publish = await axios.post(
    `${GRAPH_URL}/${igBusinessId}/media_publish`,
    {
      creation_id: container.data.id,
      access_token: pageToken,
    }
  );

  return publish.data;
}
