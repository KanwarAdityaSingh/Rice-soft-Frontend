import { CheckCircle2, Circle, Clock } from 'lucide-react';

type PurchaseStatus = 'pending' | 'in_transit' | 'received' | 'completed';

interface PurchaseTimelineProps {
  status: PurchaseStatus;
}

const statusSteps: { status: PurchaseStatus; label: string }[] = [
  { status: 'pending', label: 'Pending' },
  { status: 'in_transit', label: 'In Transit' },
  { status: 'received', label: 'Received' },
  { status: 'completed', label: 'Completed' },
];

export function PurchaseTimeline({ status }: PurchaseTimelineProps) {
  const currentIndex = statusSteps.findIndex((s) => s.status === status);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Status Timeline</h3>
      <div className="relative">
        {/* Connection line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        {/* Steps */}
        <div className="space-y-6 relative">
          {statusSteps.map((step, index) => {
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={step.status} className="flex items-start gap-4">
                <div className="relative z-10">
                  {isCompleted ? (
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                  ) : isCurrent ? (
                    <div className="h-8 w-8 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <p
                    className={`text-sm font-medium ${
                      isCompleted ? 'text-foreground' : isCurrent ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-muted-foreground mt-1">Current status</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

