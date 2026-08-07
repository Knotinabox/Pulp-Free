"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ListingCard } from "@/components/ListingCard";

export default function GaragePage() {
  const { status } = useSession();
  const router = useRouter();
  const [savedCars, setSavedCars] = useState<any[]>([]);
  const [selectedVins, setSelectedVins] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetch("/api/garage")
        .then(res => res.json())
        .then(data => {
          if (data.cars) setSavedCars(data.cars);
        })
        .finally(() => setIsLoading(false));
    }
  }, [status, router]);

  const toggleSelection = (vin: string) => {
    const newSet = new Set(selectedVins);
    if (newSet.has(vin)) {
      newSet.delete(vin);
    } else {
      if (newSet.size >= 4) {
        alert("You can only compare up to 4 cars at a time.");
        return;
      }
      newSet.add(vin);
    }
    setSelectedVins(newSet);
  };

  const handleCompare = () => {
    if (selectedVins.size < 2) return;
    const vinsParam = Array.from(selectedVins).join(",");
    router.push(`/compare?vins=${vinsParam}`);
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 pb-32">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">My Premium Garage</h1>
            <p className="text-zinc-400 mt-1">Select 2 or more cars to compare side-by-side.</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors font-bold text-sm">
            Back to Search
          </Link>
        </div>

        {savedCars.length === 0 ? (
          <div className="text-center py-20 border border-zinc-800 rounded-2xl bg-zinc-900/30">
            <h2 className="text-xl font-bold text-zinc-300 mb-2">Your garage is empty</h2>
            <p className="text-zinc-500 mb-6">Start browsing and save cars to build your garage.</p>
            <Link href="/" className="px-6 py-3 bg-lime-500 text-black font-bold rounded-lg hover:bg-lime-400 transition-colors">
              Find Cars
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {savedCars.map((car) => {
              const isSelected = selectedVins.has(car.vin);
              return (
                <div key={car.vin} className={`relative rounded-xl border-2 transition-all ${isSelected ? 'border-lime-500 shadow-[0_0_20px_rgba(132,204,22,0.2)]' : 'border-transparent'}`}>
                  <div className="absolute top-4 left-4 z-10">
                    <button
                      onClick={() => toggleSelection(car.vin)}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-lime-500 border-lime-500' : 'bg-zinc-900 border-zinc-600 hover:border-lime-500'}`}
                    >
                      {isSelected && <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </button>
                  </div>
                  <div className={isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100 transition-opacity'}>
                    <ListingCard listing={{
                      id: car._id,
                      year: car.year,
                      make: car.make,
                      model: car.model,
                      price: car.price,
                      mileage: car.mileage,
                      location: car.location,
                      vin: car.vin,
                      image: car.image,
                      url: car.url,
                      score: car.score,
                      isLocal: false
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Compare Action Bar */}
      {selectedVins.size > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-zinc-900 border-t border-zinc-800 p-4 shadow-2xl z-50">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="text-zinc-300 font-medium">
              <span className="text-white font-bold">{selectedVins.size}</span> car{selectedVins.size !== 1 && 's'} selected
            </div>
            <button
              onClick={handleCompare}
              disabled={selectedVins.size < 2}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
                selectedVins.size >= 2
                  ? "bg-lime-500 text-black hover:bg-lime-400 shadow-[0_0_15px_rgba(132,204,22,0.4)]"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              Compare Selected <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
