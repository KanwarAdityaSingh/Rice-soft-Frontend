import type { BagType, PacketType } from '../types/entities';

/** Same allowed values as backend `BAG_TYPE_VALUES` / Joi validators / DB check. */
export const BAG_TYPE_VALUES = [
  'jute',
  'pp',
  'bopp_laminated',
  'non_woven',
  'vacuum_pouch',
] as const satisfies readonly BagType[];

/** Labels and hints for the five types (kaanta `bag_type` + packaging `packet_type`). */
export const KAANTA_BAG_TYPE_OPTIONS: ReadonlyArray<{
  value: BagType;
  label: string;
  description: string;
  typicalCapacity?: string;
}> = [
  {
    value: 'pp',
    label: 'PP Woven Bags',
    description:
      'Industry standard for bulk storage: woven polypropylene, durable and water-resistant.',
    typicalCapacity: 'Typically 10–50 kg',
  },
  {
    value: 'jute',
    label: 'Jute Bags / Sacks',
    description: 'Eco-friendly sacks, often used for premium rice and natural branding.',
  },
  {
    value: 'bopp_laminated',
    label: 'BOPP Laminated Bags',
    description:
      'Woven PP laminated with BOPP film for high-quality glossy or matte graphics and retail appeal.',
  },
  {
    value: 'non_woven',
    label: 'Non-Woven Rice Bags',
    description: 'Breathable, often with custom printing and handles; common in retail.',
    typicalCapacity: 'Often 5–10 kg',
  },
  {
    value: 'vacuum_pouch',
    label: 'Vacuum-Sealed / Pouch Bags',
    description:
      'PA/PE-style pouches for premium or organic rice; barrier to moisture, pests, and air.',
    typicalCapacity: 'Often 500 g–5 kg',
  },
];

export function formatKaantaBagTypeLabel(value: string): string {
  const found = KAANTA_BAG_TYPE_OPTIONS.find((o) => o.value === value);
  if (found) return found.label;
  // Old frontend-only code (never persisted if API rejected); show readable fallback
  if (value === 'pp_woven') return 'PP Woven Bags';
  return value;
}

/** Packaging form: same five options as kaanta (`PacketType` === `BagType`). */
export const PACKAGING_PACKET_TYPE_OPTIONS = KAANTA_BAG_TYPE_OPTIONS as ReadonlyArray<{
  value: PacketType;
  label: string;
  description: string;
  typicalCapacity?: string;
}>;

/** Map old human-readable DB/API strings to the five codes (for display after migration). */
const LEGACY_PACKET_TYPE_TO_CODE: Record<string, BagType> = {
  'PP Bag': 'pp',
  'PP Woven Bag': 'pp',
  'HDPE Bag': 'pp',
  'Jute Bag': 'jute',
  'BOPP Laminated Bag': 'bopp_laminated',
  'Non-Woven Rice Bag': 'non_woven',
  'Vacuum-Sealed Pouch Bag': 'vacuum_pouch',
};

/** User-facing label for packaging `packet_type` (handles legacy title-case strings). */
export function formatPacketTypeLabel(value: string): string {
  const code = LEGACY_PACKET_TYPE_TO_CODE[value] ?? value;
  return formatKaantaBagTypeLabel(code);
}
