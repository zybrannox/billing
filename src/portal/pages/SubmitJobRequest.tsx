import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomForm, { type FieldDefinition } from "../../common/components/CustomForm";
import { portalApiService } from "../../api/portalService";
import { CHUNK_UPLOAD_THRESHOLD } from "../../utils/chunkedUpload";
import { getApiErrorMessage } from "../../utils/apiError";
import type { UploadItem } from "../../ui/GmailFileUploader";

const fields: FieldDefinition[] = [
  {
    name: "description",
    label: "What do you need done?",
    type: "textarea",
    placeholder: "Describe the job - size, quantity, material, deadline, etc.",
    required: true,
  },
  {
    name: "files",
    label: "Reference files (optional)",
    type: "file_upload",
    multiple: true,
    uploadApiClient: portalApiService,
    uploadEndpoint: "/job-requests/upload",
    deleteEndpointBase: "/job-requests/upload",
    // No chunked-upload endpoint exists for clients in v1 (see
    // app/job_requests/controller.py) - capping at the same threshold the
    // staff app switches to chunking at means a file too big for the
    // plain endpoint is rejected here with a clear message, instead of
    // GmailFileUploader silently routing it into the staff-only chunked
    // endpoints and failing with a confusing 401.
    maxFileSize: CHUNK_UPLOAD_THRESHOLD,
  },
];

// Mirrors AddProject.tsx's "create then attach" pattern: files upload to
// storage immediately on pick (see GmailFileUploader), then the job
// request is created, then already-uploaded files are linked to it - no
// re-upload of bytes.
export default function SubmitJobRequest() {
  const navigate = useNavigate();
  const filesRef = useRef<UploadItem[]>([]);
  const submittedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (submittedRef.current) return;
      filesRef.current
        .filter((item) => item.status === "done" && item.path)
        .forEach((item) => {
          portalApiService.delete(`/job-requests/upload/${encodeURIComponent(item.path!)}`).catch(() => {});
        });
    };
  }, []);

  const handleSubmit = async (formData: any) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const items: UploadItem[] = formData.files || [];
    if (items.some((item) => item.status === "uploading")) {
      alert("Please wait for all files to finish uploading before submitting.");
      return;
    }

    const attachedFiles = items
      .filter((item) => item.status === "done" && item.path)
      .map((item) => ({
        path: item.path,
        original_name: item.name,
        width: item.width ?? null,
        height: item.height ?? null,
        pixel_width: item.pixelWidth ?? null,
        pixel_height: item.pixelHeight ?? null,
      }));

    setLoading(true);
    try {
      const jobRequest = await portalApiService.post<{ id: number }>("/job-requests/", {
        description: formData.description,
      });
      submittedRef.current = true;

      if (attachedFiles.length > 0 && jobRequest?.id) {
        await portalApiService.post(`/job-requests/${jobRequest.id}/attach-files`, {
          files: attachedFiles,
        });
      }

      setSuccessMessage("Your job request has been submitted. We'll be in touch soon.");
      setTimeout(() => navigate("/portal/job-requests"), 1200);
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, "Couldn't submit your request. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl">
      <div className="p-6 pb-0">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Submit New Job</h1>
        <p className="text-slate-500 text-sm mb-4">
          Tell us what you need and attach any reference files - we'll review it and get started.
        </p>
        {successMessage && (
          <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 mb-4">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-4">
            {errorMessage}
          </div>
        )}
      </div>
      <CustomForm
        fields={fields}
        onSubmit={handleSubmit}
        buttonName="Submit Request"
        loading={loading}
        onValuesChange={(values) => {
          filesRef.current = values.files || [];
        }}
      />
    </div>
  );
}
