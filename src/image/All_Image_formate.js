import { v2 as cloudinary } from 'cloudinary';
import dotenv from "dotenv";
import sharp from 'sharp';
import fs from 'fs';

dotenv.config({ quiet: true });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret
});

// ============ IMAGE COMPRESSION WITH SHARP ============

const TARGET_MIN_KB = 30;
const TARGET_MAX_KB = 40;
const MAX_INPUT_MB = 5;

/**
 * Encode at a given quality + dimension, return buffer + size in KB.
 */
const encode = async (inputBuffer, quality, dimension) => {
  const buffer = await sharp(inputBuffer)
    .resize(dimension, dimension, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({
      quality,
      progressive: true,
      mozjpeg: true
    })
    .toBuffer();

  return { buffer, sizeKB: buffer.length / 1024 };
};

/**
 * Compress image using Sharp.
 * Target size: 30-40 KB. Max allowed input: 5 MB.
 */
export const compressImage = async (inputPath, outputPath) => {
  try {
    const stats = fs.statSync(inputPath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    if (fileSizeInMB > MAX_INPUT_MB) {
      throw new Error(`Image size exceeds ${MAX_INPUT_MB}MB limit. Please upload a smaller image.`);
    }

    const inputBuffer = await fs.promises.readFile(inputPath);

    let dimension = 500;
    let best = null;
    let smallestOverall = null;

    const tryQualityRange = async () => {
      let lo = 10;
      let hi = 80;

      while (lo <= hi) {
        const q = Math.floor((lo + hi) / 2);
        const { buffer, sizeKB } = await encode(inputBuffer, q, dimension);

        if (!smallestOverall || sizeKB < smallestOverall.sizeKB) {
          smallestOverall = { buffer, sizeKB, quality: q };
        }

        if (sizeKB >= TARGET_MIN_KB && sizeKB <= TARGET_MAX_KB) {
          if (!best || (sizeKB > best.sizeKB && sizeKB <= TARGET_MAX_KB)) {
            best = { buffer, sizeKB, quality: q };
          }
          lo = q + 1;
        } else if (sizeKB > TARGET_MAX_KB) {
          hi = q - 1;
        } else {
          if (!best) {
            best = { buffer, sizeKB, quality: q };
          }
          lo = q + 1;
        }
      }
    };

    await tryQualityRange();

    while ((!best || best.sizeKB > TARGET_MAX_KB) && dimension > 100) {
      dimension = Math.round(dimension * 0.8);
      best = null;
      await tryQualityRange();
    }

    const finalResult = best || smallestOverall;

    await fs.promises.writeFile(outputPath, finalResult.buffer);

    return {
      path: outputPath,
      quality: finalResult.quality,
      originalSize: fileSizeInMB,
      compressedSize: finalResult.sizeKB,
      dimension: dimension
    };

  } catch (err) {
    console.error('Image Compression Error:', err);
    throw err;
  }
};

// ============ UPLOAD TO CLOUDINARY ============

export const UploadProfileImg = async (filePath) => {
  const compressedPath = filePath.replace(/\.[^.]+$/, '_compressed.jpg');

  try {
    const compressionResult = await compressImage(filePath, compressedPath);

    console.log('✅ Image compressed:', {
      originalSize: compressionResult.originalSize.toFixed(2) + ' MB',
      compressedSize: compressionResult.compressedSize.toFixed(2) + ' KB',
      quality: compressionResult.quality + '%',
      dimension: compressionResult.dimension + 'px',
      targetSize: `${TARGET_MIN_KB}-${TARGET_MAX_KB} KB`
    });

    const result = await cloudinary.uploader.upload(compressedPath, {
      folder: 'profile_images',
      use_filename: true,
      unique_filename: true,
    });

    return result;

  } catch (err) {
    console.error('Cloudinary Upload Error:', err);
    throw err;
  } finally {
    try {
      fs.unlinkSync(compressedPath);
    } catch (e) {
      // Ignore
    }
  }
};

// ============ DELETE FROM CLOUDINARY ============

export const DeleteProfileImg = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (err) {
    console.error('Cloudinary Delete Error:', err);
    throw err;
  }
};

// ============ GET IMAGE URL ============

export const GetImageUrl = (publicId, options = {}) => {
  try {
    return cloudinary.url(publicId, {
      secure: true,
      width: options.width || 500,
      height: options.height || 500,
      crop: options.crop || 'limit',
      quality: options.quality || 'auto',
      ...options
    });
  } catch (err) {
    console.error('Cloudinary URL Error:', err);
    return null;
  }
};

// ============ SINGLE IMAGE VALIDATION ============

export const validateImageSize = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    if (fileSizeInMB > MAX_INPUT_MB) {
      throw new Error(`Image size is ${fileSizeInMB.toFixed(2)} MB. Maximum allowed is ${MAX_INPUT_MB} MB.`);
    }

    return {
      size: fileSizeInMB,
      isValid: fileSizeInMB <= MAX_INPUT_MB
    };
  } catch (err) {
    console.error('Image Validation Error:', err);
    throw err;
  }
};

export default {
  UploadProfileImg,
  DeleteProfileImg,
  GetImageUrl,
  compressImage,
  validateImageSize
};