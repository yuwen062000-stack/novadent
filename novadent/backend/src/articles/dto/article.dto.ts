import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreateArticleDto {
  @IsString() title: string;
  @IsString() slug: string;
  @IsString() category: string;
  @IsString() content: string;
  @IsString() author: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @IsString() metaTitle?: string;
  @IsOptional() @IsString() metaDesc?: string;
}

export class UpdateArticleDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() author?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @IsString() metaTitle?: string;
  @IsOptional() @IsString() metaDesc?: string;
}
