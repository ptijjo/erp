import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertOrganizationResourceAccess,
  isMainOrganizationUser,
} from '../auth/organization-scope';
import {
  assertMainOrgPoleDomain,
  POLE_DOMAIN,
} from '../auth/pole-scope';
import { isFullAccessRoleName } from '../casl/define-ability';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { ImageProcessorService } from '../storage/image-processor.service';
import { R2ObjectStorageService } from '../storage/r2-object-storage.service';
import {
  NotificationType,
  SpiritualArticleStatus,
  type Prisma,
} from '../generated/prisma/client';
import type {
  CreateSpiritualArticleDto,
  UpdateSpiritualArticleDto,
} from './dto/spiritual-article.dto';

const articleInclude = {
  organization: { select: { id: true, name: true, slug: true } },
  author: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      profilePhotoUrl: true,
    },
  },
} satisfies Prisma.SpiritualArticleInclude;

@Injectable()
export class SpiritualArticleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly imageProcessor: ImageProcessorService,
    private readonly objectStorage: R2ObjectStorageService,
  ) {}

  async findPublishedFeed(viewer: AuthenticatedUser) {
    void viewer;
    return this.prisma.spiritualArticle.findMany({
      where: { status: SpiritualArticleStatus.PUBLISHED },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      include: articleInclude,
    });
  }

  async findManageList(viewer: AuthenticatedUser) {
    this.assertCanManage(viewer);
    return this.prisma.spiritualArticle.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      include: articleInclude,
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.spiritualArticle.findUnique({
      where: { id },
      include: articleInclude,
    });
    if (!row) {
      throw new NotFoundException('Article introuvable.');
    }
    if (row.status === SpiritualArticleStatus.DRAFT) {
      this.assertCanManage(viewer);
    }
    return row;
  }

  async create(dto: CreateSpiritualArticleDto, viewer: AuthenticatedUser) {
    this.assertCanManage(viewer);
    assertOrganizationResourceAccess(viewer, dto.organizationId);
    return this.prisma.spiritualArticle.create({
      data: {
        organizationId: dto.organizationId,
        authorUserId: viewer.sub,
        title: dto.title.trim(),
        content: dto.content.trim(),
        status: SpiritualArticleStatus.DRAFT,
      },
      include: articleInclude,
    });
  }

  async update(
    id: string,
    dto: UpdateSpiritualArticleDto,
    viewer: AuthenticatedUser,
  ) {
    const row = await this.findOne(id, viewer);
    if (row.status === SpiritualArticleStatus.PUBLISHED) {
      this.assertCanManage(viewer);
    }
    return this.prisma.spiritualArticle.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.content !== undefined ? { content: dto.content.trim() } : {}),
      },
      include: articleInclude,
    });
  }

  async publish(id: string, viewer: AuthenticatedUser) {
    const row = await this.findOne(id, viewer);
    this.assertCanManage(viewer);
    if (row.status === SpiritualArticleStatus.PUBLISHED) {
      throw new BadRequestException('Cet article est déjà publié.');
    }

    const updated = await this.prisma.spiritualArticle.update({
      where: { id },
      data: {
        status: SpiritualArticleStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      include: articleInclude,
    });

    await this.notifyGroupWide(updated);

    return updated;
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    const row = await this.findOne(id, viewer);
    this.assertCanManage(viewer);
    if (row.coverImageUrl) {
      await this.objectStorage.deleteByPublicUrl(row.coverImageUrl);
    }
    return this.prisma.spiritualArticle.delete({ where: { id } });
  }

  async uploadCover(
    id: string,
    file: Express.Multer.File,
    viewer: AuthenticatedUser,
  ) {
    const row = await this.findOne(id, viewer);
    this.assertCanManage(viewer);

    const processed = await this.imageProcessor.processArticleCover(file);
    const key = this.objectStorage.buildSpiritualArticleCoverKey(id);
    const uploaded = await this.objectStorage.uploadImage(key, processed);

    if (row.coverImageUrl) {
      await this.objectStorage.deleteByPublicUrl(row.coverImageUrl);
    }

    return this.prisma.spiritualArticle.update({
      where: { id },
      data: { coverImageUrl: uploaded.publicUrl },
      include: articleInclude,
    });
  }

  async removeCover(id: string, viewer: AuthenticatedUser) {
    const row = await this.findOne(id, viewer);
    this.assertCanManage(viewer);
    if (row.coverImageUrl) {
      await this.objectStorage.deleteByPublicUrl(row.coverImageUrl);
    }
    return this.prisma.spiritualArticle.update({
      where: { id },
      data: { coverImageUrl: null },
      include: articleInclude,
    });
  }

  private assertCanManage(viewer: AuthenticatedUser): void {
    if (!isMainOrganizationUser(viewer)) {
      throw new ForbiddenException(
        'Seul le pôle spiritualité peut gérer les articles.',
      );
    }
    if (isFullAccessRoleName(viewer.role.name)) {
      return;
    }
    assertMainOrgPoleDomain(viewer, POLE_DOMAIN.TRADITIONAL);
  }

  private async notifyGroupWide(article: {
    id: string;
    title: string;
    organizationId: string;
  }): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, organizationId: true },
    });

    const excerpt =
      article.title.length > 80
        ? `${article.title.slice(0, 77)}…`
        : article.title;

    for (const user of users) {
      void this.notificationService.create({
        userId: user.id,
        type: NotificationType.SPIRITUAL_ARTICLE_PUBLISHED,
        title: 'Nouvel article — spiritualité',
        body: `${excerpt}. Consultez le canal spiritualité.`,
        organizationId: user.organizationId,
        metadata: {
          spiritualArticleId: article.id,
          href: `/dashboard/spiritualite/${article.id}`,
        },
      });
    }
  }
}
