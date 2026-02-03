import { Skeleton as MuiSkeleton, Box, Stack } from "@mui/material";

type SkeletonVariant = "image" | "pdf" | "file" | "text";

type Props = {
  variant?: SkeletonVariant;
  height?: number;
};

export default function Skeleton({
  variant = "image",
  height = 350,
}: Props) {
  switch (variant) {
    case "image":
      return (
        <MuiSkeleton
          variant="rectangular"
          width="100%"
          height={height}
          sx={{ bgcolor: "var(--blue-300)" }}
        />
      );

    case "pdf":
      return (
        <Box>
          <MuiSkeleton
            variant="rectangular"
            width="100%"
            height={height}
            sx={{ bgcolor: "var(--blue-300)", mb: 1 }}
          />
          <MuiSkeleton width="60%" />
          <MuiSkeleton width="40%" />
        </Box>
      );

    case "file":
      return (
        <Box
          sx={{
            height,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          <MuiSkeleton variant="circular" width={80} height={80} />
          <MuiSkeleton width="50%" />
        </Box>
      );

    case "text":
      return (
        <Stack spacing={1}>
          <MuiSkeleton width="70%" />
          <MuiSkeleton width="90%" />
          <MuiSkeleton width="80%" />
        </Stack>
      );

    default:
      return null;
  }
}
