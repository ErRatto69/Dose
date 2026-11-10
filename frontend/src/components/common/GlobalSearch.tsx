import React, { useState, useEffect, useRef } from 'react';
import { drinksApi } from '@/api/drinks.api';
import type { IngredientSuggestion } from '@/types';
import { Search, Loader2, X } from 'lucide-react';

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
    placeholder = 'Search cocktails, spirits, or glassware…',
}) => {
    const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const trimmed = value.trim();
        if (trimmed.length < 2) {
            return;
        }

        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                setIsLoading(true);
                const results = await drinksApi.autocomplete(trimmed);
                if (!cancelled) {
                    setSuggestions(results);
                    setIsOpen(results.length > 0);
                }
            } catch (err) {
                console.error('Autocomplete failed:', err);
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }, 250);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleInputChange = (nextVal: string) => {
        onChange(nextVal);
        if (nextVal.trim().length < 2) {
            setSuggestions([]);
            setIsOpen(false);
        }
    };

    const showDropdown = isOpen && value.trim().length >= 2 && suggestions.length > 0;

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative">
                <Search
                    className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                />
                <input
                    type="search"
                    role="combobox"
                    aria-expanded={showDropdown}
                    aria-autocomplete="list"
                    aria-label={placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    enterKeyHint="search"
                    value={value}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => value.trim().length >= 2 && suggestions.length > 0 && setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full min-h-[44px] pl-10 pr-10 py-2.5 rounded-xl text-sm dose-input"
                />
                {isLoading ? (
                    <Loader2
                        className="w-4 h-4 text-red-500 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        aria-hidden="true"
                    />
                ) : (
                    value && (
                        <button
                            type="button"
                            onClick={() => {
                                handleInputChange('');
                            }}
                            aria-label="Clear search query"
                            className="w-9 h-9 rounded-lg text-zinc-400 hover:text-white flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 dose-press"
                        >
                            <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                    )
                )}
            </div>

            {showDropdown && (
                <div
                    role="listbox"
                    className="absolute top-full left-0 right-0 mt-1.5 bg-[#111114] border border-white/12 rounded-2xl shadow-2xl overflow-hidden z-50 dose-dialog-enter"
                >
                    <div className="p-1.5 space-y-0.5 max-h-72 overflow-y-auto overscroll-contain">
                        {suggestions.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                role="option"
                                aria-selected={false}
                                onClick={() => {
                                    onChange(item.name);
                                    onSelectSuggestion?.(item);
                                    setIsOpen(false);
                                }}
                                className="w-full min-h-[40px] px-3 py-2 text-left rounded-xl hover:bg-white/[0.06] flex items-center justify-between gap-2 text-xs text-zinc-200 transition-colors"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-bold text-white truncate">{item.name}</span>
                                    <span className="text-[11px] text-zinc-400 shrink-0">
                                        {item.subCategory}
                                    </span>
                                </div>
                                {item.abv > 0 && (
                                    <span className="tabular-nums text-red-400 font-bold shrink-0">
                                        {item.abv}% ABV
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
