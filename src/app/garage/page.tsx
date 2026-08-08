"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Camera, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { OwnershipCard } from "@/components/OwnershipCard";
import GarageDashboard from "@/components/GarageDashboard";

export default function GaragePage() {
  const { status } = useSession();
  const router = useRouter();
  const [savedCars, setSavedCars] = useState<any[]>([]);
  const [selectedVins, setSelectedVins] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [vinInput, setVinInput] = useState("");
  const [mileageInput, setMileageInput] = useState("");
  const [isAddingVin, setIsAddingVin] = useState(false);
  const [isScanningVin, setIsScanningVin] = useState(false);
  const [isScanningOdo, setIsScanningOdo] = useState(false);
  const [vinError, setVinError] = useState("");

  const loadGarage = () => {
    fetch("/api/garage")
      .then(res => res.json())
      .then(data => {
        if (data.cars) setSavedCars(data.cars);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      loadGarage();
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

  const handleDelete = async (vin: string) => {
    if (!confirm("Are you sure you want to remove this car from your garage?")) return;
    try {
      const res = await fetch(`/api/garage?vin=${vin}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedCars(prev => prev.filter(c => c.vin !== vin));
        const newSet = new Set(selectedVins);
        newSet.delete(vin);
        setSelectedVins(newSet);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddVin = async () => {
    setVinError("");
    if (!vinInput || vinInput.length !== 17) {
      setVinError("Please enter a valid 17-character VIN.");
      return;
    }

    setIsAddingVin(true);
    try {
      const res = await fetch("/api/garage/add-vin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vin: vinInput.toUpperCase(), mileage: Number(mileageInput) || 0 })
      });
      const data = await res.json();
      if (!res.ok) {
        setVinError(data.error || "Failed to add vehicle.");
      } else {
        setVinInput("");
        setMileageInput("");
        loadGarage();
      }
    } catch (err) {
      setVinError("An error occurred.");
    } finally {
      setIsAddingVin(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVinError("");
    setIsScanningVin(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        const res = await fetch("/api/scan-vin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64String })
        });
        const data = await res.json();
        
        if (!res.ok) {
          setVinError(data.error || "Failed to scan VIN from image.");
        } else {
          setVinInput(data.vin);
          setVinError(""); // clear any previous errors
        }
        setIsScanningVin(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setVinError("Failed to process image.");
      setIsScanningVin(false);
    }
  };

  const handleOdometerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVinError("");
    setIsScanningOdo(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        const res = await fetch("/api/scan-odometer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64String })
        });
        const data = await res.json();
        
        if (!res.ok) {
          setVinError(data.error || "Failed to scan odometer from image.");
        } else {
          setMileageInput(data.odometer.toString());
          setVinError(""); // clear any previous errors
        }
        setIsScanningOdo(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setVinError("Failed to process image.");
      setIsScanningOdo(false);
    }
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

        {/* Add Personal Vehicle Section */}
        <div className="mb-10 p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-zinc-400 mb-2">Add Personal Vehicle (VIN)</label>
            <div className="relative">
              <input
                type="text"
                value={vinInput}
                onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                placeholder="Enter 17-character VIN"
                maxLength={17}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-lime-500 font-mono"
              />
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                id="vin-camera" 
                onChange={handleImageUpload} 
              />
              <label 
                htmlFor="vin-camera" 
                className="absolute right-2 top-1.5 bottom-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded flex items-center justify-center cursor-pointer transition-colors"
                title="Scan VIN with Camera"
              >
                {isScanningVin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </label>
            </div>
            {vinError && <p className="text-red-400 text-sm mt-2">{vinError}</p>}
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-zinc-400 mb-2">Mileage (km)</label>
            <div className="relative">
              <input
                type="number"
                value={mileageInput}
                onChange={(e) => setMileageInput(e.target.value)}
                placeholder="e.g. 150000"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-lime-500 font-mono"
              />
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                id="odo-camera" 
                onChange={handleOdometerUpload} 
              />
              <label 
                htmlFor="odo-camera" 
                className="absolute right-2 top-1.5 bottom-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded flex items-center justify-center cursor-pointer transition-colors"
                title="Scan Odometer with Camera"
              >
                {isScanningOdo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </label>
            </div>
          </div>
          <button 
            onClick={handleAddVin}
            disabled={isAddingVin || isScanningVin || isScanningOdo}
            className="w-full md:w-auto px-6 py-3 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAddingVin ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Add to Garage
          </button>
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
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors shadow-lg ${isSelected ? 'bg-lime-500 border-lime-500' : 'bg-zinc-900 border-zinc-600 hover:border-lime-500'}`}
                      title={isSelected ? "Deselect for comparison" : "Select for comparison"}
                    >
                      {isSelected && <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </button>
                  </div>
                  <div className={isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100 transition-opacity'}>
                    <OwnershipCard 
                      car={car}
                      onRemove={() => handleDelete(car.vin)}
                    />
                    <div className="mt-4 bg-zinc-900 border-2 border-zinc-800 rounded-2xl px-6 pb-2">
                      <GarageDashboard vehicle={car} />
                    </div>
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
