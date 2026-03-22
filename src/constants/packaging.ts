/** Allowed holding capacities (kg) for packaging and product rates. Includes small pouches (vacuum / retail). */
export const HOLDING_CAPACITIES = [0.5, 1, 2, 5, 10, 25, 26, 30, 50] as const;

export type HoldingCapacity = (typeof HOLDING_CAPACITIES)[number];

/** Empty bag receipt GST is fixed (matches standard rate used in costing). */
export const EMPTY_BAG_GST_PERCENT = 18;
