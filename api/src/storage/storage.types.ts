export type ProcessedAvatarImage = {
  buffer: Buffer;
  contentType: 'image/webp';
  extension: 'webp';
  width: number;
  height: number;
  byteLength: number;
};

/** Image traitée (avatar, couverture article, etc.). */
export type ProcessedImage = ProcessedAvatarImage;

export type R2UploadResult = {
  key: string;
  publicUrl: string;
};
