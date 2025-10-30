import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Circle, Clock, TrendingUp } from 'lucide-react';
import type { Lead, LeadEvent } from '../../../types/entities';
import { format } from 'date-fns';

interface LeadProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  events: LeadEvent[];
}

const statusSteps = [
  { key: 'new', label: 'New Lead', icon: Circle },
  { key: 'contacted', label: 'Contacted', icon: Clock },
  { key: 'engaged', label: 'Engaged', icon: TrendingUp },
  { key: 'converted', label: 'Converted', icon: CheckCircle2 },
];

export function LeadProgressModal({ open, onOpenChange, lead, events }: LeadProgressModalProps) {
  const currentStatusIndex = statusSteps.findIndex(step => step.key === lead.lead_status);
  const completedSteps = statusSteps.slice(0, currentStatusIndex + 1);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-4xl translate-x-[-50%] translate-y-[-50%]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex-1 min-w-0 pr-2">
                <Dialog.Title className="text-lg sm:text-xl md:text-2xl font-bold text-gradient truncate">
                  Progress Pipeline
                </Dialog.Title>
                <p className="text-sm sm:text-base text-muted-foreground mt-0.5 sm:mt-1 truncate">{lead.company_name}</p>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-1 hover:bg-muted/50 transition-colors flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Pipeline Visualization */}
            <div className="mb-8">
              <div className="flex items-center justify-between relative">
                {/* Progress Line */}
                <div className="absolute top-6 left-0 right-0 h-0.5 bg-border -z-10" />
                <AnimatePresence>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedSteps.length / statusSteps.length) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="absolute top-6 left-0 h-0.5 bg-gradient-primary -z-10"
                  />
                </AnimatePresence>

                {statusSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;

                  return (
                    <motion.div
                      key={step.key}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex flex-col items-center flex-1"
                    >
                      <motion.div
                        initial={false}
                        animate={{ scale: isCurrent ? 1.1 : 1 }}
                        className={`
                          w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                          ${isCompleted 
                            ? 'bg-gradient-primary text-white shadow-lg' 
                            : 'bg-muted text-muted-foreground'
                          }
                          ${isCurrent ? 'ring-4 ring-primary/20' : ''}
                        `}
                      >
                        <Icon className="h-6 w-6" />
                      </motion.div>
                      <p className="mt-3 text-sm font-medium text-center">
                        {step.label}
                      </p>
                      {isCurrent && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-primary mt-1 font-medium"
                        >
                          Current Stage
                        </motion.p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="glass rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Estimated Value</p>
                <p className="text-2xl font-bold">
                  ₹{lead.estimated_value?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="glass rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Total Events</p>
                <p className="text-2xl font-bold">{events.length}</p>
              </div>
              <div className="glass rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Days in Pipeline</p>
                <p className="text-2xl font-bold">
                  {Math.floor((new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                </p>
              </div>
            </div>

            {/* Recent Events */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {events.slice(0, 5).map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass rounded-lg p-4 border border-border/50 flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Circle className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{event.event_type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(event.created_at), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                  </motion.div>
                ))}
                {events.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No events yet</p>
                )}
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
