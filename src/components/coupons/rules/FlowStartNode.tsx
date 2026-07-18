import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Play } from 'lucide-react';

export const FlowStartNode = memo(() => (
  <div
    className="rounded-2xl shadow-md px-5 py-4 min-w-[140px]"
    style={{
      background: 'linear-gradient(135deg, #ecfdf5, #fff)',
      border: '2px solid rgba(16, 185, 129, 0.35)',
    }}
  >
    <div className="flex items-center gap-2">
      <div className="p-2 rounded-lg bg-emerald-500 text-white">
        <Play className="h-4 w-4 fill-white" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
          Redeem
        </p>
        <p className="font-bold text-sm text-emerald-900">Customer redeems</p>
      </div>
    </div>
    <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-emerald-500" />
  </div>
));

FlowStartNode.displayName = 'FlowStartNode';
