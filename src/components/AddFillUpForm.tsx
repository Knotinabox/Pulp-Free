"use client";

import React, { useState } from 'react';
import { X, Check, Camera, Loader2 } from 'lucide-react';

interface AddFillUpFormProps {
  vehicleId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newLog: any) => void;
  score?: number;
}

export default function AddFillUpForm({ vehicleId, isOpen, onClose, onSuccess, score }: AddFillUpFormProps) {
  const [odometer, setOdometer] = useState<string>('');
  const [fuelLiters, setFuelLiters] = useState<string>('');
  const [totalCost, setTotalCost] = useState<string>('');
  const [isFullTank, setIsFullTank] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isScanningOdo, setIsScanningOdo] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getThemeStyles = (s?: number) => {
    if (s === undefined) return { bg: "bg-[#00ff00]", hoverBg: "hover:bg-[#00cc00]", ring: "focus:ring-[#00ff00]" };
    if (s <= 20) return { bg: "bg-green-500", hoverBg: "hover:bg-green-600", ring: "focus:ring-green-500" };
    if (s <= 40) return { bg: "bg-yellow-500", hoverBg: "hover:bg-yellow-600", ring: "focus:ring-yellow-500" };
    if (s <= 60) return { bg: "bg-orange-500", hoverBg: "hover:bg-orange-600", ring: "focus:ring-orange-500" };
    if (s <= 80) return { bg: "bg-red-500", hoverBg: "hover:bg-red-600", ring: "focus:ring-red-500" };
    return { bg: "bg-red-600", hoverBg: "hover:bg-red-700", ring: "focus:ring-red-600" };
  };

  const theme = getThemeStyles(score);

  const handleOdometerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
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
          setError(data.error || "Failed to scan odometer from image.");
        } else {
          setOdometer(data.odometer.toString());
          setError(null); // clear any previous errors
        }
        setIsScanningOdo(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Failed to process image.");
      setIsScanningOdo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/garage/${vehicleId}/fuel-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          odometer: Number(odometer),
          fuelLiters: Number(fuelLiters),
          totalCost: totalCost ? Number(totalCost) : undefined,
          isFullTank,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add fill-up');
      }

      onSuccess(data.log);
      // Reset form
      setOdometer('');
      setFuelLiters('');
      setTotalCost('');
      setIsFullTank(true);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Log Fill-up</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Odometer (km)</label>
            <div className="relative">
              <input
                type="number"
                step="1"
                required
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 ${theme.ring} focus:border-transparent transition-all pr-12`}
                placeholder="e.g. 50120"
              />
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                id="fillup-odo-camera" 
                onChange={handleOdometerUpload} 
              />
              <label 
                htmlFor="fillup-odo-camera" 
                className="absolute right-2 top-2 bottom-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded flex items-center justify-center cursor-pointer transition-colors"
                title="Scan Odometer with Camera"
              >
                {isScanningOdo ? <Loader2 className="w-5 h-5 animate-spin text-zinc-400" /> : <Camera className="w-5 h-5 text-zinc-400" />}
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Fuel (Liters)</label>
              <input
                type="number"
                step="0.01"
                required
                value={fuelLiters}
                onChange={(e) => setFuelLiters(e.target.value)}
                className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 ${theme.ring} focus:border-transparent transition-all`}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Total Cost ($)</label>
              <input
                type="number"
                step="0.01"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 ${theme.ring} focus:border-transparent transition-all`}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
            <div>
              <p className="text-white font-medium">Full Tank</p>
              <p className="text-xs text-zinc-500">Was it filled to the top?</p>
            </div>
            <button
              type="button"
              onClick={() => setIsFullTank(!isFullTank)}
              className={`w-12 h-6 rounded-full transition-colors relative ${isFullTank ? theme.bg : 'bg-zinc-700'}`}
            >
              <span 
                className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isFullTank ? 'translate-x-6' : 'translate-x-0'}`} 
              />
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isScanningOdo}
            className={`w-full ${theme.bg} text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 ${theme.hoverBg} transition-colors disabled:opacity-50 mt-6`}
          >
            {isSubmitting ? (
              <span className="animate-pulse">Saving...</span>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Save Log
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
