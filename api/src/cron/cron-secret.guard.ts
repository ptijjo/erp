import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('CRON_SECRET')?.trim();
    if (!expected) {
      throw new UnauthorizedException(
        'CRON_SECRET non configuré sur le serveur.',
      );
    }
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers['x-cron-secret'];
    const provided = Array.isArray(header) ? header[0] : header;
    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Secret cron invalide.');
    }
    return true;
  }
}
