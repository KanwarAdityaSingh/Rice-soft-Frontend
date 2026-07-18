import { useMemo, useState, useEffect, useCallback } from 'react'
import { Plus, Ruler } from 'lucide-react'
import { SearchBar } from '../../components/admin/shared/SearchBar'
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner'
import { EmptyState } from '../../components/admin/shared/EmptyState'
import { ActionButtons } from '../../components/admin/shared/ActionButtons'
import { ConfirmDialog } from '../../components/admin/shared/ConfirmDialog'
import { AlertDialog } from '../../components/shared/AlertDialog'
import { useRiceCodes } from '../../hooks/useRiceCodes'
import { RiceCodeFormModal } from '../../components/admin/rice-codes/RiceCodeFormModal'
import { RiceTypesModal } from '../../components/admin/rice-codes/RiceTypesModal'
import { RiceLengthsModal } from '../../components/admin/rice-codes/RiceLengthsModal'
import {
  RiceCodeHierarchyPanel,
} from '../../components/admin/rice-codes/RiceCodeHierarchyPanel'
import { SaudaPreviewDialog } from '../../components/purchases/saudas/SaudaPreviewDialog'
import { leadsAPI } from '../../services/leads.api'
import { saudasAPI } from '../../services/saudas.api'
import { vendorsAPI } from '../../services/vendors.api'
import { riceCodesAPI } from '../../services/riceCodes.api'
import { riceLengthsAPI } from '../../services/riceLengths.api'
import { getRiceTypeLabel } from '../../utils/riceType'
import {
  filterSaudasByCategory,
  filterSaudasByRiceLength,
  filterSaudasByRiceType,
  isUnsetRiceLengthKey,
  isUnsetRiceTypeKey,
  riceLengthGroupKey,
  riceTypeGroupKey,
} from '../../utils/saudaRiceHierarchy'
import { formatRiceLengthGroupLabel } from '../../utils/riceLengthModule'
import { getRiceCodeVariantKeys } from '../../utils/riceCodeVariants'
import { isAdmin } from '../../utils/permissions'
import type { RiceCategory, RiceCode, RiceLengthRecord, RiceType, Sauda } from '../../types/entities'

export default function RiceCodesPage() {
  const { riceCodes, loading, deleteRiceCode, createRiceCode, updateRiceCode, refetch } = useRiceCodes()
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editRiceCode, setEditRiceCode] = useState<RiceCode | null>(null)
  const [riceTypesOpen, setRiceTypesOpen] = useState(false)
  const [riceLengthsOpen, setRiceLengthsOpen] = useState(false)
  const [saudas, setSaudas] = useState<Sauda[]>([])
  const [riceCategories, setRiceCategories] = useState<RiceType[]>([])
  const [categoryVariants, setCategoryVariants] = useState<RiceType[]>([])
  const [riceLengths, setRiceLengths] = useState<RiceLengthRecord[]>([])
  const [categoryFilter, setCategoryFilter] = useState<RiceCategory | null>(null)
  const [variantFilter, setVariantFilter] = useState<string | null>(null)
  const [lengthFilter, setLengthFilter] = useState<string | null>(null)
  const [hierarchyRiceCodeId, setHierarchyRiceCodeId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewSauda, setPreviewSauda] = useState<Sauda | null>(null)
  const [previewSerial, setPreviewSerial] = useState<number | null>(null)
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('error')
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')

  // Fetch saudas to check rice code usage
  useEffect(() => {
    const fetchSaudas = async () => {
      try {
        const data = await saudasAPI.getAllSaudas();
        setSaudas(data);
      } catch (error) {
        console.error('Failed to fetch saudas:', error);
      }
    };
    fetchSaudas();
  }, []);

  const reloadRiceLengths = useCallback(async () => {
    try {
      const lengths = await riceLengthsAPI.getAllRiceLengths();
      setRiceLengths(lengths);
    } catch (error) {
      console.error('Failed to fetch rice lengths:', error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadRiceMeta = async () => {
      try {
        const [categories, lengths] = await Promise.all([
          riceCodesAPI.getRiceCategories(),
          riceLengthsAPI.getAllRiceLengths(),
        ]);
        if (!cancelled) {
          setRiceCategories(categories);
          setRiceLengths(lengths);
        }
      } catch (error) {
        console.error('Failed to fetch rice categories / lengths:', error);
      }
    };
    void loadRiceMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!categoryFilter) {
      setCategoryVariants([]);
      return;
    }
    let cancelled = false;
    const loadVariants = async () => {
      try {
        const variants = await riceCodesAPI.getRiceVariants(categoryFilter);
        if (!cancelled) setCategoryVariants(variants);
      } catch (error) {
        console.error('Failed to fetch rice variants:', error);
        if (!cancelled) setCategoryVariants([]);
      }
    };
    void loadVariants();
    return () => {
      cancelled = true;
    };
  }, [categoryFilter]);

  const saudasByRiceCode = useMemo(() => {
    const map = new Map<string, Sauda[]>()
    for (const sauda of saudas) {
      if (!sauda.rice_code_id) continue
      const list = map.get(sauda.rice_code_id)
      if (list) list.push(sauda)
      else map.set(sauda.rice_code_id, [sauda])
    }
    return map
  }, [saudas])

  const hierarchyRiceCode = hierarchyRiceCodeId
    ? riceCodes.find((rc) => rc.rice_code_id === hierarchyRiceCodeId) ?? null
    : null

  const getSaudasForRiceCode = useCallback(
    (
      riceCodeId: string,
      category: RiceCategory | null,
      variant: string | null,
      length: string | null = null,
    ): Sauda[] => {
      let codeSaudas = saudasByRiceCode.get(riceCodeId) ?? []
      if (category) codeSaudas = filterSaudasByCategory(codeSaudas, category)
      if (variant) codeSaudas = filterSaudasByRiceType(codeSaudas, variant)
      if (length) {
        const lengthRecord = riceLengths.find((row) => row.id === length)
        codeSaudas = filterSaudasByRiceLength(codeSaudas, length, lengthRecord?.name)
      }
      return codeSaudas
    },
    [saudasByRiceCode, riceLengths],
  )

  const riceCodePillOptions = useMemo(() => {
    if (!categoryFilter) return []
    const q = searchQuery.toLowerCase()
    return riceCodes
      .filter((rc) => rc.category === categoryFilter)
      .filter((rc) => !q || rc.rice_code_name.toLowerCase().includes(q))
      .map((rc) => ({
        id: rc.rice_code_id,
        label: rc.rice_code_name.trim(),
        count: getSaudasForRiceCode(rc.rice_code_id, categoryFilter, null).length,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [riceCodes, categoryFilter, searchQuery, getSaudasForRiceCode])

  const variantsForSelectedCode = useMemo(() => {
    if (!categoryFilter) return []
    const allowedKeys = getRiceCodeVariantKeys(hierarchyRiceCode?.variants)
    if (allowedKeys.length) {
      const allowed = new Set(allowedKeys)
      return categoryVariants.filter((v) => allowed.has(v.value))
    }
    return categoryVariants
  }, [categoryFilter, categoryVariants, hierarchyRiceCode])

  const variantFilterOptions = useMemo(() => {
    if (!hierarchyRiceCodeId || !categoryFilter) return []
    const options: { key: string; label: string; count: number }[] = []
    for (const variant of variantsForSelectedCode) {
      const count = getSaudasForRiceCode(hierarchyRiceCodeId, categoryFilter, variant.value).length
      options.push({ key: variant.value, label: variant.label, count })
    }
    const codeSaudas = getSaudasForRiceCode(hierarchyRiceCodeId, categoryFilter, null)
    const unsetCount = codeSaudas.filter((s) => isUnsetRiceTypeKey(riceTypeGroupKey(s))).length
    if (unsetCount > 0) {
      options.push({ key: '__unset_rice_type__', label: 'Unspecified variant', count: unsetCount })
    }
    return options.sort((a, b) => a.label.localeCompare(b.label))
  }, [hierarchyRiceCodeId, categoryFilter, variantsForSelectedCode, getSaudasForRiceCode])

  const lengthFilterOptions = useMemo(() => {
    if (!hierarchyRiceCodeId || !categoryFilter || !variantFilter) return []
    const baseSaudas = getSaudasForRiceCode(hierarchyRiceCodeId, categoryFilter, variantFilter)
    const options: { key: string; label: string; count: number }[] = []

    for (const length of riceLengths.filter((row) => row.is_active)) {
      const lengthSaudas = filterSaudasByRiceLength(baseSaudas, length.id, length.name)
      options.push({
        key: length.id,
        label: length.name,
        count: lengthSaudas.length,
      })
    }

    const unsetSaudas = baseSaudas.filter((sauda) => isUnsetRiceLengthKey(riceLengthGroupKey(sauda)))
    if (unsetSaudas.length > 0) {
      options.push({
        key: '__unset_rice_length__',
        label: 'Unspecified length',
        count: unsetSaudas.length,
      })
    }

    return options.sort((a, b) => a.label.localeCompare(b.label))
  }, [hierarchyRiceCodeId, categoryFilter, variantFilter, riceLengths, getSaudasForRiceCode])

  const selectedLengthLabel = useMemo(() => {
    if (!lengthFilter) return null
    const option = lengthFilterOptions.find((row) => row.key === lengthFilter)
    if (option) return option.label
    return formatRiceLengthGroupLabel(lengthFilter, riceLengths)
  }, [lengthFilter, lengthFilterOptions, riceLengths])

  // Check if a rice code is used in any sauda
  const isRiceCodeInUse = (riceCodeId: string): boolean => {
    return saudas.some(sauda => sauda.rice_code_id === riceCodeId);
  };


  // Get sauda names for a rice code (for display in warning messages)
  const getSaudaNamesForRiceCode = async (riceCodeId: string): Promise<string[]> => {
    const saudasUsingRiceCode = saudas.filter(sauda => sauda.rice_code_id === riceCodeId);
    
    if (saudasUsingRiceCode.length === 0) return [];
    
    try {
      // Fetch vendors, rice codes, and rice types to build display names
      const [allVendors, allRiceCodes] = await Promise.all([
        vendorsAPI.getAllVendors(false),
        riceCodesAPI.getAllRiceCodes(),
      ]);
      
      const variantLabels = categoryVariants.length > 0 ? categoryVariants : await riceCodesAPI.getRiceTypes().catch(() => []);
      
      // Get the rice code being checked (might not be in allRiceCodes if it's being deleted)
      const currentRiceCode = riceCodes.find(rc => rc.rice_code_id === riceCodeId);
      
      // Build sauda display names (Purchaser - Rice Code - Rice Type)
      const saudaNames = saudasUsingRiceCode.map(sauda => {
        const parts: string[] = [];
        
        // Get purchaser name
        const purchaser = allVendors.find(v => v.id === sauda.purchaser_id);
        if (purchaser?.business_name) parts.push(purchaser.business_name);
        
        // Get rice code name - use current rice code if not found in allRiceCodes
        let riceCodeName = '';
        const riceCode = allRiceCodes.find(rc => rc.rice_code_id === sauda.rice_code_id);
        if (riceCode?.rice_code_name) {
          riceCodeName = riceCode.rice_code_name;
        } else if (sauda.rice_code_id === riceCodeId && currentRiceCode?.rice_code_name) {
          // If this is the rice code being checked, use it from the current state
          riceCodeName = currentRiceCode.rice_code_name;
        }
        if (riceCodeName) parts.push(riceCodeName);
        
        // Get rice type label
        const riceTypeLabel = getRiceTypeLabel(sauda.rice_type, variantLabels);
        if (riceTypeLabel) parts.push(riceTypeLabel);
        
        return parts.join(' - ') || 'Sauda';
      });
      
      return saudaNames;
    } catch (error) {
      console.error('Failed to fetch sauda details:', error);
      return [];
    }
  };

  const handleEditRiceCode = async (rc: RiceCode) => {
    if (isRiceCodeInUse(rc.rice_code_id)) {
      const saudaNames = await getSaudaNamesForRiceCode(rc.rice_code_id)
      const saudaCount = saudaNames.length
      const saudaText = saudaCount === 1 ? 'sauda' : 'saudas'
      const saudaList = saudaNames.map((name, index) => `${index + 1}. ${name}`).join('\n')

      setAlertType('warning')
      setAlertTitle('Cannot Modify Rice Code')
      setAlertMessage(
        `This rice code is currently used in ${saudaCount} ${saudaText}:\n\n${saudaList}\n\nPlease remove it from all saudas before editing.`,
      )
      setAlertOpen(true)
      return
    }
    setEditRiceCode(rc)
    setCreateOpen(true)
  }

  const handleDeleteRiceCode = async (rc: RiceCode) => {
    if (isRiceCodeInUse(rc.rice_code_id)) {
      const saudaNames = await getSaudaNamesForRiceCode(rc.rice_code_id)
      const saudaCount = saudaNames.length
      const saudaText = saudaCount === 1 ? 'sauda' : 'saudas'
      const saudaList = saudaNames.map((name, index) => `${index + 1}. ${name}`).join('\n')

      setAlertType('warning')
      setAlertTitle('Cannot Modify Rice Code')
      setAlertMessage(
        `This rice code is currently used in ${saudaCount} ${saudaText}:\n\n${saudaList}\n\nPlease remove it from all saudas before deleting.`,
      )
      setAlertOpen(true)
      return
    }
    setSelectedId(rc.rice_code_id)
    setDeleteDialogOpen(true)
  }

  // Parse error message to detect foreign key constraint errors and fetch related entities
  const parseForeignKeyError = async (error: any, riceCodeId: string): Promise<string | null> => {
    // Check error.data.error first (where the actual constraint error is), then fall back to other fields
    const errorMessage = error?.data?.error || error?.error || error?.message || ''
    
    if (!errorMessage) return null
    
    // Check for foreign key constraint violation
    if (errorMessage.includes('violates foreign key constraint')) {
      const errorParts: string[] = []
      
      // Always check for leads usage
      try {
        const allLeads = await leadsAPI.getAllLeads()
        const leadsUsingRiceCode = allLeads.filter(lead => lead.rice_code_id === riceCodeId)
        
        if (leadsUsingRiceCode.length > 0) {
          const leadCount = leadsUsingRiceCode.length
          const leadText = leadCount === 1 ? 'lead' : 'leads'
          const leadList = leadsUsingRiceCode.map((lead, index) => `${index + 1}. ${lead.company_name}`).join('\n')
          errorParts.push(`${leadCount} ${leadText}:\n${leadList}`)
        }
      } catch (fetchError) {
        // If fetching leads fails, continue
      }
      
      // Always check for saudas usage
      try {
        const allSaudas = await saudasAPI.getAllSaudas()
        const saudasUsingRiceCode = allSaudas.filter(sauda => sauda.rice_code_id === riceCodeId)
        
        if (saudasUsingRiceCode.length > 0) {
          // Fetch vendors, rice codes, and rice types to build display names
          const [allVendors, allRiceCodes] = await Promise.all([
            vendorsAPI.getAllVendors(false),
            riceCodesAPI.getAllRiceCodes(),
          ])
          const variantLabels = await riceCodesAPI.getRiceTypes().catch(() => [])
          
          // Get the rice code being deleted (might not be in allRiceCodes if it's being deleted)
          const deletedRiceCode = riceCodes.find(rc => rc.rice_code_id === riceCodeId)
          
          // Build sauda display names (Purchaser - Rice Code - Rice Type)
          const saudaNames = saudasUsingRiceCode.map(sauda => {
            const parts: string[] = []
            
            // Get purchaser name
            const purchaser = allVendors.find(v => v.id === sauda.purchaser_id)
            if (purchaser?.business_name) parts.push(purchaser.business_name)
            
            // Get rice code name - use deleted rice code if not found in allRiceCodes
            let riceCodeName = ''
            const riceCode = allRiceCodes.find(rc => rc.rice_code_id === sauda.rice_code_id)
            if (riceCode?.rice_code_name) {
              riceCodeName = riceCode.rice_code_name
            } else if (sauda.rice_code_id === riceCodeId && deletedRiceCode?.rice_code_name) {
              // If this is the rice code being deleted, use it from the current state
              riceCodeName = deletedRiceCode.rice_code_name
            }
            if (riceCodeName) parts.push(riceCodeName)
            
            // Get rice type label
            const riceTypeLabel = getRiceTypeLabel(sauda.rice_type, variantLabels)
            if (riceTypeLabel) parts.push(riceTypeLabel)
            
            return parts.join(' - ') || 'Sauda'
          })
          
          const saudaCount = saudasUsingRiceCode.length
          const saudaText = saudaCount === 1 ? 'sauda' : 'saudas'
          // Format saudas as a list
          const saudaList = saudaNames.map((name, index) => `${index + 1}. ${name}`).join('\n')
          errorParts.push(`${saudaCount} ${saudaText}:\n${saudaList}`)
        }
      } catch (fetchError) {
        // If fetching saudas fails, continue
      }
      
      // Check for lots constraint (if exists)
      if (errorMessage.includes('lots_rice_code_id_fkey')) {
        errorParts.push('one or more lots')
      }
      
      if (errorParts.length > 0) {
        return `This rice code cannot be deleted because it is being used in:\n\n${errorParts.join('\n\n')}\n\nPlease remove the rice code from all references before deleting it.`
      }
      
      // Generic foreign key error
      return 'This rice code cannot be deleted because it is being used by other records. Please remove all references to this rice code before deleting it.'
    }
    
    return null
  }

  return (
    <div className="container mx-auto py-6 sm:py-10 space-y-6 sm:space-y-8 px-4 sm:px-6">
      <header className="hero-bg rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -left-6 -top-6 h-24 w-24 floating-orb" />
        <div className="absolute -right-6 -bottom-6 h-20 w-20 floating-orb" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            <span className="text-gradient">Rice Codes</span>
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">Manage rice code catalog</p>
        </div>
      </header>

      {/* Search, filters, actions */}
      <div className="space-y-4">
        <div className="w-full">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search rice codes..." />
        </div>

        <div className="rounded-2xl border border-border/60 bg-background p-4 space-y-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                1 · Category
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(riceCategories.length > 0
                ? riceCategories
                : [
                    { value: 'basmati', label: 'Basmati' },
                    { value: 'non_basmati', label: 'Non Basmati' },
                  ]
              ).map((cat) => {
                const selected = categoryFilter === cat.value
                const count = filterSaudasByCategory(saudas, cat.value as RiceCategory).length
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(selected ? null : (cat.value as RiceCategory))
                      setVariantFilter(null)
                      setLengthFilter(null)
                      setHierarchyRiceCodeId(null)
                    }}
                    className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      selected
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'border border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    {cat.label}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                        selected ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {categoryFilter && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  2 · Rice code
                </p>
                {isAdmin() && hierarchyRiceCode && (
                  <ActionButtons
                    permissionEntity="riceCode"
                    onEdit={() => void handleEditRiceCode(hierarchyRiceCode)}
                    onDelete={() => void handleDeleteRiceCode(hierarchyRiceCode)}
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {riceCodePillOptions.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No rice codes in this category</span>
                ) : (
                  riceCodePillOptions.map((option) => {
                    const selected = hierarchyRiceCodeId === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setHierarchyRiceCodeId(selected ? null : option.id)
                          setVariantFilter(null)
                          setLengthFilter(null)
                        }}
                        className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                          selected
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'border border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        }`}
                      >
                        {option.label}
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                            selected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {option.count}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {categoryFilter && hierarchyRiceCodeId && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  3 · Variant
                </p>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  onClick={() => setRiceTypesOpen(true)}
                >
                  View variants
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {variantFilterOptions.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {variantsForSelectedCode.length === 0
                      ? 'No variants configured for this rice code'
                      : 'No saudas for this rice code'}
                  </span>
                ) : (
                  variantFilterOptions.map((option) => {
                    const selected = variantFilter === option.key
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          setVariantFilter(selected ? null : option.key)
                          setLengthFilter(null)
                        }}
                        className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                          selected
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'border border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        }`}
                      >
                        {option.label}
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                            selected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {option.count}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {categoryFilter && hierarchyRiceCodeId && variantFilter && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  4 · Rice length
                </p>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  onClick={() => setRiceLengthsOpen(true)}
                >
                  View rice lengths
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {lengthFilterOptions.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No rice lengths configured</span>
                ) : (
                  lengthFilterOptions.map((option) => {
                    const selected = lengthFilter === option.key
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setLengthFilter(selected ? null : option.key)}
                        className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                          selected
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'border border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        }`}
                      >
                        {option.label}
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                            selected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {option.count}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="btn-secondary rounded-xl inline-flex items-center justify-center gap-2"
            onClick={() => setRiceLengthsOpen(true)}
          >
            <Ruler className="h-4 w-4" /> View Rice Lengths
          </button>
          {isAdmin() && (
            <button
              className="btn-primary rounded-xl inline-flex items-center justify-center gap-2"
              onClick={() => {
                setEditRiceCode(null)
                setCreateOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> Add Rice Code
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : riceCodes.length === 0 ? (
        <EmptyState icon={Plus} title="No rice codes found" description="Create your first rice code to get started." />
      ) : (
        hierarchyRiceCode &&
        categoryFilter &&
        variantFilter &&
        lengthFilter && (
          <RiceCodeHierarchyPanel
            riceCode={hierarchyRiceCode}
            riceCategoryKey={categoryFilter}
            riceTypeKey={variantFilter}
            riceLengthKey={lengthFilter}
            riceLengthLabel={selectedLengthLabel ?? lengthFilter}
            allSaudas={saudas}
            riceCategories={riceCategories}
            riceTypes={variantsForSelectedCode}
            riceLengths={riceLengths}
            onPreview={(sauda, serial) => {
              setPreviewSauda(sauda);
              setPreviewSerial(serial);
              setPreviewOpen(true);
            }}
            onClose={() => setLengthFilter(null)}
          />
        )
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedId) {
            try {
              await deleteRiceCode(selectedId)
              setSelectedId(null)
              setDeleteDialogOpen(false)
            } catch (error: any) {
              // Parse foreign key constraint errors and fetch related leads
              const friendlyMessage = await parseForeignKeyError(error, selectedId)
              
              if (friendlyMessage) {
                setAlertType('error')
                setAlertTitle('Cannot Delete Rice Code')
                setAlertMessage(friendlyMessage)
                setAlertOpen(true)
              } else {
                // Generic error handling
                setAlertType('error')
                setAlertTitle('Failed to Delete Rice Code')
                setAlertMessage(
                  error?.message || 
                  error?.data?.message || 
                  error?.error || 
                  'An error occurred while deleting the rice code. Please try again.'
                )
                setAlertOpen(true)
              }
              setDeleteDialogOpen(false)
            }
          }
        }}
        title="Delete Rice Code"
        description="Are you sure you want to delete this rice code? This action cannot be undone."
        confirmText="Delete"
      />

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />

      <RiceCodeFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) {
            setEditRiceCode(null)
            // Refetch rice codes when modal closes to ensure we have the latest data
            refetch()
          }
        }}
        riceCode={editRiceCode}
        onCreate={createRiceCode}
        onUpdate={updateRiceCode}
      />

      <RiceTypesModal open={riceTypesOpen} onOpenChange={setRiceTypesOpen} />

      <RiceLengthsModal
        open={riceLengthsOpen}
        onOpenChange={(open) => {
          setRiceLengthsOpen(open);
          if (!open) void reloadRiceLengths();
        }}
      />

      {previewOpen && previewSauda ? (
        <SaudaPreviewDialog
          open={previewOpen}
          onOpenChange={(open) => {
            setPreviewOpen(open);
            if (!open) {
              setPreviewSerial(null);
            }
          }}
          sauda={previewSauda}
          serialNumber={previewSerial ?? undefined}
        />
      ) : null}
    </div>
  )
}
