import { Modal, Box } from "@mui/material";
import { useModalStore } from "../../store/useModalStore";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 600,
  bgcolor: "white",
  boxShadow: 24,
  p: 2,
  borderRadius: 2,
};

export default function ImageModal() {
  const { open, images, close } = useModalStore();

  return (
    <Modal open={open} onClose={close}>
      <Box sx={style}>
        <h2>Project Images</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt="project"
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "8px",
                objectFit: "cover",
                border: "1px solid #ddd",
              }}
            />
          ))}
        </div>
      </Box>
    </Modal>
  );
}
