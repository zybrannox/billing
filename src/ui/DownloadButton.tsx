import { Button } from "@mui/material";

export default function DownloadButton({ filename }: { filename: string }) {
  const downloadUrl = `${
    import.meta.env.VITE_API_URL
  }/files/download/${filename}`;

  return (
    <Button
      variant="contained"
      color="primary"
      onClick={() => {
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }}
    >
      Download
    </Button>
  );
}
