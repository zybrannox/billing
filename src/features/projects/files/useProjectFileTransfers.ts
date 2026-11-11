import { notify } from "../../../store/useNoticeStore";
import { useState } from "react";
import { apiService } from "../../../api/service";
import { useDownloadProgressStore } from "../../../store/useDownloadProgressStore";
import { useProjectStore } from "../../../store/useProjectStore";
import { getTransferErrorMessage } from "../../../utils/apiError";
import { getImageDimensions } from "../../../utils/appSupport";
import { runBrowserDownload } from "../../../utils/browserDownload";
import { uploadFileChunked, CHUNK_UPLOAD_THRESHOLD } from "../../../utils/chunkedUpload";
import { LARGE_DOWNLOAD_BYTES, assertDownloadable, saveBlob } from "../../../utils/fileDownload";
import { API_BASE_URL, sizeOf, storagePath, type ProjectFile } from "./projectFile";

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB, matches GmailFileUploader

// Uploads straight to an existing project. Large files still go through the
// chunked path (then a single attach call): see utils/chunkedUpload.ts.
async function uploadToProject(projectId: string | number, file: File, onProgress: (percent: number) => void) {
  const dims = await getImageDimensions(file);
  if (file.size > CHUNK_UPLOAD_THRESHOLD) {
    const uploaded = await uploadFileChunked(
      file,
      {
        width: dims?.width ?? null,
        height: dims?.height ?? null,
        pixelWidth: dims?.pixelWidth ?? null,
        pixelHeight: dims?.pixelHeight ?? null,
      },
      onProgress,
      new AbortController().signal,
    );
    await apiService.post(`/files/attach/${projectId}`, {
      files: [
        {
          path: uploaded.path,
          original_name: uploaded.original_name,
          width: uploaded.width,
          height: uploaded.height,
          pixel_width: uploaded.pixel_width,
          pixel_height: uploaded.pixel_height,
        },
      ],
    });
    return;
  }
  const form = new FormData();
  form.append("files", file);
  form.append(
    "metadata",
    JSON.stringify([
      {
        filename: file.name,
        width: dims?.width ?? null,
        height: dims?.height ?? null,
        pixel_width: dims?.pixelWidth ?? null,
        pixel_height: dims?.pixelHeight ?? null,
      },
    ]),
  );
  await apiService.postWithProgress(`/files/upload/${projectId}`, form, onProgress);
}

// Moving the open project's files in both directions, with the progress to show.
export function useProjectFileTransfers(files: ProjectFile[]) {
  const selectedProject = useProjectStore((state) => state.selectedProject);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // `path` addresses the file on the server (must be the real stored name);
  // `saveAsName` is what the browser names the downloaded file. Keeping these
  // separate is what stops downloads saving under the UUID storage name.
  const download = async (path: string, saveAsName: string) => {
    // Reflected in the shared bottom-right indicator as well as the inline ring.
    const { downloads, start, update, finish, fail } = useDownloadProgressStore.getState();
    // Already running: a second copy would only compete with the first.
    if (downloads.some((d) => d.id === path && !d.done && !d.error)) return;
    start(path, saveAsName);

    const file = files.find((f) => storagePath(f) === path);
    if (file && (sizeOf(file) ?? 0) > LARGE_DOWNLOAD_BYTES) {
      const url = `${API_BASE_URL}/files/download/${encodeURIComponent(path)}`;
      try {
        await assertDownloadable(url);
        await runBrowserDownload(url, (progress) => update(path, progress));
        finish(path);
      } catch (err) {
        console.error("Download error:", err);
        fail(path, getTransferErrorMessage(err, "download"));
        return;
      }
      // The server has marked it by now (see TrackedFileResponse).
      if (selectedProject) {
        await refreshProject(selectedProject.id).catch((err) => console.error("Could not refresh the project:", err));
      }
      return;
    }

    try {
      const blob = await apiService.getWithProgress<Blob>(
        `/files/download/${encodeURIComponent(path)}`,
        ({ percent, loaded, total }) => update(path, { percent, loaded, total }),
        { responseType: "blob" },
      );

      saveBlob(blob, saveAsName);
      finish(path);
    } catch (err) {
      console.error("Download error:", err);
      fail(path, getTransferErrorMessage(err, "download"));
      return;
    }

    // Only now does the file turn green, and only for a download that really
    // finished. It's already saved, so failing to record that isn't a failed
    // download - hence outside the try above.
    try {
      await apiService.post(`/files/download/${encodeURIComponent(path)}/confirm`);
      if (selectedProject) await refreshProject(selectedProject.id);
    } catch (err) {
      console.error("Could not record the download:", err);
    }
  };

  // One file at a time, never several in one request: a few files that are each
  // under the chunking threshold can still add up to more than Cloudflare's
  // ~100MB request limit. It also means one bad file only fails itself, instead
  // of taking the rest of the selection down with it.
  const upload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !selectedProject) return;
    const selected = Array.from(fileList);

    const oversized = selected.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      setUploadError(`File limit exceeded: ${oversized.map((f) => f.name).join(", ")} must be under 1GB.`);
      return;
    }

    setUploadError(null);
    setUploadProgress(0);

    const totalBytes = selected.reduce((sum, f) => sum + f.size, 0) || 1;
    let finishedBytes = 0;
    const failures: string[] = [];

    for (const file of selected) {
      // Progress across the whole selection, not a bar that restarts per file.
      const onProgress = (percent: number) =>
        setUploadProgress(Math.min(99, Math.round(((finishedBytes + (file.size * percent) / 100) / totalBytes) * 100)));

      try {
        await uploadToProject(selectedProject.id, file, onProgress);
      } catch (err) {
        console.error("Upload error:", err);
        failures.push(`${file.name}: ${getTransferErrorMessage(err, "upload")}`);
      }
      finishedBytes += file.size;
    }

    setUploadProgress(null);
    if (failures.length > 0) setUploadError(failures.join(" "));
    const uploaded = selected.length - failures.length;
    if (uploaded > 0) notify.success(uploaded === 1 ? "File uploaded" : `${uploaded} files uploaded`);
    if (failures.length > 0)
      notify.error(failures.length === 1 ? "A file didn't upload" : `${failures.length} files didn't upload`, { message: failures.join(" ") });
    // Whatever did succeed should show up even if something else failed.
    await refreshProject(selectedProject.id).catch((err) => console.error("Could not refresh the project:", err));
  };

  return { download, upload, uploadProgress, uploadError };
}
