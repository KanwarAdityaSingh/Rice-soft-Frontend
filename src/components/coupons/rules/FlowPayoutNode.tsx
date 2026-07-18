import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Wallet } from 'lucide-react';

interface FlowPayoutNodeProps {
  data: { totalRules?: number; activeRules?: number };
}

export const FlowPayoutNode = memo(({ data }: FlowPayoutNodeProps) => (
  <div
    className="rounded-2xl shadow-md px-5 py-4 min-w-[160px]"
    style={{
      background: 'linear-gradient(135deg, #faf5ff, #fff7ed)',
      border: '2px solid rgba(124, 58, 237, 0.35)',
    }}
  >
    <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-violet-500" />
    <div className="flex items-center gap-2">
      <div className="p-2 rounded-lg coupon-gradient-bg text-white">
        <Wallet className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-violet-500">
          Payout
        </p>
        <p className="font-bold text-sm text-violet-950">Base + bonuses</p>
        {data.activeRules != null && (
          <p className="text-[10px] text-violet-400 mt-0.5">
            {data.activeRules} active rule{data.activeRules !== 1 ? 's' : ''} stack
          </p>
        )}
      </div>
    </div>
  </div>
));

FlowPayoutNode.displayName = 'FlowPayoutNode';
