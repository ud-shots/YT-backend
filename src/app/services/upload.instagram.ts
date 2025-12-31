import axios from "axios";
import Handler from "../../common/handler";
import { Pending_Uplaod_Media } from "../../models/pending_upload_media";

const GRAPH_URL = process.env.GRAPH_URL || "https://graph.facebook.com/v24.0";
type MediaType = "image" | "video";

const waitingForInstaStatus = async (creationId: string, accessToken: string, maxAttempts = 20) => {
    try {

        console.log("Waiting for Instagram processing to complete...");
        console.log(creationId, accessToken, 'creationId, accessToken')

        for (let i = 0; i < maxAttempts; i++) {
            const res = await axios.get(
                `${GRAPH_URL}/${creationId}`,
                {
                    params: {
                        fields: "status_code",
                        access_token: accessToken,
                    },
                }
            );

            console.log(res, 'data.status_code')

            if (res.data.status_code === "FINISHED" || res.data.status_code === "PUBLISHED") {
                return { status: true, message: "Instagram processing completed" }
            }else if(res.data.status_code != "IN_PROGRESS"){
                return { status: false, message: "Instagram processing failed" }
            }

            // wait 5 seconds before next check
            await new Promise(res => setTimeout(res, 5000));
        }

        return { status: false, message: "Instagram processing took too long" }

    } catch (error: any) {
        console.log(error, 'instagram upload error')
        return { status: false, message: error.message }
    }
}


const uploadOnInstagram = async (pending_upload_media_id: string, igBusinessId: string, pageToken: string, mediaUrl: string, caption: string, mediaType: MediaType) => {

    try {

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
        const { status } = await waitingForInstaStatus(creationId, pageToken);

        if (!status) {
            await Handler.addLogs(pending_upload_media_id, igBusinessId, "Instagram processing took too long", "instagram");
            return false
        }

        try {
            const { data: publish } = await axios.post(
                `${GRAPH_URL}/${igBusinessId}/media_publish`,
                {
                    creation_id: creationId,
                    access_token: pageToken,
                }
            );

            await Pending_Uplaod_Media.update({ uploaded_insta: true }, { where: { id: pending_upload_media_id } })
            console.log('uploded on insta------>', publish.data)
            return true;

        } catch (error: any) {
            console.log(error, 'instagram upload error')
            await Handler.addLogs(pending_upload_media_id, igBusinessId, error.message, "instagram");
            return false
        }

    } catch (error: any) {
        console.log(error, 'instagram upload error')
        await Handler.addLogs(pending_upload_media_id, igBusinessId, error.message, "instagram");
        return false
    }

}

export = uploadOnInstagram 