// M-01 Auth Controller
import {
  Controller, Post, Get, Body, Req, Res, HttpCode, HttpStatus, UseGuards, Ip
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto, RegisterDto, RefreshTokenDto } from './dto/auth.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  // POST /api/auth/login
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, ip);
    this.setRefreshCookie(res, result.refreshToken);

    return {
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  // POST /api/auth/refresh
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshTokenDto, @Req() req: Request) {
    const token = body?.refreshToken || req.cookies?.refresh_token;
    if (!token) {
      return { success: false, message: 'Refresh token 不存在' };
    }
    const result = await this.authService.refreshAccessToken(token);
    return { success: true, ...result };
  }

  // POST /api/auth/logout
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: RefreshTokenDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = body?.refreshToken || req.cookies?.refresh_token;
    await this.authService.logout(token);
    res.clearCookie('refresh_token', { path: '/' });
    return { success: true };
  }

  // GET /api/auth/me
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  // POST /api/auth/forgot-password
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return { success: true, message: '如果該 Email 已在系統中登記，您將收到重設連結' };
  }

  // POST /api/auth/reset-password
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { success: true, message: '密碼重設成功' };
  }

  // POST /api/auth/change-password（強制改密碼）
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(userId, dto);
    return { success: true, message: '密碼修改成功' };
  }

  /** 會員自助註冊（公開） */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto, ip);
    this.setRefreshCookie(res, result.refreshToken);

    return {
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  // POST /api/auth/init-super-admin（系統初始化，只跑一次）
  @Public()
  @Post('init-super-admin')
  @HttpCode(HttpStatus.OK)
  async initSuperAdmin() {
    return this.authService.initSuperAdmin();
  }
}
