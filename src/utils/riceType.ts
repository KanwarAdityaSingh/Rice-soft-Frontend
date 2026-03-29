// Helper function to get rice type label from API data
export const getRiceTypeLabel = (
  value: string | null | undefined,
  riceTypes: Array<{ value: string; label: string }>
): string => {
  if (!value) return '';
  const riceType = riceTypes.find((rt) => rt.value === value);
  return riceType ? riceType.label : value;
};

/** Same shape as rice types — from GET /riceCodes/getRiceLengths */
export const getRiceLengthLabel = (
  value: string | null | undefined,
  riceLengths: Array<{ value: string; label: string }>
): string => {
  if (!value) return '';
  const row = riceLengths.find((r) => r.value === value);
  return row ? row.label : value;
};

