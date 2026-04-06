import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

let gcsStorage: Storage | null = null;
let gcsBucket: ReturnType<Storage['bucket']> | null = null;

function getGcs() {
  if (!gcsStorage) {
    gcsStorage = new Storage();
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    if (bucketId) {
      gcsBucket = gcsStorage.bucket(bucketId);
    }
  }
  return gcsBucket;
}

const ALLOWED_PREFIXES = ['novadent/'];

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private uploadDir: string;

  constructor(private config: ConfigService) {
    this.uploadDir = path.join(process.cwd(), '..', 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
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

    const ext = path.extname(file.originalname) || '.bin';
    const filename = `${uuidv4()}${ext}`;
    const objectKey = `${folder}/${filename}`;

    const bucket = getGcs();
    if (bucket) {
      try {
        const gcsFile = bucket.file(objectKey);
        await gcsFile.save(file.buffer, {
          contentType: file.mimetype,
          resumable: false,
        });
        const publicId = objectKey;
        const url = `/api/uploads/${publicId}`;
        return { url, publicId };
      } catch (err) {
        this.logger.error(`GCS upload failed for ${objectKey}, falling back to local`, err);
      }
    }

    const folderPath = path.join(this.uploadDir, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const filePath = path.join(folderPath, filename);
    fs.writeFileSync(filePath, file.buffer);

    const publicId = objectKey;
    const url = `/api/uploads/${publicId}`;
    return { url, publicId };
  }

  isValidObjectKey(key: string): boolean {
    if (!key || key.includes('..') || key.startsWith('/') || key.startsWith('\\')) {
      return false;
    }
    return ALLOWED_PREFIXES.some(prefix => key.startsWith(prefix));
  }

  async getFileBuffer(objectKey: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    if (!this.isValidObjectKey(objectKey)) {
      return null;
    }

    const bucket = getGcs();
    if (bucket) {
      try {
        const gcsFile = bucket.file(objectKey);
        const [exists] = await gcsFile.exists();
        if (!exists) return null;
        const [buffer] = await gcsFile.download();
        const [metadata] = await gcsFile.getMetadata();
        return { buffer: Buffer.from(buffer), contentType: (metadata.contentType as string) || 'application/octet-stream' };
      } catch (err) {
        this.logger.error(`GCS download failed for ${objectKey}`, err);
        throw err;
      }
    }
    return null;
  }
}
