import type { Node, Edge } from 'reactflow';
import type { HierarchicalInventory } from './entities';

export type NodeType = 'brand' | 'product' | 'packaging' | 'finishedGoods' | 'vendor' | 'capacity' | 'riceType' | 'packetType';

export type GroupingStrategy = 
  | 'default' 
  | 'by_capacity' 
  | 'by_vendor' 
  | 'by_rice_type' 
  | 'by_vendor_top' 
  | 'by_capacity_top' 
  | 'by_packet_type_top';

export interface BrandNodeData {
  type: 'brand';
  brand: string;
  hierarchicalData: HierarchicalInventory;
  expanded?: boolean;
}

export interface ProductNodeData {
  type: 'product';
  productId: string;
  productName: string;
  riceType: string | null;
  brand: string;
  hierarchicalData: HierarchicalInventory['products'][0];
  expanded?: boolean;
}

export interface PackagingNodeData {
  type: 'packaging';
  packagingId: string;
  holdingCapacity: number;
  packetType: string;
  vendor: { id: string; name: string } | null;
  productId: string;
  productName: string;
  brand: string;
  hierarchicalData: HierarchicalInventory['products'][0]['packaging'][0];
  expanded?: boolean;
}

export interface FinishedGoodsNodeData {
  type: 'finishedGoods';
  batchId: string;
  batchNumber: string;
  quantity: number;
  packets: number;
  weight: number;
  packagingId: string;
  productId: string;
  productName: string;
  brand: string;
  hierarchicalData: HierarchicalInventory['products'][0]['packaging'][0]['finished_goods'][0];
}

export interface VendorNodeData {
  type: 'vendor';
  vendor: { id: string; name: string } | null;
  hierarchicalData: any; // Will be set based on grouping strategy
}

export interface CapacityNodeData {
  type: 'capacity';
  capacity: number;
  hierarchicalData: any; // Will be set based on grouping strategy
}

export interface RiceTypeNodeData {
  type: 'riceType';
  riceType: string;
  hierarchicalData: any; // Will be set based on grouping strategy
}

export interface PacketTypeNodeData {
  type: 'packetType';
  packetType: string;
  hierarchicalData: any; // Will be set based on grouping strategy
}

export type FlowNodeData = 
  | BrandNodeData 
  | ProductNodeData 
  | PackagingNodeData 
  | FinishedGoodsNodeData
  | VendorNodeData
  | CapacityNodeData
  | RiceTypeNodeData
  | PacketTypeNodeData;

export interface FlowNode extends Node {
  data: FlowNodeData;
}

export interface FlowEdge extends Edge {
  animated?: boolean;
  style?: {
    stroke?: string;
    strokeWidth?: number;
  };
}

export interface SelectedNode {
  node: FlowNode;
  data: FlowNodeData;
}

