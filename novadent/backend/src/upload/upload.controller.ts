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
  @Public()
  @Get('*path')
  serveFile(@Param('path') filePath: string[], @Res() res: Response) {
    const uploadDir = path.join(process.cwd(), '..', 'uploads');
    const fullPath = path.join(uploadDir, ...filePath);

    if (!fullPath.startsWith(uploadDir)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    return res.sendFile(fullPath);
  }
}
