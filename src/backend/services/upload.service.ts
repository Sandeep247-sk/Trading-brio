import { prisma } from "@/lib/prisma";
import { storageProvider } from "@/lib/storage/storage.provider";
import { ImageType } from "@prisma/client";
import { UPLOAD_CONFIG } from "@/lib/constants";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";

// ---------------------------------------------------------------------------
// Upload rate-limit (in-memory per process — sufficient for single-instance)
// For multi-instance deployments, move this to Redis/Upstash.
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_UPLOADS = 20;   // max uploads per user per window

const uploadCounts = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(userId: string): void {
  const now = Date.now();
  const entry = uploadCounts.get(userId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    uploadCounts.set(userId, { count: 1, windowStart: now });
    return;
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX_UPLOADS) {
    throw new Error(
      `Upload rate limit exceeded. Max ${RATE_LIMIT_MAX_UPLOADS} uploads per minute.`
    );
  }
}

// ---------------------------------------------------------------------------
// Magic-byte signatures for allowed image formats
// ---------------------------------------------------------------------------
const ALLOWED_MAGIC_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function validateMagicBytes(buffer: Buffer): Promise<string> {
  const result = await fileTypeFromBuffer(buffer);
  if (!result || !ALLOWED_MAGIC_TYPES.has(result.mime)) {
    throw new Error(
      `Invalid file content. Only JPEG, PNG, WEBP, and GIF images are accepted. ` +
        `Detected type: ${result?.mime ?? "unknown"}`
    );
  }
  return result.mime;
}

// ---------------------------------------------------------------------------
// Re-encode image with sharp to strip non-image bytes
// ---------------------------------------------------------------------------
async function reencodeWithSharp(
  buffer: Buffer,
  detectedMime: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const image = sharp(buffer, { failOn: "error" }).rotate(); // auto-orient via EXIF

  let outputBuffer: Buffer;
  let outputMime: string;

  // Always re-encode to WebP for compact, safe output
  outputBuffer = await image
    .webp({ quality: 85, effort: 4 })
    .toBuffer();
  outputMime = "image/webp";

  return { buffer: outputBuffer, mimeType: outputMime };
}

export class UploadService {
  /**
   * Validates (size, MIME allow-list, magic bytes), re-encodes via sharp,
   * and saves a trade screenshot. Applies per-user rate limiting.
   */
  static async processAndSaveScreenshot(
    file: File,
    type: ImageType,
    userId: string,
    tradeId: string
  ): Promise<any> {
    // 1. Rate-limit check
    checkRateLimit(userId);

    // 2. Size guard
    if (file.size > UPLOAD_CONFIG.maxFileSize) {
      throw new Error(`File size exceeds the maximum allowed limit of 10MB`);
    }

    // 3. Client-declared MIME allow-list (first cheap gate)
    if (!UPLOAD_CONFIG.allowedMimeTypes.includes(file.type as any)) {
      throw new Error(`Forbidden file type: ${file.type}`);
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());

    // 4. Server-side magic-byte validation — do NOT trust client Content-Type
    const detectedMime = await validateMagicBytes(rawBuffer);

    // 5. Re-encode with sharp to strip any non-image payloads
    const { buffer: optimizedBuffer, mimeType } = await reencodeWithSharp(rawBuffer, detectedMime);

    // 6. Generate unique UUID filename (always .webp after re-encode)
    const uuid = crypto.randomUUID();
    const typeFolder = type.toLowerCase().replace(/_/g, "-");
    const key = `trade-screenshots/${typeFolder}/${uuid}.webp`;

    // 7. Upload via StorageProvider
    const uploadResult = await storageProvider.uploadFile(optimizedBuffer, key, mimeType);

    // 8. Get URL (signed for Supabase private bucket, proxy for local)
    const url = await storageProvider.getPublicUrl(key);

    // 9. Save metadata in PostgreSQL
    const tradeImage = await prisma.tradeImage.create({
      data: {
        tradeId,
        type,
        url,
        key: uploadResult.key,
        mimeType,
        sizeBytes: uploadResult.sizeBytes,
      },
    });

    // 10. Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "UPDATE",
        entity: "trade_image",
        entityId: tradeImage.id,
        details: { tradeId, type, sizeBytes: uploadResult.sizeBytes, detectedMime },
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
      select: {
        id: true,
        key: true,
        tradeId: true,
        trade: {
          select: {
            account: {
              select: {
                userId: true,
              },
            },
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

    // Audit log
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
