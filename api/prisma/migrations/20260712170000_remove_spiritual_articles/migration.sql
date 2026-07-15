-- Suppression du canal spiritualité (articles)
DELETE FROM "Notification" WHERE "type" = 'SPIRITUAL_ARTICLE_PUBLISHED';

DROP TABLE IF EXISTS "SpiritualArticle";

DROP TYPE IF EXISTS "SpiritualArticleStatus";

-- Suppression des permissions liées aux articles
DELETE FROM "PermissionRole"
WHERE "permissionId" IN (
  SELECT "id" FROM "Permission" WHERE "name" LIKE '%:SpiritualArticle'
);

DELETE FROM "Permission" WHERE "name" LIKE '%:SpiritualArticle';
