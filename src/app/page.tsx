"use client";

import React, { useState, useEffect } from "react";
import Head from "next/head";
import { Filter, Search, SearchX } from "lucide-react";
import { ListingCard, CarListing } from "@/components/ListingCard";

// We no longer use initial mock listings. We fetch live from Marketcheck.

export default function Home() {
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [modelsList, setModelsList] = useState<{Model_Name: string}[]>([]);
  const [zip, setZip] = useState("V8W 1W5"); // Default Victoria full postal code
  const [radiusKm, setRadiusKm] = useState("50");
  const [vehicleType, setVehicleType] = useState("");
  const [budget, setBudget] = useState("");
  
  const [listings, setListings] = useState<CarListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const searchLocalMarket = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const radiusMiles = Math.round(parseInt(radiusKm) * 0.621371);
      const res = await fetch(`/api/listings?zip=${encodeURIComponent(zip)}&radius=${radiusMiles}&type=${encodeURIComponent(vehicleType)}&budget=${encodeURIComponent(budget)}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`);
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setListings(data.listings || []);
      }
    } catch (err) {
      setError("Failed to reach local market database.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (make) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModel("");
      fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${make}?format=json`)
        .then(res => res.json())
        .then(data => {
          if (data && data.Results) {
            setModelsList(data.Results);
          } else {
            setModelsList([]);
          }
        })
        .catch(() => setModelsList([]));
    } else {
      setModelsList([]);
      setModel("");
    }
  }, [make]);

  const topMakes = [
    "Acura", "Alfa Romeo", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet", "Chrysler", 
    "Dodge", "Fiat", "Ford", "Genesis", "GMC", "Honda", "Hyundai", "Infiniti", "Jaguar", 
    "Jeep", "Kia", "Land Rover", "Lexus", "Lincoln", "Maserati", "Mazda", "Mercedes-Benz", 
    "MINI", "Mitsubishi", "Nissan", "Porsche", "Ram", "Subaru", "Tesla", "Toyota", "Volkswagen", "Volvo"
  ];

  // Filter the live listings based on Pulp Filter only (search query is handled by API)
  const displayedListings = listings.filter((listing) => {
    // Pulp Filter
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
            Search by make or model. Our AI Master Mechanic will evaluate its history and generate a live Pulp-Free score.
          </p>
          
          <div className="relative max-w-3xl mx-auto space-y-4">
            {/* Search Bar Row */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 grid grid-cols-2 gap-4">
                <select
                  className="block w-full px-4 py-4 bg-zinc-900 border border-zinc-700 rounded-2xl text-lg text-white focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-all shadow-xl appearance-none"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                >
                  <option value="">Any Make</option>
                  {topMakes.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  className="block w-full px-4 py-4 bg-zinc-900 border border-zinc-700 rounded-2xl text-lg text-white focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-all shadow-xl appearance-none"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={!make || modelsList.length === 0}
                >
                  <option value="">Any Model</option>
                  {modelsList.map((m, idx) => (
                    <option key={idx} value={m.Model_Name}>{m.Model_Name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={searchLocalMarket}
                disabled={isLoading}
                className="px-8 py-4 bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold text-lg rounded-2xl transition-all shadow-[0_0_20px_rgba(132,204,22,0.3)] disabled:opacity-50"
              >
                {isLoading ? "Searching..." : "Search Market"}
              </button>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <select
                className="block w-full px-4 py-3.5 bg-zinc-900 border border-zinc-700 rounded-2xl text-sm md:text-base text-white focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-all shadow-xl appearance-none"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
              >
                <option value="">Any Type</option>
                <option value="suv">SUV</option>
                <option value="sedan">Sedan</option>
                <option value="pickup">Truck</option>
                <option value="hatchback">Hatchback</option>
                <option value="coupe">Coupe</option>
                <option value="minivan">Minivan</option>
              </select>
              <select
                className="block w-full px-4 py-3.5 bg-zinc-900 border border-zinc-700 rounded-2xl text-sm md:text-base text-white focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-all shadow-xl appearance-none"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              >
                <option value="">Any Budget</option>
                <option value="10000">Under $10k</option>
                <option value="15000">Under $15k</option>
                <option value="25000">Under $25k</option>
                <option value="40000">Under $40k</option>
                <option value="60000">Under $60k</option>
              </select>
              <input
                type="text"
                className="block w-full px-4 py-3.5 bg-zinc-900 border border-zinc-700 rounded-2xl text-sm md:text-base text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-all shadow-xl text-center"
                placeholder="Postal Code"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchLocalMarket()}
              />
              <select
                className="block w-full px-4 py-3.5 bg-zinc-900 border border-zinc-700 rounded-2xl text-sm md:text-base text-white focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-all shadow-xl appearance-none text-center"
                value={radiusKm}
                onChange={(e) => setRadiusKm(e.target.value)}
              >
                <option value="50">50 Km</option>
                <option value="100">100 Km</option>
                <option value="160">160 Km</option>
                <option value="250">250 Km</option>
              </select>
            </div>
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

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center font-medium">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
            <div className="w-12 h-12 border-4 border-lime-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-xl font-bold text-white mb-2">Scanning Dealerships...</h3>
            <p className="text-zinc-400">Fetching live inventory within {radiusKm} kilometers of {zip}.</p>
          </div>
        ) : displayedListings.length > 0 ? (
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
            <h3 className="text-xl font-bold text-white mb-2">
              {listings.length === 0 ? "No local listings found." : "No trusted cars found."}
            </h3>
            <p className="text-zinc-400 max-w-md mx-auto">
              {listings.length === 0 
                ? `We couldn't find any inventory near ${zip}. Try increasing the search radius.`
                : `No local listings matching your search pass the current filter criteria. Try turning off the Pulp Filter.`}
            </p>
          </div>
        )}
      </main>

    </div>
  );
}
