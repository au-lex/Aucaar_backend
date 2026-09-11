// middleware/upload.ts
import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isImageMime = file.mimetype.startsWith('image/');
    const ext = path.extname(file.originalname).toLowerCase();
    const hasImageExt = ALLOWED_EXTENSIONS.has(ext);

    if (!isImageMime && !hasImageExt) {
      return cb(
        new Error(
          `"${file.fieldname}" must be an image file (got mimetype: ${file.mimetype || 'unknown'}, filename: "${file.originalname}")`
        )
      );
    }
    cb(null, true);
  },
});