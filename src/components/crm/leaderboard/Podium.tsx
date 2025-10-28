import { motion } from 'framer-motion';
import type { LeaderboardEntry } from '../../../types/entities';

export function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const topThree = entries.slice(0, 3);
  if (topThree.length === 0) return null;

  // true podium order: left = silver (#2), center = gold (#1), right = bronze (#3)
  const slots: Array<{ entry: LeaderboardEntry | undefined; rank: 1 | 2 | 3; height: number; gradient: string }>
    = [
      { entry: topThree[1], rank: 2, height: 72, gradient: 'from-zinc-200 to-zinc-400' },
      { entry: topThree[0], rank: 1, height: 96, gradient: 'from-amber-300 to-amber-500' },
      { entry: topThree[2], rank: 3, height: 60, gradient: 'from-orange-300 to-amber-600' },
    ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {slots.map((slot, idx) => (
        <motion.div
          key={slot.entry?.salesperson_id || `podium-${idx}`}
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18, delay: idx * 0.05 }}
          className={`relative overflow-hidden rounded-2xl border border-border/70 p-4 text-center ${slot.rank === 1 ? 'bg-gradient-to-br from-primary/10 to-accent/10' : ''}`}
          style={{ minHeight: 180 }}
        >
          {/* Pedestal */}
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${slot.gradient}`}
            style={{ height: slot.height }}
          />

          {/* Content */}
          {slot.entry ? (
            <div className="relative z-10 flex h-full flex-col items-center justify-start gap-1">
              <div className="mb-1 text-2xl">
                {getRankIcon(slot.rank)}
              </div>
              <div className="font-semibold truncate" title={slot.entry.salesperson_name}>{slot.entry.salesperson_name}</div>
              <div className="text-xs text-muted-foreground truncate" title={slot.entry.salesperson_email}>{slot.entry.salesperson_email}</div>
              <div className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Score</div>
              {(() => {
                const score = Number(slot.entry?.performance_score ?? 0);
                return (
                  <>
                    <div className={`mx-auto mt-1 h-2 w-24 rounded-full ${scoreBarClass(score)}`} />
                    <div className="text-sm font-semibold mt-1">{score.toFixed(1)}</div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="relative z-10 text-sm text-muted-foreground">--</div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return rank;
  }
}

function scoreBarClass(score: number) {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}


