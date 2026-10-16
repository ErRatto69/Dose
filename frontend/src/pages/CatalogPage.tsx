import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { drinksApi } from '@/api/drinks.api';
import { useDoseModalStore } from '@/store/useDoseModalStore';
import { GlobalSearch } from '@/components/common/GlobalSearch';
import { BottleStrengthMeter } from '@/components/drink/BottleStrengthMeter';
import { DoseCustomizerModal } from '@/components/drink/DoseCustomizerModal';
import { Plus, Star, Sparkles, Loader2 } from 'lucide-react';

export const CatalogPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingDrinkId, setLoadingDrinkId] = useState<string | null>(null);
    const { openModal } = useDoseModalStore();

    const { data: drinks = [], isLoading, refetch } = useQuery({
        queryKey: ['drinks-catalog'],
        queryFn: drinksApi.getCatalog,
    });

    const filteredDrinks = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return drinks;
        return drinks.filter(
            (d) => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)
        );
    }, [drinks, searchQuery]);

    const handleOpenDrink = async (drinkId: string) => {
        try {
            setLoadingDrinkId(drinkId);
            const detail = await drinksApi.getById(drinkId);
            openModal(detail);
        } catch (err) {
            console.error('Failed to load drink detail:', err);
        } finally {
            setLoadingDrinkId(null);
        }
    };

    return (
        <div className="py-4 space-y-4">
            <GlobalSearch value={searchQuery} onChange={setSearchQuery} />

            {isLoading && (
                <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                    <span className="text-xs">Loading craft catalog...</span>
                </div>
            )}

            <div className="space-y-3">
                {filteredDrinks.map((drink) => (
                    <div
                        key={drink.id}
                        className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col gap-3 shadow-md"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-white leading-tight">{drink.name}</h3>
                                    {drink.glassType && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
                      {drink.glassType}
                    </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                                    {drink.description}
                                </p>
                            </div>

                            {drink.averageRating > 0 && (
                                <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg shrink-0">
                                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                                    <span>{drink.averageRating}</span>
                                </div>
                            )}
                        </div>

                        <BottleStrengthMeter
                            score1To10={drink.bottleScore1To10}
                            abvPercent={drink.abvPercent}
                            compact
                        />

                        <button
                            type="button"
                            onClick={() => handleOpenDrink(drink.id)}
                            disabled={loadingDrinkId === drink.id}
                            className="w-full py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            {loadingDrinkId === drink.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4 stroke-[2.5]" />
                            )}
                            Drink / Customize Dose
                        </button>
                    </div>
                ))}

                {!isLoading && filteredDrinks.length === 0 && (
                    <div className="py-12 text-center text-slate-500">
                        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-medium">No drinks found matching your query.</p>
                    </div>
                )}
            </div>

            <DoseCustomizerModal onSuccessLogged={() => refetch()} />
        </div>
    );
};