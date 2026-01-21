import { useState, useRef, useCallback, useEffect } from 'react';
import { Layers, BarChart3 } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { useInventory } from '../../../hooks/useInventory';
// import { InventoryFlow } from './InventoryFlow'; // Commented out - using TreeView instead
import { InventoryTreeView } from './InventoryTreeView';
import { InventoryTable } from './InventoryTable';
import { InventorySummaryPanel } from './InventorySummaryPanel';
import { FlowControls } from './flow/FlowControls';
import { InventoryFilters } from './InventoryFilters';
import type { FlowNodeData } from '../../../types/inventoryFlow';
import type { ReactFlowInstance } from '../../../types/reactflow';
import type { GroupingStrategy } from '../../../types/inventoryFlow';
import type { ExtendedInventoryFilters } from '../../../utils/inventoryTransform';

export function InventoryDashboard() {
  const { loading, hierarchical, fetchHierarchicalInventory } = useInventory();
  const [viewMode, setViewMode] = useState<'diagram' | 'tree' | 'table' | 'summary'>('diagram');
  const [groupingStrategy, setGroupingStrategy] = useState<GroupingStrategy>('default');
  const [filters, setFilters] = useState<ExtendedInventoryFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Ensure hierarchical data is fetched on mount
  useEffect(() => {
    fetchHierarchicalInventory();
  }, [fetchHierarchicalInventory]);
  const [selectedNode, setSelectedNode] = useState<FlowNodeData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // React Flow related state - commented out since using TreeView
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const focusMatchesRef = useRef<(() => void) | null>(null);
  const resetToBrandsRef = useRef<(() => void) | null>(null);
  const navigateNextRef = useRef<(() => void) | null>(null);
  const navigatePreviousRef = useRef<(() => void) | null>(null);
  const [matchingCount, setMatchingCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  // Suppress unused variable warnings for commented out React Flow
  void reactFlowInstance; void focusMatchesRef; void resetToBrandsRef; 
  void navigateNextRef; void navigatePreviousRef; void setMatchingCount; void setCurrentMatchIndex;

  const handleNodeSelect = (nodeData: FlowNodeData | null) => {
    setSelectedNode(nodeData);
    if (nodeData) {
      // Generate node ID based on type
      let nodeId = '';
      switch (nodeData.type) {
        case 'brand':
          nodeId = `brand-${nodeData.brand || 'unbranded'}`;
          break;
        case 'product':
          nodeId = `product-${nodeData.productId}`;
          break;
        case 'packaging':
          nodeId = `packaging-${nodeData.packagingId}`;
          break;
        case 'finishedGoods':
          nodeId = `finishedGoods-${nodeData.batchId}`;
          break;
        case 'vendor':
          nodeId = `vendor-${nodeData.vendor?.id || 'unassigned'}`;
          break;
        case 'capacity':
          nodeId = `capacity-${nodeData.capacity}`;
          break;
        case 'riceType':
          nodeId = `riceType-${nodeData.riceType}`;
          break;
        case 'packetType':
          nodeId = `packetType-${nodeData.packetType}`;
          break;
      }
      setSelectedNodeId(nodeId);
    } else {
      setSelectedNodeId(null);
    }
  };

  // Commented out - used with React Flow
  const handleFlowInstanceReady = (instance: ReactFlowInstance | null) => {
    setReactFlowInstance(instance);
  };
  void handleFlowInstanceReady; // Suppress unused warning

  const handleFocusMatches = useCallback(() => {
    if (focusMatchesRef.current) {
      focusMatchesRef.current();
    }
  }, []);

  const handleResetToBrands = useCallback(() => {
    if (resetToBrandsRef.current) {
      resetToBrandsRef.current();
    }
  }, []);

  const groupingStrategies: Array<{ value: GroupingStrategy; label: string; description: string }> = [
    { value: 'default', label: 'Default', description: 'Brand → Product → Packaging → Finished Goods' },
    { value: 'by_capacity', label: 'By Capacity', description: 'Brand → Product → Capacity → Packaging' },
    { value: 'by_vendor', label: 'By Vendor', description: 'Brand → Product → Vendor → Packaging' },
    { value: 'by_rice_type', label: 'By Rice Type', description: 'Brand → Rice Type → Product → Packaging' },
    { value: 'by_vendor_top', label: 'Vendor First', description: 'Vendor → Brand → Product → Packaging' },
    { value: 'by_capacity_top', label: 'Capacity First', description: 'Capacity → Brand → Product → Packaging' },
    { value: 'by_packet_type_top', label: 'Packet Type First', description: 'Packet Type → Brand → Product → Packaging' },
  ];

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col space-y-4">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Inventory Hierarchy</h2>
            <p className="text-sm text-muted-foreground">
              {groupingStrategies.find(s => s.value === groupingStrategy)?.description || 'Interactive flow visualization'}
            </p>
          </div>
        </div>
        <FlowControls
          reactFlowInstance={reactFlowInstance}
          onSearchChange={setSearchQuery}
          searchQuery={searchQuery}
          onFocusMatches={handleFocusMatches}
          onResetToBrands={handleResetToBrands}
          onNavigateNext={() => navigateNextRef.current?.()}
          onNavigatePrevious={() => navigatePreviousRef.current?.()}
          matchingCount={matchingCount}
          currentMatchIndex={currentMatchIndex}
        />
      </div>

      {/* Grouping Strategy Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {groupingStrategies.map((strategy) => (
          <button
            key={strategy.value}
            onClick={() => setGroupingStrategy(strategy.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              groupingStrategy === strategy.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            title={strategy.description}
          >
            {strategy.label}
          </button>
        ))}
      </div>

      {/* Main Content Area - 50/50 Split */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Flow Visualization Panel - Left 50% */}
        <div className="w-1/2 relative bg-card rounded-xl border border-border shadow-sm">
          {/* View Switcher - commented out since using TreeView only
          <div className="absolute top-3 right-3 z-10">
            <div className="flex items-center gap-1 bg-muted/50 backdrop-blur-sm rounded-lg p-1 border border-border/50">
              <button
                onClick={() => setViewMode('diagram')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'diagram'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                title="Diagram View"
                aria-label="Switch to Diagram View"
              >
                <Network className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'tree'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                title="Tree View"
                aria-label="Switch to Tree View"
              >
                <ListTree className="h-4 w-4" />
              </button>
            </div>
          </div>
          */}

          {loading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="w-full h-full">
              <InventoryTreeView
                hierarchical={hierarchical || []}
                selectedNodeId={selectedNodeId}
                onNodeSelect={handleNodeSelect}
                searchQuery={searchQuery}
                loading={loading}
              />
            </div>
          )}
          {/* React Flow commented out - using TreeView instead
          {(viewMode === 'diagram' || viewMode === 'table' || viewMode === 'summary') ? (
            <div className="w-full h-full">
              <InventoryFlow
                onNodeSelect={handleNodeSelect}
                selectedNodeId={selectedNodeId}
                searchQuery={searchQuery}
                groupingStrategy={groupingStrategy}
                filters={filters}
                onFlowInstanceReady={handleFlowInstanceReady}
                onFocusMatchesRef={(fn) => { focusMatchesRef.current = fn; }}
                onResetToBrandsRef={(fn) => { resetToBrandsRef.current = fn; }}
                onNavigateNextRef={(fn) => { navigateNextRef.current = fn; }}
                onNavigatePreviousRef={(fn) => { navigatePreviousRef.current = fn; }}
                onMatchingInfoChange={(count, index) => {
                  setMatchingCount(count);
                  setCurrentMatchIndex(index);
                }}
              />
            </div>
          ) : null}
          */}
        </div>

        {/* Right Panel - 50% */}
        <div className="w-1/2 bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 border-b border-border p-2 bg-muted/30">
            <button
              onClick={() => {
                if (selectedNode) {
                  setViewMode('table');
                }
              }}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedNode && viewMode === 'table'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : selectedNode
                  ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                  : 'bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50'
              }`}
              disabled={!selectedNode}
            >
              Details
            </button>
            <button
              onClick={() => {
                setViewMode('summary');
                setSelectedNode(null);
                setSelectedNodeId(null);
              }}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                !selectedNode || viewMode === 'summary'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Summary
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-auto">
            {selectedNode && viewMode === 'table' ? (
              <InventoryTable selectedNode={selectedNode} />
            ) : (
              <InventorySummaryPanel 
                hierarchical={hierarchical || []} 
                filters={filters} 
                selectedNode={selectedNode}
              />
            )}
          </div>
        </div>
      </div>

      {/* Filter Sidebar */}
      <InventoryFilters
        hierarchical={hierarchical || []}
        filters={filters}
        onFiltersChange={setFilters}
        isOpen={filtersOpen}
        onToggle={() => setFiltersOpen(!filtersOpen)}
      />
    </div>
  );
}
