import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local.strategy/local-auth.guard';
import { Request, Response, UseGuards } from '@nestjs/common';
import type {
  Request as RequestExpress,
  Response as ResponseExpress,
} from 'express';
import type { SafeUserWithRole } from '../user/user.types';
import type { AuthenticatedUser } from './auth.types';
import { JwtAuthGuard } from './jwt.strategy/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { LoginDto } from './dto/auth.dto';

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
    const token = this.authService.login(req.user as SafeUserWithRole);
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

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(LocalAuthGuard)
  @Post('auth/logout')
  logout(@Response({ passthrough: true }) res: ResponseExpress) {
    res.clearCookie('token');
    return { message: 'Logged out successfully' };
  }
}
