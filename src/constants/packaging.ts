/** Allowed holding capacities (kg) for packaging and product rates. Single source for dropdowns and validation. */
export const HOLDING_CAPACITIES = [5, 10, 25, 26, 30, 50] as const;

export type HoldingCapacity = (typeof HOLDING_CAPACITIES)[number];
