import { useMemo, useState, useEffect } from 'react';
import { BookOpen, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { SearchBar } from '../../admin/shared/SearchBar';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ActionButtons } from '../../admin/shared/ActionButtons';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { AlertDialog } from '../../shared/AlertDialog';
import { useRecipes } from '../../../hooks/useRecipes';
import { useInventory } from '../../../hooks/useInventory';
import { lotsAPI } from '../../../services/lots.api';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { RecipeFormModal } from './RecipeFormModal';
import type { Lot, LotsInventory } from '../../../types/entities';

export function RecipesTable() {
  const { recipes, loading, deleteRecipe, refetch } = useRecipes();
  const { lots: lotsInventory, fetchLots } = useInventory();
  const [lots, setLots] = useState<Lot[]>([]);
  const [riceCodes, setRiceCodes] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('error');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Fetch lots and rice codes data
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [lotsData, riceCodesData] = await Promise.all([
          lotsAPI.getAllLots(),
          riceCodesAPI.getAllRiceCodes(),
        ]);
        setLots(lotsData);
        setRiceCodes(riceCodesData);
        fetchLots();
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const getLotInfo = (lotId: string) => {
    const lot = lots.find((l) => l.id === lotId);
    if (!lot) return null;
    const riceCode = riceCodes.find((rc) => rc.rice_code_id === lot.rice_code_id);
    const inventory = lotsInventory.find((li) => li.lot_id === lotId);
    const available = inventory
      ? typeof inventory.available_quantity === 'string'
        ? parseFloat(inventory.available_quantity)
        : inventory.available_quantity || 0
      : 0;
    return {
      lot,
      riceCode,
      available: isNaN(available) ? 0 : available,
      lotNumber: lot.lot_number || 'N/A',
      riceCodeName: riceCode?.rice_code_name || 'N/A',
    };
  };

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      const q = searchQuery.toLowerCase();
      return r.recipe_name.toLowerCase().includes(q);
    });
  }, [recipes, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search recipes..."
          />
        </div>
        <button
          className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 w-full sm:w-auto"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" /> Create Recipe
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No recipes found"
          description="Create your first recipe to get started."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((recipe) => (
            <article
              key={recipe.id}
              className="group rounded-2xl p-4 bg-gradient-to-br from-background to-muted/40 border border-border/60 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-tight">{recipe.recipe_name}</h3>
                    <div className="text-xs text-muted-foreground mt-1">
                      {recipe.formula.length} lot{recipe.formula.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* Formula Details */}
              <div className="mt-3 space-y-2">
                {recipe.formula.map((item, idx) => {
                  const lotInfo = getLotInfo(item.lot_id);
                  if (!lotInfo) {
                    return (
                      <div key={idx} className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                        Lot {idx + 1}: {item.percentage}% (Loading...)
                      </div>
                    );
                  }
                  const isAvailable = lotInfo.available > 0;
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg border text-xs ${
                        isAvailable
                          ? 'bg-emerald-500/10 border-emerald-500/20'
                          : 'bg-destructive/10 border-destructive/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            {isAvailable ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                            )}
                            <span className="font-semibold text-foreground">
                              {item.percentage}%
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-foreground truncate">{lotInfo.lotNumber}</span>
                          </div>
                          <div className="text-muted-foreground text-[10px] truncate">
                            {lotInfo.riceCodeName}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div
                            className={`font-medium ${
                              isAvailable ? 'text-emerald-600' : 'text-destructive'
                            }`}
                          >
                            {lotInfo.available.toFixed(2)} kg
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-end">
                <ActionButtons
                  isActive={true}
                  onEdit={() => {
                    setEditId(recipe.id);
                    setCreateOpen(true);
                  }}
                  onDelete={() => {
                    setSelectedId(recipe.id);
                    setDeleteDialogOpen(true);
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedId) {
            try {
              await deleteRecipe(selectedId);
              setSelectedId(null);
              setDeleteDialogOpen(false);
            } catch (error: any) {
              setAlertType('error');
              setAlertTitle('Failed to Delete Recipe');
              setAlertMessage(
                error?.message ||
                  error?.data?.message ||
                  error?.error ||
                  'An error occurred while deleting the recipe. Please try again.'
              );
              setAlertOpen(true);
              setDeleteDialogOpen(false);
            }
          }
        }}
        title="Delete Recipe"
        description="Are you sure you want to delete this recipe? This action cannot be undone."
        confirmText="Delete"
      />

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />

      <RecipeFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setEditId(null);
            refetch();
          }
        }}
        recipeId={editId}
      />
    </div>
  );
}

