type MediaType = "image" | "video";
const GRAPH_URL = process.env.GRAPH_URL || "https://graph.facebook.com/v24.0";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import Handler from "../../common/handler";
import { Pending_Uplaod_Media } from "../../models/pending_upload_media";

const uploadOnFacebook = async (pending_upload_media_id: string, pageId: string, pageToken: string, mediaUrl: string, caption: string, mediaType: MediaType) => {

    try {
        if (mediaType === "video") {

            try {
                const form = new FormData();
                form.append("source", fs.createReadStream(mediaUrl));
                form.append("description", caption);
                form.append("access_token", pageToken);

                const res = await axios.post(`${GRAPH_URL}/${pageId}/videos`, form, {
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity,
                });

                console.log('facebook-upload------->', res.data)
                await Pending_Uplaod_Media.update({ uploaded_facebook: true }, { where: { id: pending_upload_media_id } })
                return true
            } catch (error: any) {
                await Handler.addLogs(pending_upload_media_id, pageId, error.message, "facebook");
                return false
            }
        }

        // 🖼 IMAGE → normal request
        try {
            const res = await axios.post(`${GRAPH_URL}/${pageId}/photos`, {
                url: mediaUrl,
                caption,
                access_token: pageToken,
            });

            console.log('facebook-upload------->', res.data)
            await Pending_Uplaod_Media.update({ uploaded_facebook: true }, { where: { id: pending_upload_media_id } })
            return true
        } catch (error: any) {
            await Handler.addLogs(pending_upload_media_id, pageId, error.message, "facebook");
            return false
        }

    } catch (error: any) {
        await Handler.addLogs(pending_upload_media_id, pageId, error.message, "facebook");
        return false
    }

}

export = uploadOnFacebook