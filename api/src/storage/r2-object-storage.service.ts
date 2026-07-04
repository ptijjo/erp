import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { ProcessedAvatarImage, R2UploadResult } from './storage.types';

@Injectable()
export class R2ObjectStorageService {
  private readonly logger = new Logger(R2ObjectStorageService.name);
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return this.readConfig() != null;
  }

  buildProfilePhotoKey(userId: string): string {
    const stamp = Date.now();
    const random = Math.random().toString(36).slice(2, 10);
    return `profile-photos/${userId}/${stamp}-${random}.webp`;
  }

  resolvePublicUrl(key: string): string {
    const cfg = this.requireConfig();
    const base = cfg.publicBaseUrl.replace(/\/$/, '');
    return `${base}/${key}`;
  }

  extractKeyFromPublicUrl(url: string | null | undefined): string | null {
    if (!url?.trim()) return null;
    const cfg = this.readConfig();
    if (!cfg) return null;
    const base = cfg.publicBaseUrl.replace(/\/$/, '');
    const normalized = url.trim();
    if (!normalized.startsWith(`${base}/`)) return null;
    return normalized.slice(base.length + 1);
  }

  async uploadProfilePhoto(
    key: string,
    image: ProcessedAvatarImage,
  ): Promise<R2UploadResult> {
    this.requireConfig();
    const client = this.getClient();

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: this.requireConfig().bucketName,
          Key: key,
          Body: image.buffer,
          ContentType: image.contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch (err) {
      this.logger.error(
        `Upload R2 échoué (${key}): ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new InternalServerErrorException(
        'Impossible d’enregistrer la photo sur le stockage.',
      );
    }

    return { key, publicUrl: this.resolvePublicUrl(key) };
  }

  async deleteByKey(key: string): Promise<void> {
    const cfg = this.requireConfig();
    const client = this.getClient();

    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: cfg.bucketName,
          Key: key,
        }),
      );
    } catch (err) {
      this.logger.warn(
        `Suppression R2 échouée (${key}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async deleteByPublicUrl(url: string | null | undefined): Promise<void> {
    const key = this.extractKeyFromPublicUrl(url);
    if (!key) return;
    await this.deleteByKey(key);
  }

  private getClient(): S3Client {
    if (this.client) return this.client;
    const cfg = this.requireConfig();
    this.client = new S3Client({
      region: 'auto',
      endpoint: cfg.endpoint,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
      forcePathStyle: true,
    });
    return this.client;
  }

  private readConfig():
    | {
        accessKeyId: string;
        secretAccessKey: string;
        bucketName: string;
        endpoint: string;
        publicBaseUrl: string;
      }
    | null {
    const accessKeyId = this.config.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>(
      'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    );
    const bucketName = this.config.get<string>('CLOUDFLARE_R2_BUCKET_NAME');
    const endpoint = this.config.get<string>('CLOUDFLARE_R2_ENDPOINT');
    const publicBaseUrl = this.config.get<string>(
      'CLOUDFLARE_R2_PUBLIC_BASE_URL',
    );

    if (
      !accessKeyId?.trim() ||
      !secretAccessKey?.trim() ||
      !bucketName?.trim() ||
      !endpoint?.trim() ||
      !publicBaseUrl?.trim()
    ) {
      return null;
    }

    return {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
      bucketName: bucketName.trim(),
      endpoint: endpoint.trim(),
      publicBaseUrl: publicBaseUrl.trim(),
    };
  }

  private requireConfig() {
    const cfg = this.readConfig();
    if (!cfg) {
      throw new InternalServerErrorException(
        'Stockage Cloudflare R2 non configuré (variables CLOUDFLARE_R2_*).',
      );
    }
    return cfg;
  }
}
