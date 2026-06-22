import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

export const getAssetUri = (asset) => (typeof asset === "string" ? asset : asset?.uri);

export const getExtensionFromMime = (mimeType) => {
  if (!mimeType) return "jpg";
  const subtype = mimeType.split("/")[1]?.split(";")[0]?.toLowerCase();
  if (!subtype) return "jpg";
  if (subtype === "jpeg" || subtype === "jpg") return "jpg";
  if (subtype === "png") return "png";
  if (subtype === "heic" || subtype === "heif") return "heic";
  return subtype.replace(/[^a-z0-9]/g, "") || "jpg";
};

export const getMimeFromName = (fileName) => {
  const ext = String(fileName || "").split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "heic") return "image/heic";
  if (ext === "heif") return "image/heif";
  return "image/jpeg";
};

const isHeicLike = (asset) => {
  const uri = getAssetUri(asset) || "";
  const mimeType = asset?.mimeType || getMimeFromName(asset?.fileName || uri);
  const extension = getExtensionFromMime(mimeType);
  return extension === "heic" || /\.hei(c|f)$/i.test(uri);
};

export const normalizeImageAssetForUpload = async (asset, options = {}) => {
  const prefix = options.prefix || "image";
  const uri = asset?.uri;
  if (!uri) return null;

  if (isHeicLike(asset)) {
    const result = await manipulateAsync(
      uri,
      [],
      {
        compress: 0.82,
        format: SaveFormat.JPEG
      }
    );

    return {
      uri: result.uri,
      fileName: `${prefix}-${Date.now()}.jpg`,
      mimeType: "image/jpeg",
      width: result.width,
      height: result.height
    };
  }

  const mimeType = asset.mimeType || getMimeFromName(asset.fileName || uri);
  const extension = getExtensionFromMime(mimeType);
  const uriName = uri.split("/").pop()?.split("?")[0];
  const fileName = asset.fileName || uriName || `${prefix}-${Date.now()}.${extension}`;

  return {
    uri,
    fileName: fileName.includes(".") ? fileName : `${fileName}.${extension}`,
    mimeType,
    width: asset.width,
    height: asset.height
  };
};
