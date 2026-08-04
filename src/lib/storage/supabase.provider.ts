import { createClient, SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "trade-screenshots";
// Signed URL TTL in seconds — 1 hour
const SIGNED_URL_TTL = 3600;

export class SupabaseStorageProvider {
  private supabaseClient: SupabaseClient | null = null;

  private get supabase(): SupabaseClient {
    if (!this.supabaseClient) {
      this.supabaseClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }
    return this.supabaseClient;
  }

  async uploadFile(
    file: Buffer,
    key: string,
    mimeType: string
  ) {
    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(key, file, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) throw error;

    return {
      key,
      sizeBytes: file.length,
    };
  }

  async deleteFile(key: string) {
    const { error } = await this.supabase.storage
      .from(BUCKET)
      .remove([key]);

    if (error) throw error;
  }

  /**
   * Returns a short-lived signed URL for the given key (private bucket).
   * Falls back to the authenticated proxy route for non-Supabase providers.
   */
  async getPublicUrl(key: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUrl(key, SIGNED_URL_TTL);

    if (error || !data?.signedUrl) {
      // Fallback: serve through our own authenticated proxy
      return `/api/uploads/${key.replace(/\\/g, "/")}`;
    }

    return data.signedUrl;
  }

  /**
   * Generates a fresh signed URL for an existing key.
   * Used by trade image endpoints to refresh URLs on-demand.
   */
  async createSignedUrl(key: string, ttl: number = SIGNED_URL_TTL): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUrl(key, ttl);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to create signed URL for key: ${key}`);
    }

    return data.signedUrl;
  }

  // Required by the StorageProvider interface — not used for Supabase (no raw stream)
  async getFileStream(key: string): Promise<never> {
    throw new Error("getFileStream is not supported on SupabaseStorageProvider. Use getPublicUrl() instead.");
  }
}