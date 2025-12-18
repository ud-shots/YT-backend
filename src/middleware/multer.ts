import fs from "fs";
import multer from "multer";
import path from "path";


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = `${process.cwd()}/public/uploads/videos/`;

        // Check if directory exists, if not create it
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath); // folder path
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
});

export default upload;