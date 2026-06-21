import { createClient, SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "trade-screenshots";

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

  async getPublicUrl(key: string) {
    const { data } = this.supabase.storage
      .from(BUCKET)
      .getPublicUrl(key);

    return data.publicUrl;
  }
}