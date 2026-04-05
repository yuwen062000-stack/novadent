// ── 檔案上傳 Controller ─────────────────────────────────────
// 上傳限制：僅 ADMIN、SUPER_ADMIN、CLINIC、LAB 角色可上傳
// 支援格式：JPG/PNG/GIF/WEBP/PDF，最大 10MB
import { Controller, Post, Get, Param, Res, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UploadService } from './upload.service';
import * as path from 'path';
import * as fs from 'fs';

// ── 檔案上傳（需登入且角色限制）────────────────────────────
@Controller('api/upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(private readonly svc: UploadService) {}

  /** 上傳檔案，限 ADMIN/SUPER_ADMIN/CLINIC/LAB 角色 */
  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN', 'CLINIC', 'LAB')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.svc.uploadFile(file);
  }
}

// ── 檔案讀取（公開，供前端顯示已上傳的圖片/PDF）──────────────
@Controller('api/uploads')
export class UploadServeController {
  /** 讀取已上傳的檔案（公開路由，含路徑穿越防護） */
  @Public()
  @Get('*path')
  serveFile(@Param('path') filePath: string[], @Res() res: Response) {
    const uploadDir = path.join(process.cwd(), '..', 'uploads');
    const fullPath = path.join(uploadDir, ...filePath);

    // 路徑穿越防護：確保不會存取 uploads 目錄以外的檔案
    if (!fullPath.startsWith(uploadDir)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    return res.sendFile(fullPath);
  }
}
