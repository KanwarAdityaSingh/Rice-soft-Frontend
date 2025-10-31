import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
  clearLabel?: string;
  openUpward?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  allowClear = false,
  clearLabel = 'None',
  openUpward = false
}: CustomSelectProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [shouldOpenUp, setShouldOpenUp] = useState(openUpward);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only use auto-detection on mobile devices and when openUpward is not explicitly set
    const isMobile = window.innerWidth < 768;
    
    if (!openUpward && triggerRef.current && isOpen && isMobile) {
      const checkPosition = () => {
        if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const spaceBelow = viewportHeight - rect.bottom;
          const spaceAbove = rect.top;
          // Only open upward if there's significantly less space below (less than 150px)
          // and more space above (at least 200px more above than below)
          setShouldOpenUp(spaceBelow < 150 && spaceAbove > spaceBelow + 200);
        }
      };
      checkPosition();
      // Recheck on scroll/resize
      window.addEventListener('scroll', checkPosition, true);
      window.addEventListener('resize', checkPosition);
      return () => {
        window.removeEventListener('scroll', checkPosition, true);
        window.removeEventListener('resize', checkPosition);
      };
    } else if (openUpward) {
      setShouldOpenUp(true);
    } else {
      // Default to opening downward
      setShouldOpenUp(false);
    }
  }, [openUpward, isOpen]);

  const handleValueChange = (newValue: string) => {
    onChange(newValue === '__clear__' ? null : newValue);
  };

  const displayOptions = allowClear ? [
    { value: '__clear__', label: clearLabel },
    ...options
  ] : options;

  return (
    <Select.Root 
      value={value || undefined} 
      onValueChange={handleValueChange} 
      disabled={disabled}
      onOpenChange={setIsOpen}
    >
      <Select.Trigger
        ref={triggerRef}
        className={`w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary flex items-center justify-between gap-2 ${className} touch-manipulation min-h-[44px] md:min-h-auto`}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className="glass min-w-[var(--radix-select-trigger-width)] max-h-[min(300px,50vh)] rounded-xl p-1 shadow-lg z-[9999] overflow-hidden"
          position="popper"
          sideOffset={4}
          side={shouldOpenUp ? 'top' : 'bottom'}
          align="start"
          avoidCollisions={true}
          collisionPadding={8}
          sticky="always"
        >
          <Select.Viewport className="p-1 max-h-[min(300px,50vh)] overflow-y-auto overscroll-contain">
            {displayOptions.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground relative pl-8 outline-none focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground touch-manipulation min-h-[44px] md:min-h-auto"
              >
                <Select.ItemIndicator className="absolute left-2">
                  <Check className="h-4 w-4" />
                </Select.ItemIndicator>
                <Select.ItemText className="truncate">{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
