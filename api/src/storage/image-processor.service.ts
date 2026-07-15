import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import sharp from 'sharp';
import type { ProcessedAvatarImage, ProcessedMessageImage } from './storage.types';

const AVATAR_MAX_EDGE_PX = 512;
const AVATAR_WEBP_QUALITY = 80;
const MESSAGE_IMAGE_MAX_EDGE_PX = 2048;
const MESSAGE_JPEG_QUALITY = 88;
const MAX_INPUT_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

@Injectable()
export class ImageProcessorService {
  private readonly logger = new Logger(ImageProcessorService.name);

  assertUploadableImage(file: Express.Multer.File | undefined): void {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException('Aucun fichier image fourni.');
    }
    if (file.size > MAX_INPUT_BYTES) {
      throw new BadRequestException(
        'Image trop volumineuse (5 Mo maximum).',
      );
    }
    const mime = (file.mimetype ?? '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      throw new BadRequestException(
        'Format non supporté. Utilisez JPEG, PNG, WebP ou GIF.',
      );
    }
  }

  async processProfileAvatar(
    file: Express.Multer.File,
  ): Promise<ProcessedAvatarImage> {
    return this.processToWebp(file, {
      maxWidth: AVATAR_MAX_EDGE_PX,
      maxHeight: AVATAR_MAX_EDGE_PX,
      fit: 'cover',
      quality: AVATAR_WEBP_QUALITY,
    });
  }

  async processMessageAttachmentImage(
    file: Express.Multer.File,
  ): Promise<ProcessedMessageImage> {
    this.assertUploadableImage(file);

    try {
      const pipeline = sharp(file.buffer, { failOn: 'none' })
        .rotate()
        .resize(MESSAGE_IMAGE_MAX_EDGE_PX, MESSAGE_IMAGE_MAX_EDGE_PX, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: MESSAGE_JPEG_QUALITY, mozjpeg: true });

      const { data, info } = await pipeline.toBuffer({
        resolveWithObject: true,
      });

      return {
        buffer: data,
        contentType: 'image/jpeg',
        extension: 'jpg',
        width: info.width,
        height: info.height,
        byteLength: data.byteLength,
      };
    } catch (err) {
      this.logger.warn(
        `Échec traitement image messagerie Sharp: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException(
        'Impossible de traiter cette image. Vérifiez le fichier.',
      );
    }
  }

  private async processToWebp(
    file: Express.Multer.File,
    opts: {
      maxWidth: number;
      maxHeight: number;
      fit: 'cover' | 'inside';
      quality: number;
    },
  ): Promise<ProcessedAvatarImage> {
    this.assertUploadableImage(file);

    try {
      const pipeline = sharp(file.buffer, { failOn: 'none' })
        .rotate()
        .resize(opts.maxWidth, opts.maxHeight, {
          fit: opts.fit,
          position: 'centre',
          withoutEnlargement: true,
        })
        .webp({ quality: opts.quality });

      const { data, info } = await pipeline.toBuffer({
        resolveWithObject: true,
      });

      return {
        buffer: data,
        contentType: 'image/webp',
        extension: 'webp',
        width: info.width,
        height: info.height,
        byteLength: data.byteLength,
      };
    } catch (err) {
      this.logger.warn(
        `Échec traitement image Sharp: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException(
        'Impossible de traiter cette image. Vérifiez le fichier.',
      );
    }
  }
}

export const PROFILE_AVATAR_MAX_INPUT_BYTES = MAX_INPUT_BYTES;
