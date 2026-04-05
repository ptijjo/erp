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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  login(
    @Request() req: RequestExpress,
    @Response({ passthrough: true }) res: ResponseExpress,
    @Body() _body: LoginDto,
  ) {
    const token = this.authService.login(req.user as SafeUserWithRoleAndOrg);
    res.cookie('token', token.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });
    return { message: 'Login successful' };
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
    const token = await this.authService.completeFirstLogin(
      user.sub,
      dto.password,
    );
    res.cookie('token', token.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });
    return { message: 'Mot de passe enregistré' };
  }

  /** Déconnexion : supprime le cookie JWT (pas de garde — cookie peut être expiré). */
  @Post('logout')
  @HttpCode(200)
  logout(@Response({ passthrough: true }) res: ResponseExpress) {
    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
    return { message: 'Logged out successfully' };
  }
}
