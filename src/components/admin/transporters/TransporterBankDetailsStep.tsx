import type { Dispatch, SetStateAction } from 'react';
import { Search, Shield } from 'lucide-react';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { CreateTransporterRequest, EntityKycVerificationDetails } from '../../../types/entities';
import { formatTransporterVerifiedAt } from '../../../utils/transporterVerification';
import { TRANSPORTER_LOCKED_INPUT_CLASS } from '../../../utils/transporterAutofillLocks';
import { canVerifyBankAccountLookup } from '../../../utils/bankVerification';

interface TransporterBankDetailsStepProps {
  formData: CreateTransporterRequest;
  setFormData: Dispatch<SetStateAction<CreateTransporterRequest>>;
  errors: Record<string, string>;
  setErrors: Dispatch<SetStateAction<Record<string, string>>>;
  kycVerificationDetails: EntityKycVerificationDetails;
  bankDetailsVerifiedAt?: string | null;
  bankVerificationError?: string | null;
  isEditMode?: boolean;
  isFieldLocked: (key: string) => boolean;
  lockedClass: (key: string) => string;
  ifscLoading: boolean;
  onBankVerifySearch: () => void | Promise<void>;
  onBankCredentialChange: () => void;
}

export function TransporterBankDetailsStep({
  formData,
  setFormData,
  errors,
  setErrors,
  kycVerificationDetails,
  bankDetailsVerifiedAt,
  bankVerificationError,
  isEditMode = false,
  isFieldLocked,
  lockedClass,
  ifscLoading,
  onBankVerifySearch,
  onBankCredentialChange,
}: TransporterBankDetailsStepProps) {
  const bd = formData.bank_details ?? {};
  const bankVerifiedAt = bankDetailsVerifiedAt;
  const canVerify = canVerifyBankAccountLookup(bd.account_number, bd.ifsc_code);

  const updateBank = (patch: Partial<NonNullable<CreateTransporterRequest['bank_details']>>) => {
    setFormData((prev) => ({
      ...prev,
      bank_details: { ...prev.bank_details, ...patch },
    }));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Optional. Bank verification runs automatically when you save.
      </p>

      {bankVerifiedAt && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400"
          title={`Verified ${formatTransporterVerifiedAt(bankVerifiedAt)}`}
        >
          <Shield className="h-3.5 w-3.5" />
          Verified
        </span>
      )}

      {!bankVerifiedAt && bankVerificationError?.trim() && (
        <p className="text-xs text-amber-700 dark:text-amber-300 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
          {bankVerificationError.trim()}
          {isEditMode && (
            <span className="block mt-1.5 text-amber-800/90 dark:text-amber-200/90">
              Update bank details below, then use the verify button on IFSC to re-check before saving.
            </span>
          )}
        </p>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Account holder name</label>
        <input
          type="text"
          value={bd.account_holder_name ?? ''}
          onChange={(e) => {
            if (isFieldLocked('bank_details.account_holder_name')) return;
            onBankCredentialChange();
            updateBank({ account_holder_name: e.target.value });
            if (errors.bank_account_holder_name) {
              setErrors((prev) => {
                const { bank_account_holder_name: _drop, ...rest } = prev;
                return rest;
              });
            }
          }}
          disabled={isFieldLocked('bank_details.account_holder_name')}
          readOnly={isFieldLocked('bank_details.account_holder_name')}
          className={`w-full px-3 py-2 border rounded-lg bg-background border-border ${
            errors.bank_account_holder_name ? 'border-red-500' : 'border-border'
          } ${lockedClass('bank_details.account_holder_name') || (isFieldLocked('bank_details.account_holder_name') ? TRANSPORTER_LOCKED_INPUT_CLASS : '')}`}
          placeholder="Name as per bank records"
        />
        {errors.bank_account_holder_name && (
          <p className="text-xs text-red-500 mt-1">{errors.bank_account_holder_name}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Account number</label>
        <input
          type="text"
          inputMode="numeric"
          value={bd.account_number ?? ''}
          onChange={(e) => {
            if (isFieldLocked('bank_details.account_number')) return;
            onBankCredentialChange();
            updateBank({ account_number: e.target.value.replace(/\D/g, '') });
            if (errors.bank_account_number) {
              setErrors((prev) => {
                const { bank_account_number: _drop, ...rest } = prev;
                return rest;
              });
            }
          }}
          disabled={isFieldLocked('bank_details.account_number')}
          readOnly={isFieldLocked('bank_details.account_number')}
          className={`w-full px-3 py-2 border rounded-lg bg-background ${
            errors.bank_account_number ? 'border-red-500' : 'border-border'
          } ${lockedClass('bank_details.account_number') || (isFieldLocked('bank_details.account_number') ? TRANSPORTER_LOCKED_INPUT_CLASS : '')}`}
          placeholder="Enter account number"
        />
        {errors.bank_account_number && (
          <p className="text-xs text-red-500 mt-1">{errors.bank_account_number}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">IFSC code</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={bd.ifsc_code ?? ''}
            onChange={(e) => {
              if (isFieldLocked('bank_details.ifsc_code')) return;
              onBankCredentialChange();
              const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
              updateBank({ ifsc_code: value });
              if (errors.bank_ifsc_code) {
                setErrors((prev) => {
                  const { bank_ifsc_code: _drop, ...rest } = prev;
                  return rest;
                });
              }
            }}
            disabled={isFieldLocked('bank_details.ifsc_code')}
            readOnly={isFieldLocked('bank_details.ifsc_code')}
            className={`flex-1 px-3 py-2 border rounded-lg bg-background font-mono uppercase ${
              errors.bank_ifsc_code ? 'border-red-500' : 'border-border'
            } ${lockedClass('bank_details.ifsc_code') || (isFieldLocked('bank_details.ifsc_code') ? TRANSPORTER_LOCKED_INPUT_CLASS : '')}`}
            placeholder="HDFC0001234"
            maxLength={11}
          />
          <button
            type="button"
            onClick={() => void onBankVerifySearch()}
            disabled={
              ifscLoading ||
              isFieldLocked('bank_details.ifsc_code') ||
              !canVerify
            }
            className="px-3 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 flex items-center gap-2 shrink-0"
            title="Verify bank account via Surepass"
          >
            {ifscLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
          </button>
        </div>
        {errors.bank_ifsc_code && <p className="text-xs text-red-500 mt-1">{errors.bank_ifsc_code}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Bank name</label>
        <input
          type="text"
          value={bd.bank_name ?? ''}
          onChange={(e) => {
            if (isFieldLocked('bank_details.bank_name')) return;
            updateBank({ bank_name: e.target.value });
          }}
          disabled={isFieldLocked('bank_details.bank_name')}
          readOnly={isFieldLocked('bank_details.bank_name')}
          className={`w-full px-3 py-2 border rounded-lg bg-background border-border ${
            lockedClass('bank_details.bank_name') || (isFieldLocked('bank_details.bank_name') ? TRANSPORTER_LOCKED_INPUT_CLASS : '')
          }`}
          placeholder="Auto-filled from bank verify"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Branch</label>
        <input
          type="text"
          value={bd.branch ?? ''}
          onChange={(e) => {
            if (isFieldLocked('bank_details.branch')) return;
            updateBank({ branch: e.target.value });
          }}
          disabled={isFieldLocked('bank_details.branch')}
          readOnly={isFieldLocked('bank_details.branch')}
          className={`w-full px-3 py-2 border rounded-lg bg-background border-border ${
            lockedClass('bank_details.branch') || (isFieldLocked('bank_details.branch') ? TRANSPORTER_LOCKED_INPUT_CLASS : '')
          }`}
          placeholder="Auto-filled from bank verify"
        />
      </div>
    </div>
  );
}
