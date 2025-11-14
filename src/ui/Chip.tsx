import {Chip as MuiChip, type ChipProps} from '@mui/material';

export default function Chip({...props}: ChipProps) {
  return (
      <MuiChip {...props} label="Chip Outlined" variant="outlined" />
  );
}
