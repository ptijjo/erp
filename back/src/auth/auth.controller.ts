import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local.strategy/local-auth.guard';
import type {
  Request as RequestExpress,
  Response as ResponseExpress,
} from 'express';
import type { SafeUserWithRoleAndOrg } from '../user/user.types';
import type { AuthenticatedUser } from './auth.types';
import { JwtAuthGuard } from './jwt.strategy/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { LoginDto, SetFirstPasswordDto } from './dto/auth.dto';
import type { SessionTokens } from './auth.service';
import { AuthSessionSettings } from './auth-session-settings.service';

const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionSettings: AuthSessionSettings,
  ) {}

  private setSessionCookies(
    res: ResponseExpress,
    tokens: SessionTokens,
  ): void {
    res.cookie(
      this.sessionSettings.accessCookieName,
      tokens.access_token,
      AUTH_COOKIE_OPTIONS,
    );
    res.cookie(this.sessionSettings.refreshCookieName, tokens.refresh_token, {
      ...AUTH_COOKIE_OPTIONS,
      maxAge: tokens.refresh_cookie_max_age_ms,
    });
  }

  private clearSessionCookies(res: ResponseExpress): void {
    res.clearCookie(this.sessionSettings.accessCookieName, AUTH_COOKIE_OPTIONS);
    res.clearCookie(
      this.sessionSettings.refreshCookieName,
      AUTH_COOKIE_OPTIONS,
    );
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  async login(
    @Request() req: RequestExpress,
    @Response({ passthrough: true }) res: ResponseExpress,
    @Body() _body: LoginDto,
  ) {
    const tokens = await this.authService.login(
      req.user as SafeUserWithRoleAndOrg,
    );
    this.setSessionCookies(res, tokens);
    return { message: 'Login successful' };
  }

  /**
   * Rafraîchit la session à partir du cookie refresh (rotation).
   * Sans garde JWT : l’accès peut être expiré.
   */
  @Post('refresh')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @HttpCode(200)
  async refresh(
    @Request() req: RequestExpress,
    @Response({ passthrough: true }) res: ResponseExpress,
  ) {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const rawRefresh = cookies?.[this.sessionSettings.refreshCookieName];
    const refreshToken = typeof rawRefresh === 'string' ? rawRefresh : '';
    const tokens = await this.authService.refreshWithRotation(refreshToken);
    this.setSessionCookies(res, tokens);
    return { message: 'Session refreshed' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: RequestExpress) {
    return this.authService.getMeProfile(req.user as AuthenticatedUser);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @Post('first-login/password')
  @HttpCode(200)
  async setFirstPassword(
    @Request() req: RequestExpress,
    @Body() dto: SetFirstPasswordDto,
    @Response({ passthrough: true }) res: ResponseExpress,
  ) {
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('Les mots de passe ne correspondent pas.');
    }
    const user = req.user as AuthenticatedUser;
    const tokens = await this.authService.completeFirstLogin(
      user.sub,
      dto.password,
    );
    this.setSessionCookies(res, tokens);
    return { message: 'Mot de passe enregistré' };
  }

  /** Déconnexion : révoque le refresh en Redis et supprime les cookies. */
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Request() req: RequestExpress,
    @Response({ passthrough: true }) res: ResponseExpress,
  ) {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const rawRefresh = cookies?.[this.sessionSettings.refreshCookieName];
    const refreshToken = typeof rawRefresh === 'string' ? rawRefresh : '';
    await this.authService.revokeRefreshToken(refreshToken);
    this.clearSessionCookies(res);
    return { message: 'Logged out successfully' };
  }
}
