import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(file: Express.Multer.File, folder = 'novadent'): Promise<{ url: string; publicId: string }> {
    if (!file) throw new BadRequestException('未選擇檔案');
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('不支援的檔案格式（僅支援 JPG/PNG/GIF/WEBP/PDF）');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('檔案大小不能超過 10MB');
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto', quality: 'auto', fetch_format: 'auto' },
        (error, result) => {
          if (error || !result) return reject(new BadRequestException(error?.message || '上傳失敗'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      ).end(file.buffer);
    });
  }
}
