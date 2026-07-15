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

export type ProcessedMessageImage = {
  buffer: Buffer;
  contentType: 'image/jpeg';
  extension: 'jpg';
  width: number;
  height: number;
  byteLength: number;
};

export type R2UploadResult = {
  key: string;
  publicUrl: string;
};

export type R2PrivateUploadResult = {
  key: string;
};

export type R2ObjectBody = {
  body: Buffer;
  contentType: string;
  contentLength: number;
};
