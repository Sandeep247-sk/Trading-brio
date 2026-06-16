import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { Readable } from "stream";

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

// Export active storage provider (defaulting to local)
export const storageProvider = new LocalStorageProvider();
