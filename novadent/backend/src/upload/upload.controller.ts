import { Controller, Post, Get, Param, Res, UseInterceptors, UploadedFile, UseGuards, InternalServerErrorException } from '@nestjs/common';
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

@Controller('api/upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(private readonly svc: UploadService) {}

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN', 'CLINIC', 'LAB')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.svc.uploadFile(file);
  }
}

@Controller('api/uploads')
export class UploadServeController {
  constructor(private readonly svc: UploadService) {}

  @Public()
  @Get('*')
  async serveFile(@Param('0') filePath: string, @Res() res: Response) {
    const objectKey = filePath;

    if (!this.svc.isValidObjectKey(objectKey)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const uploadDir = path.join(process.cwd(), '..', 'uploads');
    const segments = filePath.split('/').filter(Boolean);
    const fullPath = path.join(uploadDir, ...segments);
    if (fullPath.startsWith(uploadDir) && fs.existsSync(fullPath)) {
      return res.sendFile(fullPath);
    }

    try {
      const result = await this.svc.getFileBuffer(objectKey);
      if (result) {
        res.set('Content-Type', result.contentType);
        res.set('Cache-Control', 'public, max-age=86400');
        return res.send(result.buffer);
      }
    } catch {
      return res.status(500).json({ message: 'Storage service error' });
    }

    return res.status(404).json({ message: 'File not found' });
  }
}
