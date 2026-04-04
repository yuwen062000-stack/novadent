// Users Module — 用戶管理模組（DatabaseModule 已是 Global，無需再 import）
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService }    from './users.service';

@Module({
  controllers: [UsersController],
  providers:   [UsersService],
  exports:     [UsersService], // 供其他模組（如 Auth）使用
})
export class UsersModule {}
