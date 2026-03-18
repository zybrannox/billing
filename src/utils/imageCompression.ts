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

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
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

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            // Only return compressed file if it's actually smaller
            if (compressedFile.size < file.size) {
              console.log(
                `Compressed ${file.name}: ${(file.size / 1024).toFixed(1)}KB -> ${(compressedFile.size / 1024).toFixed(1)}KB`,
              );
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality,
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}
