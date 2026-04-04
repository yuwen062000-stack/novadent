import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateMfgStepTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  orderIndex?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateMfgStepTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  orderIndex?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ReorderTemplatesDto {
  ids: number[];
}
