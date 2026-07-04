export type ProcessedAvatarImage = {
  buffer: Buffer;
  contentType: 'image/webp';
  extension: 'webp';
  width: number;
  height: number;
  byteLength: number;
};

export type R2UploadResult = {
  key: string;
  publicUrl: string;
};
