import React, { useState, useEffect, useRef } from 'react';

const LocationSearch = ({ onLocationSelect, placeholder }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef(null);

    const handleSearch = (e) => {
        const value = e.target.value;
        setQuery(value);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (value.length < 3) {
            setResults([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&countrycodes=in&limit=5`);
                const data = await response.json();
                setResults(data);
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setSearching(false);
            }
        }, 800);
    };

    const handleSelect = (item) => {
        setQuery(item.display_name.split(',')[0]); // Shorten display
        setResults([]);
        onLocationSelect({
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            address: item.display_name
        });
    };

    return (
        <div className="relative mb-3 z-[500]">
            <div className="relative">
                <input
                    type="text"
                    className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all shadow-sm"
                    placeholder={placeholder || "Search location..."}
                    value={query}
                    onChange={handleSearch}
                />
                <svg className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                {searching && (
                    <div className="absolute right-3 top-3.5 animate-spin w-4 h-4 border-2 border-gray-300 border-t-black rounded-full"></div>
                )}
            </div>

            {results.length > 0 && (
                <ul className="absolute top-full left-0 right-0 bg-white mt-1 rounded-xl shadow-xl overflow-hidden border border-gray-100 max-h-60 overflow-y-auto">
                    {results.map((item) => (
                        <li 
                            key={item.place_id}
                            onClick={() => handleSelect(item)}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 text-sm flex items-start gap-2"
                        >
                            <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span className="text-gray-700 line-clamp-2">{item.display_name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LocationSearch;
