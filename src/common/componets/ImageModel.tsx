import { Modal, Box, IconButton, Typography } from "@mui/material";
import { useModalStore } from "../../store/useModalStore";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import { styled } from "@mui/material/styles";

// Modal styling
const StyledBox = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxWidth: 900,
  maxHeight: "80vh",
  bgcolor: "#fff",
  boxShadow: "0 12px 36px rgba(0,0,0,0.3)",
  borderRadius: theme.shape.borderRadius,
  p: 3,
  outline: "none",
  display: "flex",
  flexDirection: "column",
}));

// Horizontal scroll container
const ScrollContainer = styled(Box)({
  display: "flex",
  gap: 16,
  overflowX: "auto",
  paddingBottom: 8,
  "&::-webkit-scrollbar": {
    height: 8,
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 4,
  },
  "&::-webkit-scrollbar-track": {
    backgroundColor: "transparent",
  },
});

// Each image box
const ImageWrapper = styled(Box)({
  position: "relative",
  flex: "0 0 auto", // prevents shrinking
  width: 250,
  height: 250,
  borderRadius: 12,
  overflow: "hidden",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  transition: "transform 0.3s",
  "&:hover": {
    transform: "scale(1.05)",
  },
});

const StyledImage = styled("img")({
  width: "100%",
  height: "100%",
  objectFit: "contain", // preserves aspect ratio
  display: "block",
});

const ActionsOverlay = styled(Box)({
  position: "absolute",
  top: 8,
  right: 8,
  display: "flex",
  gap: 8,
});

export default function ImageModal() {
  const { open, images, close } = useModalStore();

  return (
    <Modal open={open} onClose={close}>
      <StyledBox>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={600}>
            Project Images
          </Typography>
          <IconButton onClick={close}>
            <CloseIcon />
          </IconButton>
        </Box>

        {images.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No images available.
          </Typography>
        )}

        <ScrollContainer>
          {images.map((img, idx) => (
            <ImageWrapper key={idx}>
              <StyledImage src={img} alt={`project-${idx}`} />
              <ActionsOverlay>
                <IconButton
                  size="small"
                  color="primary"
                  href={img}
                  download={`project-image-${idx + 1}`}
                >
                  <DownloadIcon />
                </IconButton>
              </ActionsOverlay>
            </ImageWrapper>
          ))}
        </ScrollContainer>
      </StyledBox>
    </Modal>
  );
}
