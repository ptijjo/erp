import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import type { SafeUserWithRole } from '../../user/user.types';
import type { Request } from 'express';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    email: string,
    password: string,
  ): Promise<SafeUserWithRole> {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const userAgent = req.get('user-agent') ?? '';
    const user = await this.authService.validateLogin(email, password, {
      ip,
      userAgent,
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}
