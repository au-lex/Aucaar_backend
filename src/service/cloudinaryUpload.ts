import streamifier from 'streamifier';
import cloudinary from '../config/cloudinary';

export const uploadBufferToCloudinary = (
  buffer: Buffer,
  folder: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

export const uploadManyToCloudinary = (
  files: Express.Multer.File[],
  folder: string
): Promise<string[]> => {
  return Promise.all(files.map((f) => uploadBufferToCloudinary(f.buffer, folder)));
};