import axios from "axios";
import fs from "fs";
import FormData from "form-data";

const GRAPH_URL = process.env.GRAPH_URL || "https://graph.facebook.com/v24.0";

type MediaType = "image" | "video";

/* =========================
   FACEBOOK (IMAGE / VIDEO)
========================= */
export async function postToFacebook(pageId: string, pageToken: string, mediaUrl: string, caption: string, mediaType: MediaType) {

  if (mediaType === "video") {
    if (!fs.existsSync(mediaUrl)) {
      throw new Error(`Local file not found: ${mediaUrl}`);
    }

    const form = new FormData();
    form.append("source", fs.createReadStream(mediaUrl));
    form.append("description", caption);
    form.append("access_token", pageToken);

    const res = await axios.post(`${GRAPH_URL}/${pageId}/videos`, form, {
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    return res.data;
  }

  // 🖼 IMAGE → normal request
  const res = await axios.post(`${GRAPH_URL}/${pageId}/photos`, {
    url: mediaUrl,
    caption,
    access_token: pageToken,
  });

  return res.data;

}

/* =========================
   INSTAGRAM (IMAGE / VIDEO)
========================= */

export async function postToInstagram(igBusinessId: string, pageToken: string, mediaUrl: string, caption: string, mediaType: MediaType) {
  // Step 1: Create container
  const containerPayload: any = { access_token: pageToken, caption, };

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