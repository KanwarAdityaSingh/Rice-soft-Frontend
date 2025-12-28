import { memo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Search, Target, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactFlowInstance } from '../../../../types/reactflow';

interface FlowControlsProps {
  reactFlowInstance: ReactFlowInstance | null;
  onSearchChange: (value: string) => void;
  searchQuery: string;
  onFocusMatches?: () => void;
  onResetToBrands?: () => void;
  onNavigateNext?: () => void;
  onNavigatePrevious?: () => void;
  matchingCount?: number;
  currentMatchIndex?: number;
}

export const FlowControls = memo(({ 
  reactFlowInstance, 
  onSearchChange, 
  searchQuery,
  onFocusMatches,
  onResetToBrands,
  onNavigateNext,
  onNavigatePrevious,
  matchingCount = 0,
  currentMatchIndex = 0,
}: FlowControlsProps) => {
  const handleZoomIn = () => {
    reactFlowInstance?.zoomIn();
  };

  const handleZoomOut = () => {
    reactFlowInstance?.zoomOut();
  };

  const handleFitView = () => {
    reactFlowInstance?.fitView({ padding: 0.2, duration: 400 });
  };

  const handleReset = () => {
    reactFlowInstance?.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 400 });
  };

  const handleFocusMatches = () => {
    if (onFocusMatches) {
      onFocusMatches();
    }
  };

  const handleResetToBrands = () => {
    if (onResetToBrands) {
      onResetToBrands();
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-card border border-border rounded-lg shadow-sm">
      <div className="flex items-center gap-1 border-r border-border pr-2">
        <button
          onClick={handleZoomIn}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={handleFitView}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          title="Fit View"
          aria-label="Fit View"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        {onResetToBrands && (
          <button
            onClick={handleResetToBrands}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Reset to Brands"
            aria-label="Reset to Brands"
          >
            <Layers className="h-4 w-4" />
          </button>
        )}
        {onFocusMatches && searchQuery && (
          <button
            onClick={handleFocusMatches}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Focus on Matches"
            aria-label="Focus on Matches"
          >
            <Target className="h-4 w-4" />
          </button>
        )}
        {matchingCount > 0 && (
          <>
            <button
              onClick={onNavigatePrevious}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Previous Match (←)"
              aria-label="Previous Match"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground px-1">
              {currentMatchIndex + 1}/{matchingCount}
            </span>
            <button
              onClick={onNavigateNext}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Next Match (→)"
              aria-label="Next Match"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 flex-1 max-w-xs">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search inventory..."
          className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
});

FlowControls.displayName = 'FlowControls';

