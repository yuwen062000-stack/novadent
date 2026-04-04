// Auth 相關 DTO（Data Transfer Object）
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email 格式不正確' })
  email: string;

  @IsString()
  @MinLength(1, { message: '請輸入密碼' })
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email 格式不正確' })
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8, { message: '密碼至少 8 個字元' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: '密碼需含大小寫英文字母與數字',
  })
  newPassword: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(8, { message: '密碼至少 8 個字元' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: '密碼需含大小寫英文字母與數字',
  })
  newPassword: string;
}
