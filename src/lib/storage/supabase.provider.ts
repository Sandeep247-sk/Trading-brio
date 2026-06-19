import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = "trade-screenshots";

export class SupabaseStorageProvider {
  async uploadFile(
    file: Buffer,
    key: string,
    mimeType: string
  ) {
    const { error } = await supabase.storage
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
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([key]);

    if (error) throw error;
  }

  async getPublicUrl(key: string) {
    const { data } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(key);

    return data.publicUrl;
  }
}