import { notify } from "../../store/useNoticeStore";
import React from "react";
import { getTransferErrorMessage } from "../../utils/apiError";
import { getImageDimensions } from "../../utils/appSupport";
import { CHUNK_UPLOAD_THRESHOLD, uploadFileChunked } from "../../utils/chunkedUpload";
import type { UploadApiClient, UploadItem, UploadResponse } from "./uploadTypes";

// Uploads files as they're added, tracking each one's progress in `items` (held
// by the form, through onChange), with cancel on remove and retry on failure.
export function useUploadQueue({
  items,
  onChange,
  multiple,
  apiClient,
  uploadEndpoint,
  deleteEndpointBase,
}: {
  items: UploadItem[];
  onChange?: (items: UploadItem[]) => void;
  multiple: boolean;
  apiClient: UploadApiClient;
  uploadEndpoint: string;
  deleteEndpointBase: string;
}) {
  const itemsRef = React.useRef(items);
  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const controllersRef = React.useRef<Record<string, AbortController>>({});

  // Progress fires many times a second per file, and several files can be
  // uploading at once (e.g. a 1GB file alongside others) - each one
  // independently calling patchItem, even throttled per-file, doesn't bound
  // the *combined* rate: 5 files each capped at ~10 updates/sec is still up
  // to 50 re-renders/sec of the whole list. This batches every patch from
  // every concurrently-uploading file into one flush at most every 100ms,
  // so the total re-render rate stays bounded no matter how many files (or
  // how many chunks of one large file) are in flight together - that
  // combined rate, not any single file's, is what made the list unscrollable.
  const pendingPatchesRef = React.useRef<Record<string, Partial<UploadItem>>>({});
  const flushScheduledRef = React.useRef(false);

  const flushPatches = React.useCallback(() => {
    flushScheduledRef.current = false;
    const patches = pendingPatchesRef.current;
    pendingPatchesRef.current = {};
    if (Object.keys(patches).length === 0) return;

    const next = itemsRef.current.map((it) =>
      patches[it.id] ? { ...it, ...patches[it.id] } : it,
    );
    itemsRef.current = next;
    onChange?.(next);
  }, [onChange]);

  // Stable across renders (only depends on `onChange`, which react-hook-form
  // keeps referentially stable per field) so FileRow below can be memoized -
  // an inline closure here would give every row a "new" prop every render,
  // which defeats React.memo regardless of whether the row's own data changed.
  const patchItem = React.useCallback(
    (id: string, patch: Partial<UploadItem>) => {
      pendingPatchesRef.current[id] = {
        ...pendingPatchesRef.current[id],
        ...patch,
      };
      if (!flushScheduledRef.current) {
        flushScheduledRef.current = true;
        setTimeout(flushPatches, 100);
      }
    },
    [flushPatches],
  );

  const uploadItem = React.useCallback(async (item: UploadItem) => {
    const controller = new AbortController();
    controllersRef.current[item.id] = controller;

    // No per-item throttling needed here anymore - patchItem itself now
    // batches every update (from every concurrently-uploading file) into a
    // single globally-bounded flush, so calling it on every raw progress
    // tick is fine.
    const onProgress = (percent: number) => {
      patchItem(item.id, { progress: percent });
    };

    try {
      // Uploads the real file, byte for byte - it used to go through
      // compressImage first, which re-encoded anything over 500KB as a
      // resized, quality-0.8 JPEG. That's why a downloaded file could come
      // back smaller (and lower-fidelity) than what was actually selected:
      // the compressed copy was the only one ever stored, so there was
      // nothing left to reconstruct the original from. It bought faster
      // uploads for large images, but the grid/lightbox previews never
      // depended on it - they're served from generate_thumbnail's own
      // server-side, disk-cached thumbnail, generated once from whatever
      // gets uploaded and unaffected by this either way. Large files are
      // now handled by chunked upload below instead, so there's no
      // performance case left for shrinking the stored copy.
      const dimensions = await getImageDimensions(item.file);
      const width = dimensions?.width ?? null;
      const height = dimensions?.height ?? null;
      const pixelWidth = dimensions?.pixelWidth ?? null;
      const pixelHeight = dimensions?.pixelHeight ?? null;

      // Cloudflare's proxy rejects any request body over ~100MB before it
      // reaches the backend at all (see chunkedUpload.ts) - anything above
      // the threshold has to be split into chunks instead of one request.
      const saved =
        item.file.size > CHUNK_UPLOAD_THRESHOLD
          ? await uploadFileChunked(
              item.file,
              { width, height, pixelWidth, pixelHeight },
              onProgress,
              controller.signal,
            )
          : await (async () => {
              const form = new FormData();
              form.append("files", item.file);
              form.append(
                "metadata",
                JSON.stringify([
                  {
                    filename: item.file.name,
                    width,
                    height,
                    pixel_width: pixelWidth,
                    pixel_height: pixelHeight,
                  },
                ]),
              );

              const res = await apiClient.postWithProgress<UploadResponse>(
                uploadEndpoint,
                form,
                onProgress,
                controller.signal,
              );
              return res.files[0];
            })();

      notify.success("File uploaded", {
        group: "files-uploaded",
        groupTitle: (n) => (n === 1 ? "File uploaded" : `${n} files uploaded`),
      });
      patchItem(item.id, {
        status: "done",
        progress: 100,
        path: saved.path,
        width: saved.width,
        height: saved.height,
        pixelWidth: saved.pixel_width,
        pixelHeight: saved.pixel_height,
      });
    } catch (err) {
      const { code, name } = (err ?? {}) as { code?: string; name?: string };
      const wasCancelled = code === "ERR_CANCELED" || name === "CanceledError";
      if (wasCancelled) return;

      const reason = getTransferErrorMessage(err, "upload");
      notify.error(`Couldn't upload ${item.name}`, { message: `${reason} Use Retry next to the file.` });
      patchItem(item.id, {
        status: "error",
        errorMessage: reason,
      });
    } finally {
      delete controllersRef.current[item.id];
    }
  }, [patchItem, apiClient, uploadEndpoint]);

  // Starts uploading these right away, replacing what's there unless `multiple`.
  const addFiles = (selected: File[]) => {
    const newItems: UploadItem[] = selected.map((file) => ({
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      status: "uploading",
      progress: 0,
    }));

    const merged = multiple ? [...itemsRef.current, ...newItems] : newItems;
    itemsRef.current = merged;
    onChange?.(merged);

    newItems.forEach((item) => uploadItem(item));
  };

  const removeItem = React.useCallback(
    (id: string) => {
      const item = itemsRef.current.find((it) => it.id === id);

      if (item?.status === "uploading") {
        controllersRef.current[id]?.abort();
        delete controllersRef.current[id];
      } else if (item?.status === "done" && item.path) {
        apiClient.delete(`${deleteEndpointBase}/${encodeURIComponent(item.path)}`).catch(() => {});
      }

      const next = itemsRef.current.filter((it) => it.id !== id);
      itemsRef.current = next;
      onChange?.(next);
    },
    [onChange, apiClient, deleteEndpointBase],
  );

  const retryItem = React.useCallback(
    (id: string) => {
      const item = itemsRef.current.find((it) => it.id === id);
      if (!item) return;
      patchItem(id, { status: "uploading", progress: 0, errorMessage: undefined });
      uploadItem({ ...item, status: "uploading", progress: 0 });
    },
    [patchItem, uploadItem],
  );

  return { addFiles, removeItem, retryItem };
}
