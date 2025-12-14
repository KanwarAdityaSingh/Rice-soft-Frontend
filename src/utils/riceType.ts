// Helper function to get rice type label from API data
export const getRiceTypeLabel = (
  value: string | null | undefined,
  riceTypes: Array<{ value: string; label: string }>
): string => {
  if (!value) return '';
  const riceType = riceTypes.find((rt) => rt.value === value);
  return riceType ? riceType.label : value;
};

