// File: src/components/DateFilter.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, X, ChevronDown, Clock, TrendingUp, Filter, ChevronRight, Info } from 'lucide-react';

interface DateFilterProps {
    onFilterChange: (filter: { startDate: string; endDate: string; preset: string | null }) => void;
    initialFilter?: { startDate: string; endDate: string; preset: string | null };
}

const DateFilter: React.FC<DateFilterProps> = ({ 
    onFilterChange, 
    initialFilter = { startDate: '', endDate: '', preset: 'this_month' } 
}) => {
    const [filter, setFilter] = useState(initialFilter);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset');

    const handleChange = (newFilter: Partial<{ startDate: string; endDate: string; preset: string | null }>) => {
        const updatedFilter = { ...filter, ...newFilter };
        setFilter(updatedFilter);
    };

    useEffect(() => {
        if (filter.preset || (filter.startDate && filter.endDate)) {
            onFilterChange(filter);
        }
    }, [filter, onFilterChange]);

    const handleReset = () => {
        const resetFilter = { startDate: '', endDate: '', preset: 'this_month' };
        setFilter(resetFilter);
        setActiveTab('preset');
    };

    const handlePresetSelect = (preset: string) => {
        if (preset === 'custom') {
            handleChange({ preset: null, startDate: '', endDate: '' });
            setActiveTab('custom');
        } else {
            handleChange({ preset, startDate: '', endDate: '' });
            setIsDropdownOpen(false);
        }
    };

    const isFilterActive = () => {
        return (filter.startDate || filter.endDate || (filter.preset && filter.preset !== 'this_month'));
    };

    const getPresetLabel = () => {
        if (filter.preset === 'today') return 'Hari ini';
        if (filter.preset === 'this_week') return 'Minggu ini';
        if (filter.preset === 'last_week') return 'Minggu lalu';
        if (filter.preset === 'this_month') return 'Bulan ini';
        if (filter.preset === 'last_month') return 'Bulan lalu';
        if (filter.preset === 'this_quarter') return 'Kuartal ini';
        if (filter.preset === 'last_quarter') return 'Kuartal lalu';
        if (filter.preset === 'this_year') return 'Tahun ini';
        if (filter.preset === 'last_year') return 'Tahun lalu';
        if (filter.preset === 'custom' || (!filter.preset && (filter.startDate || filter.endDate))) {
            return 'Rentang kustom';
        }
        return 'Pilih periode';
    };

    const getActivePeriodDisplay = () => {
        if (filter.preset === 'this_month') {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            return {
                label: 'Bulan ini',
                dateRange: `${firstDay.toLocaleDateString('id-ID')} → ${lastDay.toLocaleDateString('id-ID')}`
            };
        } else if (filter.preset === 'today') {
            const today = new Date();
            return {
                label: 'Hari ini',
                dateRange: today.toLocaleDateString('id-ID')
            };
        } else if (filter.preset === 'this_week') {
            const today = new Date();
            const dayOfWeek = today.getDay();
            const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const monday = new Date(today.setDate(diff));
            const sunday = new Date(today.setDate(diff + 6));
            
            return {
                label: 'Minggu ini',
                dateRange: `${monday.toLocaleDateString('id-ID')} → ${sunday.toLocaleDateString('id-ID')}`
            };
        } else if (filter.preset === 'this_year') {
            const today = new Date();
            const year = today.getFullYear();
            
            return {
                label: 'Tahun ini',
                dateRange: `1 Jan ${year} → 31 Des ${year}`
            };
        } else if (filter.startDate && filter.endDate) {
            return {
                label: 'Rentang kustom',
                dateRange: `${new Date(filter.startDate).toLocaleDateString('id-ID')} → ${new Date(filter.endDate).toLocaleDateString('id-ID')}`
            };
        } else {
            return {
                label: getPresetLabel(),
                dateRange: ''
            };
        }
    };


    const presetOptions = [
        { value: 'today', label: 'Hari ini', icon: <Clock size={14} />, desc: 'Data hari ini' },
        { value: 'this_week', label: 'Minggu ini', icon: <Calendar size={14} />, desc: 'Senin - Minggu' },
        { value: 'last_week', label: 'Minggu lalu', icon: <Calendar size={14} />, desc: '7 hari terakhir' },
        { value: 'this_month', label: 'Bulan ini', icon: <Calendar size={14} />, desc: 'Bulan berjalan' },
        { value: 'last_month', label: 'Bulan lalu', icon: <Calendar size={14} />, desc: 'Bulan sebelumnya' },
        { value: 'this_quarter', label: 'Kuartal ini', icon: <TrendingUp size={14} />, desc: 'Q1/Q2/Q3/Q4' },
        { value: 'last_quarter', label: 'Kuartal lalu', icon: <TrendingUp size={14} />, desc: 'Kuartal sebelumnya' },
        { value: 'this_year', label: 'Tahun ini', icon: <Calendar size={14} />, desc: 'Tahun berjalan' },
        { value: 'last_year', label: 'Tahun lalu', icon: <Calendar size={14} />, desc: 'Tahun sebelumnya' },
    ];

    const activePeriod = getActivePeriodDisplay();
    const showActivePeriod = filter.preset === 'this_month' || filter.preset === 'this_year';

    return (
        <div className="bg-white rounded-lg shadow-md p-3 mb-4 border border-gray-200">
            {/* Filter Controls */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500 rounded-md shadow-sm">
                        <Filter className="text-white" size={14} />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">Filter Periode</h3>
                </div>
                {isFilterActive() && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Info size={12} />
                        <span>Filter aktif</span>
                    </div>
                )}
            </div>
            
            {/* Quick Preset Buttons */}
            
            {/* Main Dropdown */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 flex items-center justify-between hover:border-gray-400 transition-all text-sm"
                >
                    <span className="flex items-center gap-2">
                        {filter.preset && presetOptions.find(o => o.value === filter.preset)?.icon}
                        <span>{getPresetLabel()}</span>
                    </span>
                    <ChevronDown size={16} className={`transition-transform text-gray-500 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
                        <div className="flex border-b border-gray-200 bg-gray-50">
                            <button
                                className={`flex-1 py-2 text-xs font-semibold transition-all ${
                                    activeTab === 'preset' 
                                        ? 'text-blue-600 border-b-2 border-blue-600 bg-white' 
                                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                                onClick={() => setActiveTab('preset')}
                            >
                                Preset
                            </button>
                            <button
                                className={`flex-1 py-2 text-xs font-semibold transition-all ${
                                    activeTab === 'custom' 
                                        ? 'text-blue-600 border-b-2 border-blue-600 bg-white' 
                                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                                onClick={() => setActiveTab('custom')}
                            >
                                Kustom
                            </button>
                        </div>
                        
                        {activeTab === 'preset' ? (
                            <div className="py-1 max-h-64 overflow-y-auto">
                                {presetOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        className={`w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-3 transition-all ${
                                            filter.preset === option.value ? 'bg-blue-100' : ''
                                        }`}
                                        onClick={() => handlePresetSelect(option.value)}
                                    >
                                        <div className={`p-1 rounded ${filter.preset === option.value ? 'bg-blue-200' : 'bg-gray-100'}`}>
                                            {option.icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className={`text-sm font-medium ${filter.preset === option.value ? 'text-blue-700' : 'text-gray-900'}`}>
                                                {option.label}
                                            </div>
                                            <div className="text-xs text-gray-600">{option.desc}</div>
                                        </div>
                                        {filter.preset === option.value && (
                                            <ChevronRight size={16} className="text-blue-600" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-3 bg-gray-50">
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Dari Tanggal
                                        </label>
                                        <input
                                            type="date"
                                            value={filter.startDate}
                                            onChange={(e) => handleChange({ startDate: e.target.value, preset: null })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Sampai Tanggal
                                        </label>
                                        <input
                                            type="date"
                                            value={filter.endDate}
                                            onChange={(e) => handleChange({ endDate: e.target.value, preset: null })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            min={filter.startDate}
                                        />
                                    </div>
                                    <button
                                        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all font-medium text-sm"
                                        onClick={() => setIsDropdownOpen(false)}
                                    >
                                        Terapkan Filter
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Active Period Display - Integrated with dropdown for "Bulan ini" and "Tahun ini" */}
                {showActivePeriod && !isDropdownOpen && (
                    <div className="mt-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-2 border border-blue-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1 bg-blue-500 rounded-md shadow-sm">
                                    <Calendar className="text-white" size={12} />
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600 font-medium">Periode Aktif</div>
                                    <div className="text-xs font-bold text-blue-700">
                                        {activePeriod.label}
                                    </div>
                                    {activePeriod.dateRange && (
                                        <div className="text-xs text-gray-600 mt-0.5">
                                            {activePeriod.dateRange}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {isFilterActive() && (
                                <button 
                                    onClick={handleReset} 
                                    className="text-xs font-medium text-red-600 hover:text-red-700 transition-all flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50"
                                >
                                    <X size={10} />
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DateFilter;