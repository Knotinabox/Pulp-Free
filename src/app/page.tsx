"use client";

import React, { useState } from "react";
import Head from "next/head";
import { Filter, Search, SearchX } from "lucide-react";
import { ListingCard, CarListing } from "@/components/ListingCard";

// Fallback initial feed data
const initialListings: CarListing[] = [
  { id: "1", year: 2017, make: "Honda", model: "CR-V", price: 18500, mileage: 72000, location: "Austin, TX", vin: "1HGCRV17XYZ", isLocal: true, score: 30 },
  { id: "2", year: 2016, make: "Mazda", model: "CX-5", price: 15200, mileage: 85000, location: "Dallas, TX", vin: "JM3CX516XYZ", isLocal: false, score: 85 },
  { id: "3", year: 2013, make: "Ford", model: "Focus", price: 7500, mileage: 110000, location: "Houston, TX", vin: "1FAFOCUS13X", isLocal: true, score: 15 },
  { id: "4", year: 2019, make: "Toyota", model: "RAV4", price: 24000, mileage: 45000, location: "San Antonio, TX", vin: "2T3RAV419XY", isLocal: false, score: 75 },
  { id: "5", year: 2021, make: "Subaru", model: "Outback", price: 27000, mileage: 32000, location: "Austin, TX", vin: "4S4OUT21XYZ", isLocal: true, score: 95 },
];

export default function Home() {
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter the listings based on Pulp Filter and Search Query
  const displayedListings = initialListings.filter((listing) => {
    // 1. Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const match = listing.make.toLowerCase().includes(query) || listing.model.toLowerCase().includes(query);
      if (!match) return false;
    }
    
    // 2. Pulp Filter
    if (isFilterActive) {
      if ((listing.score || 0) < 50) return false;
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-950 font-sans selection:bg-lime-500/30 selection:text-lime-200">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 h-28 flex items-center justify-between">
          <div className="flex items-center -ml-4">
            <img 
              src="/Pulp free.png" 
              alt="PulpFree Logo" 
              className="h-24 w-auto object-contain rounded-lg"
            />
          </div>
          
          <button 
            onClick={() => setIsFilterActive(!isFilterActive)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all duration-300 ${
              isFilterActive 
                ? "bg-lime-500 text-zinc-950 shadow-[0_0_20px_rgba(132,204,22,0.4)]" 
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
            }`}
          >
            <Filter className={`w-4 h-4 ${isFilterActive ? "text-zinc-950" : "text-zinc-500"}`} />
            {isFilterActive ? "Pulp Filter: ON" : "Pulp Filter: OFF"}
          </button>
        </div>
      </header>

      {/* Hero Search Section */}
      <section className="bg-zinc-900/30 border-b border-zinc-800/50 py-12">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            Find your next <span className="text-lime-500">reliable</span> ride.
          </h1>
          <p className="text-zinc-400 font-medium text-lg mb-8 max-w-xl mx-auto">
            Search by make or model. Our AI Master Mechanic will evaluate its history and generate a live Lemon-Aid score.
          </p>
          
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-zinc-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-700 rounded-2xl text-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-all shadow-xl"
              placeholder="e.g. Honda CR-V..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Main Feed */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">Local Market</h2>
          <p className="text-zinc-400 font-medium">
            {isFilterActive 
              ? "Showing only trusted and verifiable vehicles in your area." 
              : "Expand a vehicle to trigger a live AI background check."}
          </p>
        </div>

        {displayedListings.length > 0 ? (
          <div className="space-y-6">
            {displayedListings.map((listing) => (
              <div 
                key={listing.id}
                className={`transition-all duration-500 ${
                  isFilterActive && (listing.score || 0) >= 80
                    ? "shadow-[0_0_30px_rgba(132,204,22,0.1)] rounded-xl" 
                    : ""
                }`}
              >
                <ListingCard listing={listing} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
            <SearchX className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No trusted cars found.</h3>
            <p className="text-zinc-400 max-w-md mx-auto">
              We couldn't find any local listings matching "{searchQuery}" that pass the current filter criteria. Try adjusting your search or turning off the Pulp Filter.
            </p>
          </div>
        )}
      </main>

    </div>
  );
}
