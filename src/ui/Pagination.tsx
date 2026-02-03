import { memo, useCallback } from "react";
import {
  Pagination as MuiPagination,
  type PaginationProps as MuiPaginationProps,
  Stack,
  type StackProps,
} from "@mui/material";

interface PaginationProps
  extends Omit<MuiPaginationProps, "page" | "count" | "onChange"> {
  page: number;
  count: number;
  onChange: (page: number) => void;
  stackProps?: StackProps;
}

const Pagination = ({
  page,
  count,
  onChange,
  stackProps,
  ...paginationProps
}: PaginationProps) => {
  const handleChange = useCallback(
    (_: React.ChangeEvent<unknown>, value: number) => {
      onChange(value);
    },
    [onChange]
  );

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      width="100%"
      {...stackProps}
    >
      <MuiPagination
        page={page}
        count={count}
        onChange={handleChange}
        shape="rounded"
        size="large"
        aria-label="Pagination navigation"
        sx={{
          // Center items properly
          "& .MuiPagination-ul": {
            alignItems: "center",
            flexWrap: "nowrap",
            flexShrink: "1"
          },

          // Normalize button size
          "& .MuiPaginationItem-root": {
            minWidth: 30,
            height: 30,
            fontSize: "0.875rem",
            lineHeight: 1,
          },

          // Fix arrow button alignment
          "& .MuiPaginationItem-previousNext, & .MuiPaginationItem-firstLast": {
            padding: 0,
          },

          // Better icon centering
          "& .MuiSvgIcon-root": {
            fontSize: 22,
          },
        }}
        {...paginationProps}
      />
    </Stack>
  );
};

export default memo(Pagination);
