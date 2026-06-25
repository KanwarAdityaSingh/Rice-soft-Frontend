import {
  BANK_ACCOUNT_MAX_LENGTH,
  BANK_ACCOUNT_PLACEHOLDER,
  formatBankAccountDisplay,
  sanitizeBankAccountInput,
} from '../../utils/bankAccountFormatting';

interface BankAccountInputProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
}

export function BankAccountInput({
  value,
  onChange,
  readOnly = false,
  disabled = false,
  className = '',
  placeholder = BANK_ACCOUNT_PLACEHOLDER,
  id,
}: BankAccountInputProps) {
  const formattedMaxLength = BANK_ACCOUNT_MAX_LENGTH + Math.floor((BANK_ACCOUNT_MAX_LENGTH - 1) / 4);

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={formatBankAccountDisplay(value)}
      onChange={(e) => onChange(sanitizeBankAccountInput(e.target.value))}
      readOnly={readOnly}
      disabled={disabled}
      placeholder={placeholder}
      maxLength={formattedMaxLength}
      className={className}
    />
  );
}
