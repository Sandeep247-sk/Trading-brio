import { prisma } from "@/lib/prisma";
import { storageProvider } from "@/lib/storage/storage.provider";
import { ImageType } from "@prisma/client";
import { UPLOAD_CONFIG } from "@/lib/constants";

export class UploadService {
  /**
   * Validates, optimizes, converts to WebP, and saves a trade screenshot.
   */
  static async processAndSaveScreenshot(
    file: File,
    type: ImageType,
    userId: string,
    tradeId: string
  ): Promise<any> {
    // 1. Basic validation of size
    if (file.size > UPLOAD_CONFIG.maxFileSize) {
      throw new Error(`File size exceeds the maximum allowed limit of 10MB`);
    }

    // 2. Validate MIME type
    if (!UPLOAD_CONFIG.allowedMimeTypes.includes(file.type as any)) {
      throw new Error(`Forbidden file type: ${file.type}`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let optimizedBuffer: any = buffer;
    let width: number | undefined;
    let height: number | undefined;
    let isWebp = true;

    try {
      // Dynamically import sharp to prevent crashes if it is missing or incompatible on Vercel
      const sharpModule = await import("sharp");
      const sharp = sharpModule.default;

      // 3. Extract dimensions and validate that it's a valid image using sharp
      const imageInfo = sharp(buffer);
      const metadata = await imageInfo.metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error("Invalid image dimensions");
      }
      
      width = metadata.width;
      height = metadata.height;

      // 4. Convert and optimize to WebP with quality 80
      optimizedBuffer = await imageInfo
        .webp({ quality: 80 })
        .toBuffer();
    } catch (error: any) {
      console.error("Image optimization failed, falling back to original buffer:", error);
      isWebp = false;
    }

    // 5. Generate unique UUID filename
    const uuid = crypto.randomUUID();
    const typeFolder = type.toLowerCase().replace(/_/g, "-");
    const ext = isWebp ? "webp" : (file.type === "image/png" ? "png" : file.type === "image/jpeg" || file.type === "image/jpg" ? "jpg" : "webp");
    const mimeType = isWebp ? "image/webp" : file.type;
    const key = `trade-screenshots/${typeFolder}/${uuid}.${ext}`;

    // 6. Upload file via StorageProvider
    const uploadResult = await storageProvider.uploadFile(
      optimizedBuffer,
      key,
      mimeType
    );

    const publicUrl = await storageProvider.getPublicUrl(key);

    // 7. Save metadata in PostgreSQL
    const tradeImage = await prisma.tradeImage.create({
      data: {
        tradeId,
        type,
        url: publicUrl,
        key: uploadResult.key,
        mimeType,
        sizeBytes: uploadResult.sizeBytes,
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "UPDATE",
        entity: "trade_image",
        entityId: tradeImage.id,
        details: { tradeId, type, sizeBytes: uploadResult.sizeBytes, width, height },
      },
    });

    return tradeImage;
  }

  /**
   * Deletes a screenshot from both PostgreSQL and storage.
   */
  static async deleteScreenshot(
    userId: string,
    imageId: string
  ): Promise<void> {
    // Enforce ownership
    const image = await prisma.tradeImage.findUnique({
      where: { id: imageId },
      include: {
        trade: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!image) {
      throw new Error("Image not found");
    }

    if (image.trade.account.userId !== userId) {
      throw new Error("Unauthorized access to delete this image");
    }

    // Delete from storage
    await storageProvider.deleteFile(image.key);

    // Delete from database
    await prisma.tradeImage.delete({
      where: { id: imageId },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "DELETE",
        entity: "trade_image",
        entityId: imageId,
        details: { tradeId: image.tradeId, key: image.key },
      },
    });
  }
}
