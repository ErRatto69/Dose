import React, { useState, useEffect, useRef } from 'react';
import { drinksApi } from '@/api/drinks.api';
import type { IngredientSuggestion } from '@/types';
import { Search, Loader2 } from 'lucide-react';

interface GlobalSearchProps {
    value: string;
    onChange: (value: string) => void;
    onSelectSuggestion?: (item: IngredientSuggestion) => void;
    placeholder?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
                                                              value,
                                                              onChange,
                                                              onSelectSuggestion,
                                                              placeholder = 'Search drinks, spirits, or mixers...',
                                                          }) => {
    const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!value || value.trim().length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setIsLoading(true);
                const results = await drinksApi.autocomplete(value.trim());
                setSuggestions(results);
                setIsOpen(results.length > 0);
            } catch (err) {
                console.error('Autocomplete failed:', err);
            } finally {
                setIsLoading(false);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2"/>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-9 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                />
                {isLoading && (
                    <Loader2 className="w-4 h-4 text-amber-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2"/>
                )}
            </div>

            {isOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in-50 duration-150">
                    <div className="p-1.5 space-y-0.5">
                        {suggestions.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    onChange(item.name);
                                    onSelectSuggestion?.(item);
                                    setIsOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-800 flex items-center justify-between text-xs text-slate-200 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">{item.name}</span>
                                    <span className="text-[10px] text-slate-400">({item.category})</span>
                                </div>
                                {item.abv > 0 && (
                                    <span className="font-mono text-amber-400 font-bold">{item.abv}% ABV</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};