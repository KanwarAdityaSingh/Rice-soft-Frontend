import { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import type { Connection, Node } from 'reactflow';
import type { MouseEvent } from 'react';

type NodeMouseHandler = (event: MouseEvent, node: Node) => void;
import 'reactflow/dist/style.css';
import { useInventory } from '../../../hooks/useInventory';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { BrandNode } from './flow/BrandNode';
import { ProductNode } from './flow/ProductNode';
import { PackagingNode } from './flow/PackagingNode';
import { FinishedGoodsNode } from './flow/FinishedGoodsNode';
import { VendorNode } from './flow/VendorNode';
import { CapacityNode } from './flow/CapacityNode';
import { RiceTypeNode } from './flow/RiceTypeNode';
import { PacketTypeNode } from './flow/PacketTypeNode';
import { NodePreviewTooltip } from './flow/NodePreviewTooltip';
import type { FlowNode, FlowEdge, FlowNodeData, GroupingStrategy } from '../../../types/inventoryFlow';
import type { HierarchicalInventory } from '../../../types/entities';
import type { ReactFlowInstance } from '../../../types/reactflow';
import {
  applyInventoryFilters,
  transformByCapacity,
  transformByVendor,
  transformByRiceType,
  transformByVendorTopLevel,
  transformByCapacityTopLevel,
  transformByPacketTypeTopLevel,
  type ExtendedInventoryFilters,
} from '../../../utils/inventoryTransform';

const nodeTypes = {
  brand: BrandNode,
  product: ProductNode,
  packaging: PackagingNode,
  finishedGoods: FinishedGoodsNode,
  vendor: VendorNode,
  capacity: CapacityNode,
  riceType: RiceTypeNode,
  packetType: PacketTypeNode,
};

interface InventoryFlowProps {
  onNodeSelect: (nodeData: FlowNodeData | null) => void;
  selectedNodeId: string | null;
  searchQuery: string;
  groupingStrategy?: GroupingStrategy;
  filters?: ExtendedInventoryFilters;
  onFlowInstanceReady?: (instance: ReactFlowInstance | null) => void;
  onFocusMatchesRef?: (fn: () => void) => void;
  onResetToBrandsRef?: (fn: () => void) => void;
  onNavigateNextRef?: (fn: () => void) => void;
  onNavigatePreviousRef?: (fn: () => void) => void;
  onMatchingInfoChange?: (count: number, index: number) => void;
}

export function InventoryFlow({ 
  onNodeSelect, 
  selectedNodeId, 
  searchQuery, 
  groupingStrategy = 'default',
  filters = {},
  onFlowInstanceReady,
  onFocusMatchesRef,
  onResetToBrandsRef,
  onNavigateNextRef,
  onNavigatePreviousRef,
  onMatchingInfoChange,
}: InventoryFlowProps) {
  const { hierarchical, fetchHierarchicalInventory, loading } = useInventory();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{ data: FlowNodeData; x: number; y: number } | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [matchingNodeIds, setMatchingNodeIds] = useState<string[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9a120746-53eb-4d7d-8410-b748191d8e86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryFlow.tsx:47',message:'Fetching hierarchical inventory',data:{loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    fetchHierarchicalInventory();
  }, [fetchHierarchicalInventory]);

  const createHierarchicalLayout = useCallback(
    (data: HierarchicalInventory[], strategy: GroupingStrategy, appliedFilters: ExtendedInventoryFilters): { nodes: FlowNode[]; edges: FlowEdge[] } => {
      const nodes: FlowNode[] = [];
      const edges: FlowEdge[] = [];

      // Center-based layout - show only active node and its children
      const CENTER_X = 400; // Center of viewport
      const CENTER_Y = 300; // Center of viewport
      const HORIZONTAL_SPACING = 300; // px between columns
      const VERTICAL_SPACING = 150; // px between items in same column

      // Apply filters first
      const combinedFilters: ExtendedInventoryFilters = {
        ...appliedFilters,
        search_text: searchQuery || appliedFilters.search_text,
      };
      let filteredData = applyInventoryFilters(data, combinedFilters);

      if (filteredData.length === 0) {
        return { nodes, edges };
      }

      // Transform data based on strategy
      let transformedData: any = filteredData;
      if (strategy === 'by_capacity') {
        transformedData = transformByCapacity(filteredData);
      } else if (strategy === 'by_vendor') {
        transformedData = transformByVendor(filteredData);
      } else if (strategy === 'by_rice_type') {
        transformedData = transformByRiceType(filteredData);
      } else if (strategy === 'by_vendor_top') {
        transformedData = transformByVendorTopLevel(filteredData);
      } else if (strategy === 'by_capacity_top') {
        transformedData = transformByCapacityTopLevel(filteredData);
      } else if (strategy === 'by_packet_type_top') {
        transformedData = transformByPacketTypeTopLevel(filteredData);
      }

      // Helper function to find active node in any structure
      const findActiveNode = (data: any, nodeId: string): any => {
        if (!nodeId) return null;

        // Handle default structure
        if (strategy === 'default') {
          for (const brandData of data) {
            const brandNodeId = `brand-${brandData.brand || 'unbranded'}`;
            if (brandNodeId === nodeId) return brandData;
            for (const product of brandData.products || []) {
              const productNodeId = `product-${product.product_id}`;
              if (productNodeId === nodeId) return product;
              for (const pack of product.packaging || []) {
                const packagingNodeId = `packaging-${pack.packaging_id}`;
                if (packagingNodeId === nodeId) return pack;
              }
            }
          }
        }

        // Handle transformed structures - simplified for now, will expand
        // For now, fall back to default behavior
        if (strategy !== 'default' && data.length > 0) {
          // Try to find in first level
          for (const item of data) {
            if (strategy === 'by_vendor_top' && item.vendor) {
              const vendorNodeId = `vendor-${item.vendor.id || 'unassigned'}`;
              if (vendorNodeId === nodeId) return item;
            } else if (strategy === 'by_capacity_top' && item.capacity !== undefined) {
              const capacityNodeId = `capacity-${item.capacity}`;
              if (capacityNodeId === nodeId) return item;
            } else if (strategy === 'by_packet_type_top' && item.packet_type) {
              const packetTypeNodeId = `packetType-${item.packet_type}`;
              if (packetTypeNodeId === nodeId) return item;
            }
          }
        }

        return null;
      };

      // Find active node
      let activeNodeData: any = null;
      if (activeNodeId) {
        activeNodeData = findActiveNode(transformedData, activeNodeId);
      }

      // If no active node, set first item as active
      if (!activeNodeData && transformedData.length > 0) {
        const firstItem = transformedData[0];
        let firstNodeId = '';
        if (strategy === 'default') {
          firstNodeId = `brand-${firstItem.brand || 'unbranded'}`;
        } else if (strategy === 'by_vendor_top') {
          firstNodeId = `vendor-${firstItem.vendor?.id || 'unassigned'}`;
        } else if (strategy === 'by_capacity_top') {
          firstNodeId = `capacity-${firstItem.capacity}`;
        } else if (strategy === 'by_packet_type_top') {
          firstNodeId = `packetType-${firstItem.packet_type}`;
        } else {
          firstNodeId = `brand-${firstItem.brand || 'unbranded'}`;
        }
        setActiveNodeId(firstNodeId);
        activeNodeData = firstItem;
      }

      if (!activeNodeData) {
        return { nodes, edges };
      }

      // Helper to create nodes and edges based on structure
      const createNodesForStructure = (nodeData: any, _x: number, y: number, level: number): { nodeId: string; children: any[] } => {
        // Determine column positions dynamically
        const COLUMN_X = CENTER_X + (level * HORIZONTAL_SPACING);
        
        // Handle default structure
        if (strategy === 'default') {
          if (nodeData.brand !== undefined) {
            const brandNodeId = `brand-${nodeData.brand || 'unbranded'}`;
            nodes.push({
              id: brandNodeId,
              type: 'brand',
              position: { x: COLUMN_X, y },
              data: {
                type: 'brand',
                brand: nodeData.brand,
                hierarchicalData: nodeData,
              },
              selected: activeNodeId === brandNodeId,
            });
            return { nodeId: brandNodeId, children: nodeData.products || [] };
          } else if (nodeData.product_name) {
            const productNodeId = `product-${nodeData.product_id}`;
            nodes.push({
              id: productNodeId,
              type: 'product',
              position: { x: COLUMN_X, y },
              data: {
                type: 'product',
                productId: nodeData.product_id,
                productName: nodeData.product_name,
                riceType: nodeData.rice_type,
                brand: nodeData.brand || '',
                hierarchicalData: nodeData,
              },
              selected: activeNodeId === productNodeId,
            });
            return { nodeId: productNodeId, children: nodeData.packaging || [] };
          } else if (nodeData.packet_type) {
            const packagingNodeId = `packaging-${nodeData.packaging_id}`;
            nodes.push({
              id: packagingNodeId,
              type: 'packaging',
              position: { x: COLUMN_X, y },
              data: {
                type: 'packaging',
                packagingId: nodeData.packaging_id,
                holdingCapacity: nodeData.holding_capacity,
                packetType: nodeData.packet_type,
                vendor: nodeData.vendor,
                productId: nodeData.product_id || '',
                productName: nodeData.product_name || '',
                brand: nodeData.brand || '',
                hierarchicalData: nodeData,
              },
              selected: activeNodeId === packagingNodeId,
            });
            return { nodeId: packagingNodeId, children: nodeData.finished_goods || [] };
          }
        }

        // Handle transformed structures
        if (strategy === 'by_vendor_top' && nodeData.vendor !== undefined) {
          const vendorNodeId = `vendor-${nodeData.vendor?.id || 'unassigned'}`;
          nodes.push({
            id: vendorNodeId,
            type: 'vendor',
            position: { x: COLUMN_X, y },
            data: {
              type: 'vendor',
              vendor: nodeData.vendor,
              hierarchicalData: nodeData,
            },
            selected: activeNodeId === vendorNodeId,
          });
          return { nodeId: vendorNodeId, children: nodeData.brands || [] };
        }

        if (strategy === 'by_capacity_top' && nodeData.capacity !== undefined) {
          const capacityNodeId = `capacity-${nodeData.capacity}`;
          nodes.push({
            id: capacityNodeId,
            type: 'capacity',
            position: { x: COLUMN_X, y },
            data: {
              type: 'capacity',
              capacity: nodeData.capacity,
              hierarchicalData: nodeData,
            },
            selected: activeNodeId === capacityNodeId,
          });
          return { nodeId: capacityNodeId, children: nodeData.brands || [] };
        }

        if (strategy === 'by_packet_type_top' && nodeData.packet_type) {
          const packetTypeNodeId = `packetType-${nodeData.packet_type}`;
          nodes.push({
            id: packetTypeNodeId,
            type: 'packetType',
            position: { x: COLUMN_X, y },
            data: {
              type: 'packetType',
              packetType: nodeData.packet_type,
              hierarchicalData: nodeData,
            },
            selected: activeNodeId === packetTypeNodeId,
          });
          return { nodeId: packetTypeNodeId, children: nodeData.brands || [] };
        }

        return { nodeId: '', children: [] };
      };

      // Create nodes recursively
      if (activeNodeData) {
        const root = createNodesForStructure(activeNodeData, CENTER_X, CENTER_Y, 0);
        let childY = CENTER_Y;
        
        root.children.forEach((child: any, index: number) => {
          if (index > 0) childY += VERTICAL_SPACING;
          const childNode = createNodesForStructure(child, CENTER_X + HORIZONTAL_SPACING, childY, 1);
          
          // Create edge
          edges.push({
            id: `edge-${root.nodeId}-${childNode.nodeId}`,
            source: root.nodeId,
            target: childNode.nodeId,
            type: 'smoothstep',
            animated: false,
            style: {
              stroke: 'rgba(139, 92, 246, 0.5)',
              strokeWidth: 2,
            },
          } as FlowEdge);

          // Handle deeper levels for default strategy
          if (strategy === 'default' && childNode.children) {
            let grandChildY = childY;
            childNode.children.forEach((grandChild: any, gcIndex: number) => {
              if (gcIndex > 0) grandChildY += VERTICAL_SPACING;
              const grandChildNode = createNodesForStructure(grandChild, CENTER_X + HORIZONTAL_SPACING * 2, grandChildY, 2);
              
              if (grandChildNode.nodeId) {
                edges.push({
                  id: `edge-${childNode.nodeId}-${grandChildNode.nodeId}`,
                  source: childNode.nodeId,
                  target: grandChildNode.nodeId,
                  type: 'smoothstep',
                  animated: false,
                  style: {
                    stroke: 'rgba(99, 102, 241, 0.5)',
                    strokeWidth: 2,
                  },
                } as FlowEdge);

                // Handle finished goods
                if (grandChildNode.children && grandChildNode.children.length > 0) {
                  let fgY = grandChildY;
                  grandChildNode.children.forEach((fg: any, fgIndex: number) => {
                    if (fgIndex > 0) fgY += VERTICAL_SPACING;
                    const fgNodeId = `finishedGoods-${fg.batch_id}`;
                    nodes.push({
                      id: fgNodeId,
                      type: 'finishedGoods',
                      position: { x: CENTER_X + HORIZONTAL_SPACING * 3, y: fgY },
                      data: {
                        type: 'finishedGoods',
                        batchId: fg.batch_id,
                        batchNumber: fg.batch_number,
                        quantity: fg.quantity,
                        packets: fg.packets,
                        weight: fg.weight,
                        packagingId: grandChild.packaging_id,
                        productId: child.product_id || '',
                        productName: child.product_name || '',
                        brand: activeNodeData.brand || '',
                        hierarchicalData: fg,
                      },
                      selected: false,
                    });

                    edges.push({
                      id: `edge-${grandChildNode.nodeId}-${fgNodeId}`,
                      source: grandChildNode.nodeId,
                      target: fgNodeId,
                      type: 'smoothstep',
                      animated: false,
                      style: {
                        stroke: 'rgba(59, 130, 246, 0.5)',
                        strokeWidth: 2,
                      },
                    } as FlowEdge);
                  });
                }
              }
            });
          }
        });
      }

      return { nodes, edges };
    },
    [searchQuery, selectedNodeId, activeNodeId, groupingStrategy, filters]
  );

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9a120746-53eb-4d7d-8410-b748191d8e86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryFlow.tsx:useMemo',message:'Creating layout',data:{hierarchicalLength:hierarchical?.length||0,hasData:!!hierarchical&&hierarchical.length>0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (!hierarchical || hierarchical.length === 0) {
      return { nodes: [], edges: [] };
    }
    const result = createHierarchicalLayout(hierarchical, groupingStrategy, filters);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9a120746-53eb-4d7d-8410-b748191d8e86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryFlow.tsx:useMemo-after',message:'Layout created',data:{nodesCount:result.nodes.length,edgesCount:result.edges.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return result;
  }, [hierarchical, createHierarchicalLayout]);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9a120746-53eb-4d7d-8410-b748191d8e86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryFlow.tsx:useEffect-setNodes',message:'Setting nodes and edges',data:{layoutNodesCount:layoutNodes.length,layoutEdgesCount:layoutEdges.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    setNodes(layoutNodes);
    setEdges(layoutEdges as any); // Type assertion needed due to FlowEdge extension
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  // Initial setup - set first brand as active
  useEffect(() => {
    if (hierarchical && hierarchical.length > 0 && !activeNodeId) {
      const firstBrand = hierarchical[0];
      const brandNodeId = `brand-${firstBrand.brand || 'unbranded'}`;
      setActiveNodeId(brandNodeId);
    }
    if (onFlowInstanceReady) {
      onFlowInstanceReady(reactFlowInstance);
    }
  }, [hierarchical, activeNodeId, reactFlowInstance, onFlowInstanceReady]);

  // Find all matching nodes based on search
  useEffect(() => {
    if (!hierarchical || !searchQuery) {
      setMatchingNodeIds([]);
      setCurrentMatchIndex(0);
      return;
    }

    const query = searchQuery.toLowerCase();
    const matches: string[] = [];

    hierarchical.forEach((brandData) => {
      const brandNodeId = `brand-${brandData.brand || 'unbranded'}`;
      if (brandData.brand.toLowerCase().includes(query)) {
        matches.push(brandNodeId);
      }

      brandData.products.forEach((product) => {
        const productNodeId = `product-${product.product_id}`;
        if (
          product.product_name.toLowerCase().includes(query) ||
          (product.rice_type && product.rice_type.toLowerCase().includes(query))
        ) {
          matches.push(productNodeId);
        }

        product.packaging.forEach((pack) => {
          const packagingNodeId = `packaging-${pack.packaging_id}`;
          if (
            pack.packet_type.toLowerCase().includes(query) ||
            (pack.vendor && pack.vendor.name.toLowerCase().includes(query))
          ) {
            matches.push(packagingNodeId);
          }

          pack.finished_goods.forEach((fg) => {
            const finishedGoodsNodeId = `finishedGoods-${fg.batch_id}`;
            if (fg.batch_number.toLowerCase().includes(query)) {
              matches.push(finishedGoodsNodeId);
            }
          });
        });
      });
    });

    setMatchingNodeIds(matches);
    if (matches.length > 0) {
      setCurrentMatchIndex(0);
      setActiveNodeId(matches[0]);
    }
    if (onMatchingInfoChange) {
      onMatchingInfoChange(matches.length, matches.length > 0 ? 0 : -1);
    }
  }, [searchQuery, hierarchical, onMatchingInfoChange]);

  // Navigate to next/previous match
  const navigateToNext = useCallback(() => {
    if (matchingNodeIds.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % matchingNodeIds.length;
    setCurrentMatchIndex(nextIndex);
    setActiveNodeId(matchingNodeIds[nextIndex]);
    if (onMatchingInfoChange) {
      onMatchingInfoChange(matchingNodeIds.length, nextIndex);
    }
  }, [matchingNodeIds, currentMatchIndex, onMatchingInfoChange]);

  const navigateToPrevious = useCallback(() => {
    if (matchingNodeIds.length === 0) return;
    const prevIndex = (currentMatchIndex - 1 + matchingNodeIds.length) % matchingNodeIds.length;
    setCurrentMatchIndex(prevIndex);
    setActiveNodeId(matchingNodeIds[prevIndex]);
    if (onMatchingInfoChange) {
      onMatchingInfoChange(matchingNodeIds.length, prevIndex);
    }
  }, [matchingNodeIds, currentMatchIndex, onMatchingInfoChange]);

  // Focus on search matches handler
  const handleFocusMatches = useCallback(() => {
    if (matchingNodeIds.length > 0) {
      setCurrentMatchIndex(0);
      setActiveNodeId(matchingNodeIds[0]);
    }
  }, [matchingNodeIds]);

  // Reset to brands only handler
  const handleResetToBrands = useCallback(() => {
    if (!hierarchical || hierarchical.length === 0) return;
    const firstBrand = hierarchical[0];
    const brandNodeId = `brand-${firstBrand.brand || 'unbranded'}`;
    setActiveNodeId(brandNodeId);
    setMatchingNodeIds([]);
    setCurrentMatchIndex(0);
  }, [hierarchical]);

  // Expose handlers to parent via refs
  useEffect(() => {
    if (onFocusMatchesRef) {
      onFocusMatchesRef(handleFocusMatches);
    }
  }, [handleFocusMatches, onFocusMatchesRef]);

  useEffect(() => {
    if (onResetToBrandsRef) {
      onResetToBrandsRef(handleResetToBrands);
    }
  }, [handleResetToBrands, onResetToBrandsRef]);

  useEffect(() => {
    if (onNavigateNextRef) {
      onNavigateNextRef(navigateToNext);
    }
  }, [navigateToNext, onNavigateNextRef]);

  useEffect(() => {
    if (onNavigatePreviousRef) {
      onNavigatePreviousRef(navigateToPrevious);
    }
  }, [navigateToPrevious, onNavigatePreviousRef]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        navigateToNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        navigateToPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigateToNext, navigateToPrevious]);

  // Animate to active node when it changes
  useEffect(() => {
    if (reactFlowInstance && activeNodeId && nodes.length > 0) {
      setTimeout(() => {
        const activeNode = nodes.find(n => n.id === activeNodeId);
        if (activeNode) {
          // Get children of active node
          const childEdges = edges.filter(e => e.source === activeNodeId);
          const childNodeIds = childEdges.map(e => e.target);
          const childNodes = nodes.filter(n => childNodeIds.includes(n.id));
          const nodesToFocus = [activeNode, ...childNodes];

          const childCount = childNodes.length;
          let maxZoom = 1.8;
          let padding = 0.5;

          if (childCount > 10) {
            maxZoom = 1.2;
            padding = 0.3;
          } else if (childCount > 5) {
            maxZoom = 1.5;
            padding = 0.4;
          }

          reactFlowInstance.fitView({
            padding,
            duration: 800,
            nodes: nodesToFocus,
            maxZoom,
            minZoom: 0.8,
          });
        }
      }, 200);
    }
  }, [reactFlowInstance, activeNodeId, nodes, edges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const nodeData = node.data as FlowNodeData;
      onNodeSelect(nodeData);
      setActiveNodeId(node.id);
    },
    [onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  const onNodeMouseEnter: NodeMouseHandler = useCallback((event, node) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setHoveredNode({
      data: node.data as FlowNodeData,
      x: rect.right,
      y: rect.top,
    });
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/9a120746-53eb-4d7d-8410-b748191d8e86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryFlow.tsx:render',message:'Rendering ReactFlow',data:{nodesCount:nodes.length,edgesCount:edges.length,loading,hasReactFlowInstance:!!reactFlowInstance,hierarchicalLength:hierarchical?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  }, [nodes.length, edges.length, loading, reactFlowInstance, hierarchical?.length]);
  // #endregion

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (!hierarchical || hierarchical.length === 0) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9a120746-53eb-4d7d-8410-b748191d8e86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryFlow.tsx:no-hierarchical',message:'No hierarchical data',data:{hierarchical:hierarchical},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">No inventory data available</p>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9a120746-53eb-4d7d-8410-b748191d8e86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryFlow.tsx:empty-nodes',message:'No nodes to render',data:{hierarchicalLength:hierarchical?.length||0,searchQuery},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">
            {searchQuery ? 'No results found for your search' : 'No nodes to display'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-background" style={{ minHeight: '500px', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        nodeTypes={nodeTypes}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        className="bg-background"
        style={{ background: 'hsl(var(--background))' }}
      >
        <Background color="#e5e7eb" gap={20} size={1} />
        <Controls className="bg-card border border-border rounded-lg shadow-sm" />
        <MiniMap
          className="bg-card border border-border rounded-lg shadow-sm"
          nodeColor={(node) => {
            switch (node.type) {
              case 'brand':
                return '#8b5cf6';
              case 'product':
                return '#6366f1';
              case 'packaging':
                return '#3b82f6';
              case 'finishedGoods':
                return '#22c55e';
              default:
                return '#6b7280';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
      {hoveredNode && (
        <NodePreviewTooltip
          data={hoveredNode.data}
          x={hoveredNode.x}
          y={hoveredNode.y}
        />
      )}
    </div>
  );
}

