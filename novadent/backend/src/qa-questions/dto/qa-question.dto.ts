import { IsString, IsOptional, IsEnum, IsInt, IsBoolean, IsArray } from 'class-validator';

export class CreateQaQuestionDto {
  @IsString()
  questionText: string;

  @IsEnum(['single_choice', 'multiple_choice', 'text_input'])
  @IsOptional()
  questionType?: string;

  @IsOptional()
  options?: any[];

  @IsInt()
  @IsOptional()
  orderIndex?: number;

  @IsString()
  @IsOptional()
  category?: string;
}

export class UpdateQaQuestionDto {
  @IsString()
  @IsOptional()
  questionText?: string;

  @IsEnum(['single_choice', 'multiple_choice', 'text_input'])
  @IsOptional()
  questionType?: string;

  @IsOptional()
  options?: any[];

  @IsInt()
  @IsOptional()
  orderIndex?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ReorderQaQuestionsDto {
  @IsArray()
  ids: number[];
}
