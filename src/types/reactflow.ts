import type { ComponentProps } from 'react';
import ReactFlow from 'reactflow';

// Infer ReactFlowInstance type from ReactFlow's onInit prop
export type ReactFlowInstance = NonNullable<ComponentProps<typeof ReactFlow>['onInit']> extends (instance: infer T) => void
  ? T
  : never;

