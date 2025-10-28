import { format } from 'date-fns';
import { LeadEventIcon } from '../../admin/shared/LeadEventIcon';
import type { LeadEvent } from '../../../types/entities';

interface LeadEventsTimelineProps {
  events: LeadEvent[];
}

export function LeadEventsTimeline({ events }: LeadEventsTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No events yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              index === 0 ? 'bg-primary text-white' : 'bg-muted'
            }`}>
              <LeadEventIcon eventType={event.event_type} size={16} />
            </div>
            {index < events.length - 1 && (
              <div className="w-0.5 h-full min-h-[60px] bg-border mt-2" />
            )}
          </div>

          {/* Event content */}
          <div className="flex-1 glass rounded-lg p-4 border border-border/50 mb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium capitalize mb-1">
                  {event.event_type.replace(/_/g, ' ')}
                </div>
                {event.event_description && (
                <p className="text-sm text-muted-foreground mb-2">
                  {event.event_description}
                </p>
                )}
                <div className="text-xs text-muted-foreground">
                  {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

