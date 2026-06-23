import {
  formatPhoneDisplay,
  PHONE_FORMATTED_MAX_LENGTH,
  PHONE_PLACEHOLDER,
  sanitizePhoneInput,
} from '../../utils/phoneFormatting';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
}

export function PhoneInput({
  value,
  onChange,
  readOnly = false,
  disabled = false,
  className = '',
  placeholder = PHONE_PLACEHOLDER,
  id,
}: PhoneInputProps) {
  return (
    <input
      id={id}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      value={formatPhoneDisplay(value)}
      onChange={(e) => onChange(sanitizePhoneInput(e.target.value))}
      readOnly={readOnly}
      disabled={disabled}
      placeholder={placeholder}
      maxLength={PHONE_FORMATTED_MAX_LENGTH}
      className={className}
    />
  );
}
