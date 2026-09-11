export const semanticChipSx = (color: string) => ({
  color,
  borderColor: color,
  // color-mix, not a hex alpha suffix (old: `${color}22`) - that only
  // ever worked because `color` was always a literal 6-digit hex string;
  // now that getSemanticColor (see utils/colors.ts) returns CSS variable
  // references instead of hardcoded hex, `var(--red-600)22` would be
  // invalid CSS. 13% mix approximates the old hex suffix's alpha (0x22 /
  // 0xff ≈ 13.3%).
  backgroundColor: `color-mix(in srgb, ${color} 13%, transparent)`,
  fontWeight: 600,
  borderRadius: "8px",
});
