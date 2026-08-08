"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, TrendingDown, TrendingUp, AlertTriangle, Car } from 'lucide-react';
import AddFillUpForm from './AddFillUpForm';
import { calculateFuelEconomy } from '@/utils/fuelEconomy';
import { IFuelLog } from '@/models/FuelLog';

interface Vehicle {
  _id: string;
  year: number;
  make: string;
  model: string;
  vin: string;
  image?: string;
  mileage: number;
  score?: number;
}

interface GarageDashboardProps {
  vehicle: Vehicle;
}

export default function GarageDashboard({ vehicle }: GarageDashboardProps) {
  const [logs, setLogs] = useState<IFuelLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [vehicle._id]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/garage/${vehicle._id}/fuel-logs`);
      const data = await res.json();
      if (data.logs) {
        // Logs come sorted by loggedAt DESC from the API
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (logs.length < 2) return null;
    
    // Sort logs ASC for calculation
    const ascLogs = [...logs].sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());
    
    let totalLiters = 0;
    let totalCost = 0;
    let totalDistance = 0;
    
    // To detect efficiency drops, we calculate per-log efficiency
    const efficiencies: number[] = [];
    
    for (let i = 1; i < ascLogs.length; i++) {
      const prev = ascLogs[i - 1];
      const curr = ascLogs[i];
      
      const { distanceDriven, fuelEconomyL100km, costPerKm } = calculateFuelEconomy(curr, prev);
      
      if (distanceDriven > 0 && curr.isFullTank) {
        totalDistance += distanceDriven;
        totalLiters += curr.fuelLiters;
        if (curr.totalCost) totalCost += curr.totalCost;
        efficiencies.push(fuelEconomyL100km);
      }
    }

    if (totalDistance === 0) return null;

    const avgL100km = (totalLiters / totalDistance) * 100;
    const avgCostPerKm = totalCost > 0 ? (totalCost / totalDistance) : null;
    
    let efficiencyDropWarning = false;
    if (efficiencies.length > 1) {
      const latestEfficiency = efficiencies[efficiencies.length - 1];
      // A drop in efficiency means L/100km went UP.
      // E.g. average was 8L/100km, latest is 10L/100km. 
      // Difference is +2, which is 25% worse.
      const previousAverage = efficiencies.slice(0, -1).reduce((a, b) => a + b, 0) / (efficiencies.length - 1);
      if (latestEfficiency > previousAverage * 1.2) {
        efficiencyDropWarning = true;
      }
    }

    return {
      avgL100km,
      totalDistance,
      avgCostPerKm,
      efficiencyDropWarning,
    };
  }, [logs]);

  const handleAddSuccess = (newLog: IFuelLog) => {
    // Insert at beginning (since logs are DESC) and resort just in case
    setLogs((prev) => [newLog, ...prev].sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()));
  };

  const getThemeStyles = (s?: number) => {
    if (s === undefined) return { 
      text: "text-[#00ff00]", 
      bg: "bg-[#00ff00]", 
      hoverBg: "hover:bg-[#00cc00]", 
      shadow: "shadow-[0_0_20px_rgba(0,255,0,0.2)]",
      dropShadow: "drop-shadow-[0_0_15px_rgba(0,255,0,0.3)]" 
    };
    if (s <= 20) return {
      text: "text-green-500", bg: "bg-green-500", hoverBg: "hover:bg-green-600",
      shadow: "shadow-[0_0_20px_rgba(34,197,94,0.2)]", dropShadow: "drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]"
    };
    if (s <= 40) return {
      text: "text-yellow-500", bg: "bg-yellow-500", hoverBg: "hover:bg-yellow-600",
      shadow: "shadow-[0_0_20px_rgba(234,179,8,0.2)]", dropShadow: "drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]"
    };
    if (s <= 60) return {
      text: "text-orange-500", bg: "bg-orange-500", hoverBg: "hover:bg-orange-600",
      shadow: "shadow-[0_0_20px_rgba(249,115,22,0.2)]", dropShadow: "drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]"
    };
    if (s <= 80) return {
      text: "text-red-500", bg: "bg-red-500", hoverBg: "hover:bg-red-600",
      shadow: "shadow-[0_0_20px_rgba(239,68,68,0.2)]", dropShadow: "drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]"
    };
    return {
      text: "text-red-600", bg: "bg-red-600", hoverBg: "hover:bg-red-700",
      shadow: "shadow-[0_0_20px_rgba(220,38,38,0.2)]", dropShadow: "drop-shadow-[0_0_15px_rgba(220,38,38,0.3)]"
    };
  };

  const theme = getThemeStyles(vehicle.score);

  return (
    <div className="bg-zinc-950 min-h-screen text-white p-4 md:p-8">
      {/* Vehicle Header */}
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800">
            {vehicle.image ? (
              <img src={vehicle.image} alt={vehicle.model} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <Car className="text-zinc-500 w-8 h-8" />
            )}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">{vehicle.year} {vehicle.make} {vehicle.model}</h1>
            <p className="text-zinc-400 text-sm">VIN: {vehicle.vin}</p>
          </div>
        </div>
        <button
          onClick={() => setIsAddFormOpen(true)}
          className={`text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors w-full md:w-auto justify-center ${theme.bg} ${theme.hoverBg} ${theme.shadow}`}
        >
          <Plus className="w-5 h-5" />
          Log Fill-up
        </button>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Warning Banner */}
        {stats?.efficiencyDropWarning && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-4">
            <div className="bg-red-500/20 p-2 rounded-lg mt-1">
              <AlertTriangle className="text-red-400 w-5 h-5" />
            </div>
            <div>
              <h3 className="text-red-400 font-bold text-lg mb-1">Efficiency Drop Detected</h3>
              <p className="text-red-400/80 text-sm leading-relaxed">
                Your latest fill-up shows a fuel efficiency drop of over 20% compared to your historical average. This could indicate a need for maintenance such as checking tire pressure, replacing air filters, or checking spark plugs.
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="animate-pulse flex flex-col gap-6">
            <div className="h-40 bg-zinc-900 rounded-3xl border border-zinc-800"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-32 bg-zinc-900 rounded-3xl border border-zinc-800"></div>
              <div className="h-32 bg-zinc-900 rounded-3xl border border-zinc-800"></div>
            </div>
          </div>
        ) : !stats ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
            <TrendingUp className="w-12 h-12 text-zinc-600 mb-4" />
            <h3 className="text-xl font-bold text-zinc-300 mb-2">Not Enough Data</h3>
            <p className="text-zinc-500 max-w-sm mx-auto">
              Log at least two fill-ups to start seeing your real-world fuel economy and cost metrics.
            </p>
          </div>
        ) : (
          <>
            {/* Primary Metric */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingDown className={`w-32 h-32 ${theme.text}`} />
              </div>
              <p className="text-zinc-400 font-medium mb-2 relative z-10">Average Fuel Economy</p>
              <div className="flex items-baseline gap-2 relative z-10">
                <span className={`text-6xl md:text-7xl font-black ${theme.text} ${theme.dropShadow} tracking-tighter`}>
                  {stats.avgL100km.toFixed(1)}
                </span>
                <span className="text-zinc-500 font-bold text-xl">L/100km</span>
              </div>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-colors">
                <p className="text-zinc-500 text-sm font-medium mb-2">Total Distance Tracked</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-white">
                    {stats.totalDistance.toLocaleString()}
                  </span>
                  <span className="text-zinc-500 font-medium mb-1">km</span>
                </div>
              </div>
              
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-colors">
                <p className="text-zinc-500 text-sm font-medium mb-2">Average Cost per KM</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-white">
                    {stats.avgCostPerKm ? `$${stats.avgCostPerKm.toFixed(2)}` : 'N/A'}
                  </span>
                  <span className="text-zinc-500 font-medium mb-1">/km</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <AddFillUpForm
        vehicleId={vehicle._id}
        isOpen={isAddFormOpen}
        onClose={() => setIsAddFormOpen(false)}
        onSuccess={handleAddSuccess}
        score={vehicle.score}
      />
    </div>
  );
}
