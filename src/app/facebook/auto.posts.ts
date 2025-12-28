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

async function waitForInstagramProcessing(creationId: string, accessToken: string, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await axios.get(
      `${GRAPH_URL}/${creationId}`,
      {
        params: {
          fields: "status_code",
          access_token: accessToken,
        },
      }
    );

    if (data.status_code === "FINISHED") {
      return;
    }

    if (data.status_code === "ERROR") {
      throw new Error("Instagram media processing failed");
    }

    // wait 5 seconds before next check
    await new Promise(res => setTimeout(res, 5000));
  }

  throw new Error("Instagram media processing timed out");
}


export async function postToInstagram(igBusinessId: string, pageToken: string, mediaUrl: string, caption: string, mediaType: MediaType) {
  // Step 1: Create container
  const containerPayload: any = { access_token: pageToken, caption, };

  if (mediaType === "video") {
    containerPayload.media_type = "REELS";
    containerPayload.video_url = mediaUrl;
  } else {
    containerPayload.image_url = mediaUrl;
  }

  const { data: container } = await axios.post(
    `${GRAPH_URL}/${igBusinessId}/media`,
    containerPayload
  );

  const creationId = container.id;
  await waitForInstagramProcessing(creationId, pageToken);
  // Step 2: Publish
  const { data: publish } = await axios.post(
    `${GRAPH_URL}/${igBusinessId}/media_publish`,
    {
      creation_id: creationId,
      access_token: pageToken,
    }
  );

  return publish.data;
}