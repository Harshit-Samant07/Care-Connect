export async function uploadToCloudinary(file: File, cloudName: string, preset: string) {
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", preset); // unsigned preset must exist in Cloudinary
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", body: data });
  } catch {
    throw new Error("Network error while uploading. Check your connection.");
  }
  interface CloudinaryResponse {
    secure_url?: string;
    error?: { message?: string };
  }
  let json: CloudinaryResponse = {};
  try {
    json = await res.json();
  } catch {
    // ignore JSON parse error, will fallback to status text
  }
  if (!res.ok) {
    const cloudMsg = json.error?.message || res.statusText || "Upload failed";
    throw new Error(cloudMsg);
  }
  if (!json.secure_url) throw new Error("Upload succeeded but no URL returned.");
  return json.secure_url; // final https image URL
}
