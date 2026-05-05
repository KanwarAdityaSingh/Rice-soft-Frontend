import {
  QUALITY_PARAMETER_KEYS,
  QUALITY_PARAMETER_SPECS,
  type QualityParameterDraft,
  type QualityParameterFieldKey,
} from '../../utils/qualityParameters';

interface QualityParametersFieldsProps {
  draft: QualityParameterDraft;
  onChange: (key: QualityParameterFieldKey, value: string) => void;
  disabled?: boolean;
  /** Smaller inputs for dense layouts (e.g. batch cards) */
  compact?: boolean;
}

export function QualityParametersFields({
  draft,
  onChange,
  disabled,
  compact,
}: QualityParametersFieldsProps) {
  const inputClass = compact
    ? 'w-full px-2 py-1 text-xs border rounded-md bg-background border-border focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50'
    : 'w-full px-2 py-1.5 text-sm border rounded-md bg-background border-border focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50';
  const labelClass = compact ? 'block text-[10px] font-medium text-muted-foreground mb-0.5' : 'block text-xs font-medium text-muted-foreground mb-1';

  return (
    <div className={compact ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
      {QUALITY_PARAMETER_KEYS.map((key) => {
        const spec = QUALITY_PARAMETER_SPECS[key];
        return (
          <div key={key}>
            <label htmlFor={`qp-${key}`} className={labelClass}>
              {spec.label}
              {spec.unit ? (
                <span className="text-muted-foreground font-normal"> ({spec.unit})</span>
              ) : null}
            </label>
            <input
              id={`qp-${key}`}
              type="text"
              value={draft[key]}
              onChange={(e) => onChange(key, e.target.value)}
              disabled={disabled}
              className={inputClass}
              placeholder={spec.placeholder}
              autoComplete="off"
            />
          </div>
        );
      })}
    </div>
  );
}
