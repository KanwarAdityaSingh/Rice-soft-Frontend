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
import type { FlowNode, FlowEdge, FlowNodeData, GroupingStrategy, BrandNodeData, ProductNodeData, PackagingNodeData } from '../../../types/inventoryFlow';
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
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [expandedPackaging, setExpandedPackaging] = useState<Set<string>>(new Set());

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9a120746-53eb-4d7d-8410-b748191d8e86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryFlow.tsx:47',message:'Fetching hierarchical inventory',data:{loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    fetchHierarchicalInventory();
  }, [fetchHierarchicalInventory]);

  const createHierarchicalLayout = useCallback(
    (data: HierarchicalInventory[], strategy: GroupingStrategy, appliedFilters: ExtendedInventoryFilters, expandedBrandsSet: Set<string>, expandedProductsSet: Set<string>, expandedPackagingSet: Set<string>): { nodes: FlowNode[]; edges: FlowEdge[] } => {
      const nodes: FlowNode[] = [];
      const edges: FlowEdge[] = [];

      // Layout configuration
      const START_X = 200; // Start position for brands
      const START_Y = 100; // Start position for first brand
      const HORIZONTAL_SPACING = 350; // px between columns
      const VERTICAL_SPACING = 180; // px between items in same column
      const BRAND_SPACING = 200; // Vertical spacing between brands

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

      // For default strategy: Show all brands initially, expand on click
      if (strategy === 'default') {
        let brandY = START_Y;
        
        transformedData.forEach((brandData: any) => {
          const brandKey = brandData.brand || 'unbranded';
          const brandNodeId = `brand-${brandKey}`;
          const isBrandExpanded = expandedBrandsSet.has(brandKey);
          
          // Always show brand node
          nodes.push({
            id: brandNodeId,
            type: 'brand',
            position: { x: START_X, y: brandY },
            data: {
              type: 'brand',
              brand: brandData.brand,
              hierarchicalData: brandData,
              expanded: isBrandExpanded,
            } as BrandNodeData,
            selected: activeNodeId === brandNodeId,
            style: {
              opacity: 1,
              transition: 'all 0.3s ease-in-out',
            },
          });

          // Show products if brand is expanded
          if (isBrandExpanded && brandData.products) {
            let productY = brandY;
            brandData.products.forEach((product: any, productIndex: number) => {
              if (productIndex > 0) productY += VERTICAL_SPACING;
              const productNodeId = `product-${product.product_id}`;
              const isProductExpanded = expandedProductsSet.has(product.product_id);
              
              nodes.push({
                id: productNodeId,
                type: 'product',
                position: { x: START_X + HORIZONTAL_SPACING, y: productY },
                data: {
                  type: 'product',
                  productId: product.product_id,
                  productName: product.product_name,
                  riceType: product.rice_type,
                  brand: brandData.brand,
                  hierarchicalData: product,
                  expanded: isProductExpanded,
                } as ProductNodeData,
                selected: activeNodeId === productNodeId,
                style: {
                  opacity: 1,
                  transition: 'all 0.3s ease-in-out',
                },
              });

              edges.push({
                id: `edge-${brandNodeId}-${productNodeId}`,
                source: brandNodeId,
                target: productNodeId,
                type: 'smoothstep',
                animated: true,
                style: {
                  stroke: 'rgba(139, 92, 246, 0.6)',
                  strokeWidth: 2,
                },
              } as FlowEdge);

              // Show packaging if product is expanded
              if (isProductExpanded && product.packaging) {
                let packagingY = productY;
                product.packaging.forEach((pack: any, packIndex: number) => {
                  if (packIndex > 0) packagingY += VERTICAL_SPACING;
                  const packagingNodeId = `packaging-${pack.packaging_id}`;
                  const isPackagingExpanded = expandedPackagingSet.has(pack.packaging_id);
                  
                  nodes.push({
                    id: packagingNodeId,
                    type: 'packaging',
                    position: { x: START_X + HORIZONTAL_SPACING * 2, y: packagingY },
                    data: {
                      type: 'packaging',
                      packagingId: pack.packaging_id,
                      holdingCapacity: pack.holding_capacity,
                      packetType: pack.packet_type,
                      vendor: pack.vendor,
                      productId: product.product_id,
                      productName: product.product_name,
                      brand: brandData.brand,
                      hierarchicalData: pack,
                      expanded: isPackagingExpanded,
                    } as PackagingNodeData,
                    selected: activeNodeId === packagingNodeId,
                    style: {
                      opacity: 1,
                      transition: 'all 0.3s ease-in-out',
                    },
                  });

                  edges.push({
                    id: `edge-${productNodeId}-${packagingNodeId}`,
                    source: productNodeId,
                    target: packagingNodeId,
                    type: 'smoothstep',
                    animated: true,
                    style: {
                      stroke: 'rgba(99, 102, 241, 0.6)',
                      strokeWidth: 2,
                    },
                  } as FlowEdge);

                  // Show finished goods if packaging is expanded
                  if (isPackagingExpanded && pack.finished_goods) {
                    let fgY = packagingY;
                    pack.finished_goods.forEach((fg: any, fgIndex: number) => {
                      if (fgIndex > 0) fgY += VERTICAL_SPACING;
                      const fgNodeId = `finishedGoods-${fg.batch_id}`;
                      
                      nodes.push({
                        id: fgNodeId,
                        type: 'finishedGoods',
                        position: { x: START_X + HORIZONTAL_SPACING * 3, y: fgY },
                        data: {
                          type: 'finishedGoods',
                          batchId: fg.batch_id,
                          batchNumber: fg.batch_number,
                          quantity: fg.quantity,
                          packets: fg.packets,
                          weight: fg.weight,
                          packagingId: pack.packaging_id,
                          productId: product.product_id,
                          productName: product.product_name,
                          brand: brandData.brand,
                          hierarchicalData: fg,
                        },
                        selected: activeNodeId === fgNodeId,
                        style: {
                          opacity: 1,
                          transition: 'all 0.3s ease-in-out',
                        },
                      });

                      edges.push({
                        id: `edge-${packagingNodeId}-${fgNodeId}`,
                        source: packagingNodeId,
                        target: fgNodeId,
                        type: 'smoothstep',
                        animated: true,
                        style: {
                          stroke: 'rgba(59, 130, 246, 0.6)',
                          strokeWidth: 2,
                        },
                      } as FlowEdge);
                    });
                  }
                });
              }
            });
          }

          // Calculate next brand Y position based on expanded content
          if (isBrandExpanded && brandData.products) {
            const totalProducts = brandData.products.length;
            const maxExpandedHeight = brandData.products.reduce((max: number, product: any) => {
              const isProductExpanded = expandedProductsSet.has(product.product_id);
              if (!isProductExpanded) return max;
              
              const packagingCount = product.packaging?.length || 0;
              const maxPackagingHeight = product.packaging?.reduce((packMax: number, pack: any) => {
                const isPackagingExpanded = expandedPackagingSet.has(pack.packaging_id);
                if (!isPackagingExpanded) return packMax;
                return packMax + (pack.finished_goods?.length || 0);
              }, 0) || 0;
              
              return Math.max(max, packagingCount + maxPackagingHeight);
            }, totalProducts);
            
            brandY += Math.max(totalProducts, maxExpandedHeight) * VERTICAL_SPACING + BRAND_SPACING;
          } else {
            brandY += BRAND_SPACING;
          }
        });
      } else {
        // For other strategies, show all top-level items
        let topY = START_Y;
        transformedData.forEach((_topItem: any, index: number) => {
          if (index > 0) topY += BRAND_SPACING;
          // Similar expansion logic for other strategies
          // (Simplified for now - can be expanded later)
        });
      }

      return { nodes, edges };
    },
    [searchQuery, selectedNodeId, activeNodeId, groupingStrategy, filters, expandedBrands, expandedProducts, expandedPackaging]
  );

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9a120746-53eb-4d7d-8410-b748191d8e86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryFlow.tsx:useMemo',message:'Creating layout',data:{hierarchicalLength:hierarchical?.length||0,hasData:!!hierarchical&&hierarchical.length>0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (!hierarchical || hierarchical.length === 0) {
      return { nodes: [], edges: [] };
    }
    const result = createHierarchicalLayout(hierarchical, groupingStrategy, filters, expandedBrands, expandedProducts, expandedPackaging);
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

  // Initial setup - don't set active node, show all brands
  useEffect(() => {
    if (onFlowInstanceReady) {
      onFlowInstanceReady(reactFlowInstance);
    }
  }, [hierarchical, reactFlowInstance, onFlowInstanceReady]);

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

  // Reset to brands only handler - collapse all
  const handleResetToBrands = useCallback(() => {
    setExpandedBrands(new Set());
    setExpandedProducts(new Set());
    setExpandedPackaging(new Set());
    setActiveNodeId(null);
    setMatchingNodeIds([]);
    setCurrentMatchIndex(0);
  }, []);

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
      
      // Handle expand/collapse for default strategy
      if (groupingStrategy === 'default') {
        if (nodeData.type === 'brand') {
          const brandKey = nodeData.brand || 'unbranded';
          setExpandedBrands(prev => {
            const next = new Set(prev);
            if (next.has(brandKey)) {
              next.delete(brandKey);
              // Also collapse children
              setExpandedProducts(prev => {
                const next = new Set(prev);
                nodeData.hierarchicalData.products?.forEach((p: any) => {
                  next.delete(p.product_id);
                });
                return next;
              });
            } else {
              next.add(brandKey);
            }
            return next;
          });
        } else if (nodeData.type === 'product') {
          setExpandedProducts(prev => {
            const next = new Set(prev);
            if (next.has(nodeData.productId)) {
              next.delete(nodeData.productId);
              // Also collapse packaging
              setExpandedPackaging(prev => {
                const next = new Set(prev);
                nodeData.hierarchicalData.packaging?.forEach((p: any) => {
                  next.delete(p.packaging_id);
                });
                return next;
              });
            } else {
              next.add(nodeData.productId);
            }
            return next;
          });
        } else if (nodeData.type === 'packaging') {
          setExpandedPackaging(prev => {
            const next = new Set(prev);
            if (next.has(nodeData.packagingId)) {
              next.delete(nodeData.packagingId);
            } else {
              next.add(nodeData.packagingId);
            }
            return next;
          });
        }
      }
    },
    [onNodeSelect, groupingStrategy]
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

