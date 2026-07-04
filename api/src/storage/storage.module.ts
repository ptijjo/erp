import { Module } from '@nestjs/common';
import { ImageProcessorService } from './image-processor.service';
import { R2ObjectStorageService } from './r2-object-storage.service';

@Module({
  providers: [ImageProcessorService, R2ObjectStorageService],
  exports: [ImageProcessorService, R2ObjectStorageService],
})
export class StorageModule {}
