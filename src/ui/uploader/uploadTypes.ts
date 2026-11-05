export interface UploadItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: "uploading" | "done" | "error";
  progress: number;
  path?: string;
  width?: number | null;
  height?: number | null;
  pixelWidth?: number | null;
  pixelHeight?: number | null;
  errorMessage?: string;
}

export interface UploadResponse {
  files: Array<{
    path: string;
    original_name: string;
    width: number | null;
    height: number | null;
    pixel_width: number | null;
    pixel_height: number | null;
  }>;
}

// The subset of apiService this component actually calls - lets a caller
// (e.g. the client portal's SubmitJobRequest.tsx, which has no staff
// session and must authenticate against a *different* cookie/axios
// instance - see api/portalService.ts) swap in its own client instead of
// this always hitting the staff-only apiService/axiosClient underneath.
export interface UploadApiClient {
  postWithProgress: <T>(
    url: string,
    data: FormData,
    onProgress: (percent: number) => void,
    signal?: AbortSignal,
  ) => Promise<T>;
  delete: <T>(url: string) => Promise<T>;
}
