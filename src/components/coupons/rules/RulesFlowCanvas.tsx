import { useMemo, useCallback } from 'react';
import ReactFlow, { Background, Controls, Panel } from 'reactflow';
import type { Node, Edge, NodeMouseHandler } from 'reactflow';
import 'reactflow/dist/style.css';
import { RuleNode, type RuleNodeData } from './RuleNode';
import { FlowStartNode } from './FlowStartNode';
import { FlowPayoutNode } from './FlowPayoutNode';
import type { PromotionRule } from '../../../types/coupons';
import { formatConditionSummary } from '../../../utils/promotionRuleHelpers';

const nodeTypes = {
  rule: RuleNode,
  flowStart: FlowStartNode,
  flowPayout: FlowPayoutNode,
};

const NODE_GAP_X = 300;
const START_X = 40;
const NODE_Y = 120;

interface RulesFlowCanvasProps {
  rules: PromotionRule[];
  performance?: Map<string, number>;
  batchNames?: Map<string, string>;
  selectedId?: string | null;
  onSelectRule?: (id: string) => void;
}

export function RulesFlowCanvas({
  rules,
  performance,
  batchNames,
  selectedId,
  onSelectRule,
}: RulesFlowCanvasProps) {
  const sorted = useMemo(
    () => [...rules].sort((a, b) => a.priority - b.priority),
    [rules]
  );

  const activeCount = sorted.filter((r) => r.is_active).length;

  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node[] = [
      {
        id: '__start__',
        type: 'flowStart',
        position: { x: START_X, y: NODE_Y },
        data: {},
        draggable: false,
        selectable: false,
      },
    ];

    const flowEdges: Edge[] = [];

    sorted.forEach((rule, i) => {
      const x = START_X + NODE_GAP_X + i * NODE_GAP_X;
      flowNodes.push({
        id: rule.promotion_rule_id,
        type: 'rule',
        position: { x, y: NODE_Y },
        data: {
          ruleId: rule.promotion_rule_id,
          name: rule.name,
          ruleType: rule.rule_type,
          priority: rule.priority,
          isActive: rule.is_active,
          conditionSummary: formatConditionSummary(rule, batchNames),
          reward: rule.reward,
          applicationCount: performance?.get(rule.promotion_rule_id),
          onSelect: onSelectRule,
        } satisfies RuleNodeData,
        selected: selectedId === rule.promotion_rule_id,
        draggable: false,
      });

      const sourceId = i === 0 ? '__start__' : sorted[i - 1].promotion_rule_id;
      flowEdges.push({
        id: `e-${sourceId}-${rule.promotion_rule_id}`,
        source: sourceId,
        target: rule.promotion_rule_id,
        animated: rule.is_active,
        style: {
          stroke: rule.is_active ? '#7c3aed' : '#cbd5e1',
          strokeWidth: rule.is_active ? 2.5 : 1.5,
        },
        type: 'smoothstep',
      });
    });

    const payoutX = START_X + NODE_GAP_X + sorted.length * NODE_GAP_X;
    flowNodes.push({
      id: '__payout__',
      type: 'flowPayout',
      position: { x: payoutX, y: NODE_Y },
      data: { totalRules: sorted.length, activeRules: activeCount },
      draggable: false,
      selectable: false,
    });

    const lastSource =
      sorted.length > 0
        ? sorted[sorted.length - 1].promotion_rule_id
        : '__start__';
    flowEdges.push({
      id: `e-${lastSource}-payout`,
      source: lastSource,
      target: '__payout__',
      animated: activeCount > 0,
      style: { stroke: '#7c3aed', strokeWidth: 2.5 },
      type: 'smoothstep',
      label: activeCount > 0 ? 'stack & sum' : undefined,
      labelStyle: { fill: '#7c3aed', fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: '#faf5ff', fillOpacity: 0.9 },
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [sorted, performance, batchNames, selectedId, onSelectRule, activeCount]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      if (node.type === 'rule') onSelectRule?.(node.id);
    },
    [onSelectRule]
  );

  if (rules.length === 0) {
    return (
      <div className="coupon-rules-flow-empty flex flex-col items-center justify-center gap-3">
        <div className="h-16 w-16 rounded-2xl coupon-gradient-bg flex items-center justify-center opacity-80">
          <span className="text-2xl">✨</span>
        </div>
        <p className="font-semibold text-violet-700">No rules in pipeline yet</p>
        <p className="text-sm text-violet-400 max-w-xs text-center">
          Create your first promotion rule — they evaluate left-to-right and bonuses sum at payout.
        </p>
      </div>
    );
  }

  return (
    <div className="coupon-rules-flow-panel">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1.1 }}
        minZoom={0.4}
        maxZoom={1.2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e9d5ff" gap={24} size={1} />
        <Controls
          showInteractive={false}
          className="!bg-white/90 !border-violet-200 !shadow-lg !rounded-xl overflow-hidden"
        />
        <Panel position="top-left" className="!m-3">
          <div className="bg-white/90 backdrop-blur border border-violet-200 rounded-xl px-3 py-2 text-xs text-violet-600 shadow-sm">
            <span className="font-bold text-violet-800">{sorted.length}</span> rules ·{' '}
            <span className="font-bold text-emerald-600">{activeCount}</span> active ·
            lower priority number = evaluated first
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
