// ── 檔案上傳 Service ────────────────────────────────────────
// 使用本地檔案系統儲存（Replit 環境），存放於 {cwd}/../uploads/
// 支援格式：JPG/PNG/GIF/WEBP/PDF，單檔上限 10MB
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private uploadDir: string;

  constructor(private config: ConfigService) {
    // 上傳目錄位於專案根目錄的上一層，避免被前端 build 覆蓋
    this.uploadDir = path.join(process.cwd(), '..', 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /** 處理單檔上傳：驗證格式與大小，產生 UUID 檔名存入本地 */
  async uploadFile(file: Express.Multer.File, folder = 'novadent'): Promise<{ url: string; publicId: string }> {
    if (!file) throw new BadRequestException('未選擇檔案');
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('不支援的檔案格式（僅支援 JPG/PNG/GIF/WEBP/PDF）');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('檔案大小不能超過 10MB');
    }

    const folderPath = path.join(this.uploadDir, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const ext = path.extname(file.originalname) || '.bin';
    const filename = `${uuidv4()}${ext}`;
    const filePath = path.join(folderPath, filename);

    fs.writeFileSync(filePath, file.buffer);

    const publicId = `${folder}/${filename}`;
    const url = `/api/uploads/${publicId}`;

    return { url, publicId };
  }
}
