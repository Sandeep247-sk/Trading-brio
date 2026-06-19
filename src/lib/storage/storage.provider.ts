import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

export interface StorageProvider {
  uploadFile(
    file: Buffer,
    key: string,
    mimeType: string
  ): Promise<{ key: string; sizeBytes: number }>;
  deleteFile(key: string): Promise<void>;
  getFileStream(key: string): Promise<Readable>;
  getPublicUrl(key: string): Promise<string>;
}

export class LocalStorageProvider implements StorageProvider {
  private uploadRoot: string;

  constructor() {
    const isVercel = process.env.VERCEL === "1";
    const root = isVercel ? "/tmp" : (process.env.UPLOAD_ROOT || "./uploads");
    this.uploadRoot = path.isAbsolute(root) ? root : path.resolve(process.cwd(), root);
  }

  private getFullPath(key: string): string {
    // Prevent directory traversal attacks
    const safeKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
    const fullPath = path.join(this.uploadRoot, safeKey);
    
    // Ensure the path stays within the upload root
    if (!fullPath.startsWith(this.uploadRoot)) {
      throw new Error("Directory traversal attempt detected");
    }
    
    return fullPath;
  }

  async uploadFile(
    file: Buffer,
    key: string,
    mimeType: string
  ): Promise<{ key: string; sizeBytes: number }> {
    const fullPath = this.getFullPath(key);
    const dir = path.dirname(fullPath);

    // Create directories if they do not exist
    await fsPromises.mkdir(dir, { recursive: true });

    // Write file to disk
    await fsPromises.writeFile(fullPath, file);

    return {
      key,
      sizeBytes: file.length,
    };
  }

  async deleteFile(key: string): Promise<void> {
    const fullPath = this.getFullPath(key);
    try {
      await fsPromises.unlink(fullPath);
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  async getFileStream(key: string): Promise<Readable> {
    const fullPath = this.getFullPath(key);
    try {
      await fsPromises.access(fullPath, fs.constants.R_OK);
    } catch {
      throw new Error(`File not found or not readable: ${key}`);
    }
    return fs.createReadStream(fullPath);
  }

  async getPublicUrl(key: string): Promise<string> {
    // Return relative authenticated URL path
    const normalizedKey = key.replace(/\\/g, "/");
    return `/api/uploads/${normalizedKey}`;
  }
}

export class R2StorageProvider implements StorageProvider {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID || "";
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
    this.bucketName = process.env.R2_BUCKET_NAME || "trading-os-uploads";
    this.publicUrl = process.env.R2_PUBLIC_URL || "";

    // Cloudflare R2 S3 API Endpoint: https://<account_id>.r2.cloudflarestorage.com
    this.s3Client = new S3Client({
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      region: "auto",
    });
  }

  async uploadFile(
    file: Buffer,
    key: string,
    mimeType: string
  ): Promise<{ key: string; sizeBytes: number }> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: mimeType,
    });

    await this.s3Client.send(command);

    return {
      key,
      sizeBytes: file.length,
    };
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    await this.s3Client.send(command);
  }

  async getFileStream(key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    const response = await this.s3Client.send(command);
    if (!response.Body) {
      throw new Error(`File not found in R2: ${key}`);
    }
    return response.Body as Readable;
  }

  async getPublicUrl(key: string): Promise<string> {
    const normalizedKey = key.replace(/\\/g, "/");
    if (this.publicUrl) {
      return `${this.publicUrl}/${normalizedKey}`;
    }
    return `/api/uploads/${normalizedKey}`;
  }
}

// Choose active storage provider based on environment config
const isR2Configured = 
  !!process.env.R2_ACCOUNT_ID &&
  !!process.env.R2_ACCESS_KEY_ID &&
  !!process.env.R2_SECRET_ACCESS_KEY;

export const storageProvider: StorageProvider = isR2Configured
  ? new R2StorageProvider()
  : new LocalStorageProvider();

console.log(
  "Using storage provider:",
  storageProvider.constructor.name
);

console.log("R2_ACCOUNT_ID:", !!process.env.R2_ACCOUNT_ID);
console.log("R2_ACCESS_KEY_ID:", !!process.env.R2_ACCESS_KEY_ID);
console.log("R2_SECRET_ACCESS_KEY:", !!process.env.R2_SECRET_ACCESS_KEY);
console.log("R2_BUCKET_NAME:", !!process.env.R2_BUCKET_NAME);
console.log("R2_PUBLIC_URL:", !!process.env.R2_PUBLIC_URL);