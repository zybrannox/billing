import type { GridRowClassNameParams } from "@mui/x-data-grid";

export const getInitials = (name?: string): string => {
  if (!name) return "";

  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

export function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch (e) {
    return null;
  }
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export const getRowClassName = (params: GridRowClassNameParams) => {
  if (params.row.print_status === "Completed") {
    return "row-print-completed";
  }
  return "";
};

export const getImageDimensions = (
  file: File,
): Promise<{
  width: number;
  height: number;
} | null> => {
  return new Promise((resolve) => {
    if (
      !file.type.startsWith("image/") ||
      file.type === "image/heic" ||
      file.type === "image/heif"
    ) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const widthInInches = parseFloat((img.width / 96).toFixed(2));
      const heightInInches = parseFloat((img.height / 96).toFixed(2));

      resolve({ width: widthInInches, height: heightInInches });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
};