"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, AlertTriangle, ShieldAlert, ChevronDown, ChevronUp, Car, MapPin, Loader2, Anchor, ExternalLink } from "lucide-react";
import { decodeVIN, VINData } from "@/utils/nhtsa";

export interface LemonRecord {
  score: number; // 0-100
  defect: string;
  advice: string;
  has_deep_dive?: boolean;
  deep_dive_maintenance?: string;
  deep_dive_recalls?: string;
  deep_dive_resale?: string;
  deep_dive_competitors?: string;
}

export interface CarListing {
  id: string;
  year: number;
  make: string;
  model: string;
  price: number;
  mileage: number;
  location: string;
  vin: string;
  isLocal: boolean;
  score?: number; // Pre-fetched mock score for feed functionality
  url?: string;
}

interface ListingCardProps {
  listing: CarListing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Data States
  const [vinData, setVinData] = useState<VINData | null>(null);
  const [isLoadingVin, setIsLoadingVin] = useState(false);
  const [hasFetchedVin, setHasFetchedVin] = useState(false);
  
  const [aiRecord, setAiRecord] = useState<LemonRecord | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [hasFetchedAi, setHasFetchedAi] = useState(false);
  
  const [isUnlockingDeepDive, setIsUnlockingDeepDive] = useState(false);

  // We use the AI record if generated, otherwise fallback to the pre-fetched cached score from the feed (if it exists)
  const activeScore = aiRecord ? aiRecord.score : listing.score;

  const getScoreConfig = (score: number | undefined) => {
    if (score === undefined) {
      return {
        color: "text-zinc-400",
        bg: "bg-zinc-800/50",
        border: "border-zinc-700",
        icon: <ShieldAlert className="w-5 h-5 text-zinc-400" />,
        label: "AI Check Pending",
      };
    }
    if (score >= 80) {
      return {
        color: "text-lime-500",
        bg: "bg-lime-500/10",
        border: "border-lime-500/20",
        icon: <ShieldCheck className="w-5 h-5 text-lime-500" />,
        label: `Pulp-Free: ${score}/100`,
      };
    } else if (score >= 50) {
      return {
        color: "text-yellow-500",
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/20",
        icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
        label: `Pulp-Free: ${score}/100`,
      };
    } else {
      return {
        color: "text-red-500",
        bg: "bg-red-500/10",
        border: "border-red-500/20",
        icon: <ShieldAlert className="w-5 h-5 text-red-500" />,
        label: `Pulp-Free: ${score}/100`,
      };
    }
  };

  const config = getScoreConfig(activeScore);

  useEffect(() => {
    if (isExpanded && !hasFetchedVin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasFetchedVin(true);
      setIsLoadingVin(true);
      decodeVIN(listing.vin).then(data => {
        setVinData(data);
        setIsLoadingVin(false);
      });
    }
  }, [isExpanded, hasFetchedVin, listing.vin]);

  useEffect(() => {
    if (isExpanded && hasFetchedVin && !isLoadingVin && !hasFetchedAi) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasFetchedAi(true);
      setIsLoadingAi(true);
      const engineParam = vinData?.engineType ? `&engine=${encodeURIComponent(vinData.engineType)}` : '';
      fetch(`/api/lemon-score?year=${listing.year}&make=${listing.make}&model=${listing.model}${engineParam}`)
        .then(res => res.json())
        .then(data => {
          if (data.score !== undefined) {
            setAiRecord(data);
          } else {
            setAiRecord({ score: listing.score ?? 50, defect: "Error generating report.", advice: data.error || "Please try again." });
          }
        })
        .catch(() => {
          setAiRecord({ score: listing.score ?? 50, defect: "API Request Failed.", advice: "Ensure you have an active internet connection." });
        })
        .finally(() => setIsLoadingAi(false));
    }
  }, [isExpanded, hasFetchedVin, isLoadingVin, hasFetchedAi, vinData, listing]);

  const handleUnlockDeepDive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUnlockingDeepDive(true);
    try {
      const engineParam = vinData?.engineType ? `&engine=${encodeURIComponent(vinData.engineType)}` : '';
      const res = await fetch(`/api/lemon-score-deep?year=${listing.year}&make=${listing.make}&model=${listing.model}${engineParam}`);
      const data = await res.json();
      if (res.ok) {
        setAiRecord(data);
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Failed to unlock deep dive.");
    } finally {
      setIsUnlockingDeepDive(false);
    }
  };

  return (
    <div className={`w-full rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden transition-all duration-300 hover:border-zinc-700 ${isExpanded ? "ring-1 ring-zinc-700 shadow-xl shadow-black/50" : ""}`}>
      {/* Top Main Section */}
      <div className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        
        {/* Car Info */}
        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-zinc-100 tracking-tight">
              {listing.year} {listing.make} {listing.model}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${config.bg} ${config.color} border ${config.border}`}>
              {config.icon}
              <span className="ml-1.5">{config.label}</span>
            </span>
            {listing.isLocal && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Anchor className="w-3.5 h-3.5 mr-1" />
                Island Car
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400 font-medium mt-2">
            <div className="flex items-center gap-1.5">
              <Car className="w-4 h-4 text-zinc-500" />
              {Math.round(listing.mileage * 1.60934).toLocaleString()} km
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-zinc-500" />
              {listing.location}
            </div>
            <div className="text-zinc-500 flex items-center before:content-['•'] before:mr-2">VIN: {listing.vin}</div>
          </div>
        </div>

        {/* Price & Action */}
        <div className="flex items-center justify-between w-full md:w-auto gap-6 md:gap-4">
          <div className="text-right">
            <div className="text-2xl font-black text-white tracking-tight">
              ${listing.price.toLocaleString()}
            </div>
          </div>
          <button 
            className="p-2 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-100"
            aria-label="Toggle details"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expandable Report */}
      {isExpanded && (
        <div className={`border-t border-zinc-800 p-5 ${config.bg} transition-all duration-300`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${config.color}`}>
              {config.icon} AI Pulp-Free Report
            </h4>
            {listing.url && (
              <a 
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-lime-500 hover:bg-lime-400 text-black text-xs font-bold uppercase tracking-wider rounded-lg transition-colors inline-flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                View Listing <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mb-1.5">Known Quirks & Defects</p>
              {isLoadingAi ? (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                   <Loader2 className="w-4 h-4 animate-spin text-lime-500" /> AI evaluating history...
                </div>
              ) : (
                <p className="text-zinc-200 text-sm font-medium leading-relaxed">{aiRecord?.defect || "No specific defects generated."}</p>
              )}
            </div>
            <div>
              <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mb-1.5">Master Mechanic Advice</p>
              {isLoadingAi ? (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Loader2 className="w-4 h-4 animate-spin text-lime-500" /> Writing advice...
                </div>
              ) : (
                <p className="text-zinc-200 text-sm font-medium leading-relaxed">{aiRecord?.advice || "No advice generated."}</p>
              )}
            </div>
          </div>

          {/* VIN API DATA */}
          <div className="mt-6 pt-4 border-t border-zinc-800/50">
            <h4 className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mb-3">NHTSA Decoder Data</h4>
            {isLoadingVin ? (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 className="w-4 h-4 animate-spin text-lime-500" /> Fetching factory specs...
              </div>
            ) : vinData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                  <span className="block text-zinc-500 text-[10px] uppercase font-bold mb-1">Engine Specs</span>
                  <span className="text-zinc-200 font-medium">{vinData.engineType}</span>
                </div>
                <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                  <span className="block text-zinc-500 text-[10px] uppercase font-bold mb-1">Assembly Plant</span>
                  <span className="text-zinc-200 font-medium">{vinData.plant}</span>
                </div>
              </div>
            ) : (
              <div className="text-zinc-500 text-sm">No VIN data available.</div>
            )}
          </div>

          {/* DEEP DIVE SECTION */}
          {!isLoadingAi && aiRecord && (
            <div className="mt-6 pt-6 border-t border-zinc-800/50">
              {aiRecord.has_deep_dive ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                    <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-400">Premium Deep Dive Report</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                      <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Maintenance & Costs</p>
                      <p className="text-zinc-200 text-sm font-medium leading-relaxed">{aiRecord.deep_dive_maintenance}</p>
                    </div>
                    
                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                      <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Recalls & TSBs</p>
                      <p className="text-zinc-200 text-sm font-medium leading-relaxed">{aiRecord.deep_dive_recalls}</p>
                    </div>

                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                      <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Resale Value Curve</p>
                      <p className="text-zinc-200 text-sm font-medium leading-relaxed">{aiRecord.deep_dive_resale}</p>
                    </div>

                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                      <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Competitor Alternatives</p>
                      <p className="text-zinc-200 text-sm font-medium leading-relaxed">{aiRecord.deep_dive_competitors}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-b from-indigo-950/20 to-transparent rounded-xl border border-indigo-900/30">
                  <h4 className="text-indigo-400 font-bold mb-2">Want the full picture?</h4>
                  <p className="text-zinc-400 text-sm mb-4 text-center max-w-md">Unlock the Master Mechanic Deep Dive to reveal detailed maintenance costs, recalls, resale value, and competitor alternatives.</p>
                  <button 
                    onClick={handleUnlockDeepDive}
                    disabled={isUnlockingDeepDive}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-full transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                  >
                    {isUnlockingDeepDive ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Unlocking...</>
                    ) : (
                      <>Unlock Deep Dive ($4.99)</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
