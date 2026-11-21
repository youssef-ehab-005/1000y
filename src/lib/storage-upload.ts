import { supabase } from "@/integrations/supabase/client";

const BUCKET = "category-images";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 years

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/**
 * Uploads an image to storage under the given folder and returns a long-lived
 * signed URL that can be stored in the database.
 */
export async function uploadImageToStorage(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "31536000", upsert: false });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) throw error ?? new Error("Could not create image URL");
  return data.signedUrl;
}


/** Upload a customer payment proof to the private bucket. Returns the object path, not a public URL. */
export async function uploadPaymentProof(file: File, userId: string): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Only JPG, JPEG, PNG and WEBP images are allowed.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Payment proof must be 5 MB or smaller.");
  }
  const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("payment-proofs")
    .upload(path, file, { cacheControl: "300", upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}
