import { IsString, IsOptional, IsIn, IsUUID } from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  userId: string;

  @IsIn(['CASE_UPDATE', 'SYSTEM', 'REMINDER'])
  type: string;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsUUID()
  relatedId?: string;
}
