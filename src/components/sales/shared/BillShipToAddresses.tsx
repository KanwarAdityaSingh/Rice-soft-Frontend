import type { VendorAddress } from '../../../types/entities';
import {
  formatVendorAddress,
  isShipToSameAsBillTo,
} from '../../../utils/saudaDisplay';

interface BillShipToAddressesProps {
  billingAddress?: VendorAddress | null;
  deliveryAddress?: VendorAddress | null;
  /** Optional fallback when billing_address is missing (e.g. dispatch.party_address) */
  billingFallbackText?: string | null;
  className?: string;
}

/**
 * Bill to / Ship to from sales sauda addresses.
 * Same (or no delivery) → Bill to only; different → Bill to + Ship to / Deliver to.
 */
export function BillShipToAddresses({
  billingAddress,
  deliveryAddress,
  billingFallbackText,
  className = '',
}: BillShipToAddressesProps) {
  const billText = formatVendorAddress(billingAddress) || billingFallbackText?.trim() || '';
  const shipText = formatVendorAddress(deliveryAddress);
  const same = isShipToSameAsBillTo(billingAddress, deliveryAddress);

  if (!billText && !shipText) return null;

  return (
    <div className={`space-y-2 text-sm ${className}`}>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Bill to</p>
        <p className="mt-0.5 break-words font-medium leading-snug text-foreground">
          {billText || '–'}
        </p>
      </div>
      {!same && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Ship to / Deliver to</p>
          <p className="mt-0.5 break-words font-medium leading-snug text-foreground">
            {shipText || '–'}
          </p>
        </div>
      )}
    </div>
  );
}
