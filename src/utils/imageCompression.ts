/**
 * Compresses an image file on the client side before upload.
 *
 * @param file The original image file
 * @param maxWidth The maximum width of the compressed image
 * @param maxHeight The maximum height of the compressed image
 * @param quality The compression quality (0 to 1)
 * @returns A promise that resolves to the compressed Blob/File
 */
export async function compressImage(
  file: File,
  maxWidth: number = 2048,
  maxHeight: number = 2048,
  quality: number = 0.8,
): Promise<File> {
  // Only compress images
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  // Skip if file is already small (e.g. < 500KB)
  if (file.size < 500 * 1024) {
    return file;
  }

  try {
    // createImageBitmap decodes off the main thread in every modern
    // browser. The FileReader->base64 data URL->new Image() approach this
    // replaced forced a synchronous decode on the main thread per file,
    // which was real, noticeable jank once a few large images were
    // compressing at the same time (several uploads start in parallel -
    // see GmailFileUploader).
    const bitmap = await createImageBitmap(file);

    let width = bitmap.width;
    let height = bitmap.height;
    if (width > height) {
      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width *= maxHeight / height;
        height = maxHeight;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return file;

    const compressedFile = new File([blob], file.name, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    // Only return compressed file if it's actually smaller
    return compressedFile.size < file.size ? compressedFile : file;
  } catch {
    // createImageBitmap can reject on a corrupt/unsupported image - upload
    // the original rather than failing the attachment outright.
    return file;
  }
}
