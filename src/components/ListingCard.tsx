"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, AlertTriangle, ShieldAlert, ChevronDown, ChevronUp, Car, MapPin, Loader2, Anchor, ExternalLink, Heart, Camera, Trash2, Wrench, TrendingUp, Users, Leaf } from "lucide-react";
import { decodeVIN, VINData, fetchRecalls, fetchTSBs } from "@/utils/nhtsa";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ScoreGauge from "./ScoreGauge";

export interface LemonRecord {
  score?: number;
  defect?: string;
  advice?: string;
  has_deep_dive?: boolean;
  deep_dive_test_drive?: string;
  deep_dive_maintenance?: string;
  deep_dive_recalls?: string;
  deep_dive_resale?: string;
  deep_dive_competitors?: string;
  deep_dive_efficiency?: string;
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
  image?: string;
}

interface ListingCardProps {
  listing: CarListing;
  initialIsSaved?: boolean;
  onRemove?: () => void;
}

function ExpandableText({ text, maxLength = 150 }: { text: string; maxLength?: number }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!text) return <span>No summary available.</span>;
  if (text.length <= maxLength) return <span>{text}</span>;
  
  return (
    <span>
      {expanded ? text : `${text.substring(0, maxLength).trim()}...`}
      <button 
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="ml-2 text-[10px] font-black uppercase tracking-wider hover:text-white underline decoration-current underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
      >
        {expanded ? "Show less" : "Read more"}
      </button>
    </span>
  );
}
export function ListingCard({ listing, initialIsSaved = false, onRemove }: ListingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [localImage, setLocalImage] = useState(listing.image);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalImage(listing.image);
  }, [listing.image]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSaved(initialIsSaved);
  }, [initialIsSaved]);
  
  const { data: session } = useSession();
  const router = useRouter();
  
  // Data States
  const [vinData, setVinData] = useState<VINData | null>(null);
  const [hasFetchedVin, setHasFetchedVin] = useState(false);
  const [isLoadingVin, setIsLoadingVin] = useState(false);
  
  const [recalls, setRecalls] = useState<any[]>([]);
  const [tsbs, setTsbs] = useState<any[]>([]);
  const [isLoadingRecalls, setIsLoadingRecalls] = useState(false);
  
  const [aiRecord, setAiRecord] = useState<LemonRecord | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [hasFetchedAi, setHasFetchedAi] = useState(false);
  
  const [isUnlockingDeepDive, setIsUnlockingDeepDive] = useState(false);

  useEffect(() => {
    if (session) {
      const pendingSave = sessionStorage.getItem('pendingSaveListing');
      if (pendingSave) {
        try {
          const parsed = JSON.parse(pendingSave);
          if (parsed.vin === listing.vin) {
            sessionStorage.removeItem('pendingSaveListing');
            fetch("/api/garage", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(parsed)
            }).then(() => setIsSaved(true));
          }
        } catch (e) {
          console.error(e);
        }
      }
      
      const pendingDeepDive = sessionStorage.getItem('pendingDeepDive');
      if (pendingDeepDive === listing.vin) {
        sessionStorage.removeItem('pendingDeepDive');
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsExpanded(true);
        // We set a flag or just call the fetch directly
        setTimeout(() => {
          const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
          handleUnlockDeepDive(fakeEvent, true);
        }, 500);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, listing.vin]);

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
    if (score <= 20) {
      return {
        color: "text-lime-500",
        bg: "bg-lime-500/10",
        border: "border-lime-500/20",
        icon: <ShieldCheck className="w-5 h-5 text-lime-500" />,
        label: `Pulp-Free (${score}/100)`,
      };
    } else if (score <= 40) {
      return {
        bg: "bg-yellow-500/10",
        color: "text-yellow-500",
        border: "border-yellow-500/20",
        icon: <AlertTriangle className="w-4 h-4" />,
        label: `Trace Pulp (${score}/100)`,
      };
    } else if (score <= 60) {
      return {
        bg: "bg-amber-500/10",
        color: "text-amber-500",
        border: "border-amber-500/20",
        icon: <AlertTriangle className="w-4 h-4" />,
        label: `Moderate Pulp (${score}/100)`,
      };
    } else if (score <= 80) {
      return {
        bg: "bg-orange-500/10",
        color: "text-orange-500",
        border: "border-orange-500/20",
        icon: <AlertTriangle className="w-4 h-4" />,
        label: `High Pulp (${score}/100)`,
      };
    } else {
      return {
        color: "text-red-500",
        bg: "bg-red-500/10",
        border: "border-red-500/20",
        icon: <ShieldAlert className="w-5 h-5 text-red-500" />,
        label: `Lemon / Undrivable (${score}/100)`,
      };
    }
  };

  const config = getScoreConfig(activeScore);

  useEffect(() => {
    if (isExpanded && !hasFetchedVin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasFetchedVin(true);
      setIsLoadingVin(true);
      setIsLoadingRecalls(true);
      
      decodeVIN(listing.vin).then(async data => {
        setVinData(data);
        setIsLoadingVin(false);
        
        try {
          const [recallData, tsbData] = await Promise.all([
            fetchRecalls(listing.vin),
            data ? fetchTSBs(data.year, data.make, data.model) : Promise.resolve([])
          ]);
          setRecalls(recallData);
          setTsbs(tsbData);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoadingRecalls(false);
        }
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

  async function handleUnlockDeepDive(e: React.MouseEvent, autoTrigger = false) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!session && !autoTrigger) {
      sessionStorage.setItem('pendingDeepDive', listing.vin);
      router.push("/login");
      return;
    }
    
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

  const currentScore = aiRecord?.score ?? listing.score;

  const toggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) {
      sessionStorage.setItem('pendingSaveListing', JSON.stringify({
        vin: listing.vin,
        year: listing.year,
        make: listing.make,
        model: listing.model,
        price: listing.price,
        mileage: listing.mileage,
        location: listing.location,
        image: listing.image,
        url: listing.url,
        score: currentScore,
      }));
      router.push("/login");
      return;
    }
    
    if (isSaved) {
      await fetch(`/api/garage?vin=${listing.vin}`, { method: "DELETE" });
      setIsSaved(false);
    } else {
      await fetch("/api/garage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vin: listing.vin,
          year: listing.year,
          make: listing.make,
          model: listing.model,
          price: listing.price,
          mileage: listing.mileage,
          location: listing.location,
          image: listing.image,
          url: listing.url,
          score: currentScore,
        })
      });
      setIsSaved(true);
    }
  };
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 800; // Resize to max 800px

          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Export as JPEG with 0.7 quality
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePersonalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const compressedBase64 = await compressImage(file);
      const res = await fetch("/api/garage/update-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vin: listing.vin, imageBase64: compressedBase64 })
      });
      if (res.ok) {
        setLocalImage(compressedBase64);
        setImageError(false);
      } else {
        alert("Failed to upload image.");
      }
    } catch (err) {
      alert("Error compressing or uploading image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  let ctaText = "Go to Dealership";
  let ctaStyle = "bg-zinc-800 text-white hover:bg-zinc-700";

  if (currentScore !== undefined) {
    if (currentScore >= 0 && currentScore <= 40) {
      ctaText = "Go to Dealership";
      ctaStyle = "bg-lime-500 text-black hover:bg-lime-400 shadow-[0_0_15px_rgba(132,204,22,0.4)]";
    } else if (currentScore > 40 && currentScore <= 80) {
      ctaText = "View at Dealership (Review Recalls)";
      ctaStyle = "bg-orange-500 text-black hover:bg-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.4)]";
    } else if (currentScore > 80) {
      ctaText = "View at Dealership (Your Own Risk)";
      ctaStyle = "bg-transparent border border-red-500/50 text-red-500 hover:bg-red-500/10";
    }
  }

  return (
    <div className={`w-full rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden transition-all duration-300 hover:border-zinc-700 ${isExpanded ? "ring-1 ring-zinc-700 shadow-xl shadow-black/50" : ""}`}>
      {/* Top Main Section */}
      <div className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        
        {/* Image Section */}
        <div className="w-full md:w-48 h-32 shrink-0 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900/80 flex flex-col items-center justify-center relative group">
          {localImage && !imageError ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={localImage} 
                alt={`${listing.year} ${listing.make} ${listing.model}`}
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
              />
              {listing.location === "Personal Vehicle" && (
                <div 
                  className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm cursor-pointer z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <label htmlFor={`update-img-${listing.vin}`} className="cursor-pointer flex flex-col items-center text-lime-500 hover:text-lime-400">
                    {isUploadingImage ? <Loader2 className="w-6 h-6 mb-1 animate-spin" /> : <Camera className="w-6 h-6 mb-1" />}
                    <span className="text-[10px] font-bold">Update Photo</span>
                  </label>
                  <input type="file" id={`update-img-${listing.vin}`} accept="image/*" capture="environment" className="hidden" onChange={handlePersonalImageUpload} disabled={isUploadingImage} />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-500 p-2 text-center w-full h-full bg-zinc-900 relative">
              <Car className="w-8 h-8 mb-2 opacity-40 transition-opacity" />
              <span className="text-[10px] font-bold tracking-wider uppercase opacity-40 transition-opacity">PulpFree:<br/>No Image Provided</span>
              
              {listing.location === "Personal Vehicle" && (
                <div 
                  className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm cursor-pointer z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <label htmlFor={`upload-img-${listing.vin}`} className="cursor-pointer flex flex-col items-center text-lime-500 hover:text-lime-400">
                    {isUploadingImage ? <Loader2 className="w-6 h-6 mb-1 animate-spin" /> : <Camera className="w-6 h-6 mb-1" />}
                    <span className="text-[10px] font-bold">Add Photo</span>
                  </label>
                  <input type="file" id={`upload-img-${listing.vin}`} accept="image/*" capture="environment" className="hidden" onChange={handlePersonalImageUpload} disabled={isUploadingImage} />
                </div>
              )}
            </div>
          )}
        </div>

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
              {Math.round(listing.mileage).toLocaleString()} km
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-zinc-500" />
              {listing.location}
            </div>
            <div className="text-zinc-500 flex items-center before:content-['•'] before:mr-2">VIN: {listing.vin}</div>
          </div>
        </div>

        {/* Price & Action */}
        <div className="flex flex-col items-end justify-between w-full md:w-auto gap-4 h-full relative">
          <div className="absolute top-0 right-0 md:static flex gap-2">
            {onRemove && (
              <button 
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="p-2 rounded-full transition-colors text-zinc-500 hover:text-red-500 hover:bg-zinc-800"
                title="Remove from Garage"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={toggleSave}
              className={`p-2 rounded-full transition-colors ${isSaved ? 'text-lime-500 bg-lime-500/10' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
              title="Save to Garage"
            >
              <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>
          
          <div className="text-right mt-10 md:mt-0">
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
              {config.icon} AI Pulp Report
            </h4>
            {listing.url && (
              <a 
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all inline-flex items-center gap-2 ${ctaStyle}`}
                onClick={(e) => e.stopPropagation()}
              >
                {ctaText} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          
          {!isLoadingAi && aiRecord && (
            <ScoreGauge score={aiRecord.score ?? listing.score ?? 50} />
          )}

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
                  
                  {aiRecord.deep_dive_test_drive && (
                    <div className="bg-indigo-500/10 p-5 rounded-xl border border-indigo-500/30 mb-6">
                      <p className="text-xs text-indigo-400 font-black uppercase tracking-wider mb-2">Test Drive Checklist</p>
                      <p className="text-zinc-200 text-sm font-medium leading-relaxed">{aiRecord.deep_dive_test_drive}</p>
                    </div>
                  )}

                  {/* RECALLS & TSBS SECTION IN PREMIUM */}
                  {isLoadingRecalls ? (
                    <div className="flex items-center gap-2 text-zinc-500 mb-6">
                      <Loader2 className="w-4 h-4 animate-spin" /> Fetching live safety data...
                    </div>
                  ) : (
                    <div className="space-y-4 mb-6">
                      {recalls.length === 0 && tsbs.length === 0 ? (
                        <div className="bg-lime-500/5 border border-lime-500/20 rounded-xl p-4 flex items-center gap-3">
                          <ShieldCheck className="w-5 h-5 text-lime-500 shrink-0" />
                          <p className="text-sm font-medium text-lime-400">No active safety recalls or major TSBs found for this vehicle.</p>
                        </div>
                      ) : (
                        <>
                      {recalls.length > 0 && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <ShieldAlert className="w-5 h-5 text-red-500" />
                            <h4 className="text-sm font-black text-red-500 uppercase tracking-wider">
                              🚨 {recalls.length} OPEN SAFETY RECALL{recalls.length > 1 ? 'S' : ''} FOUND
                            </h4>
                          </div>
                          <ul className="space-y-3">
                            {recalls.map((recall: any, idx: number) => (
                              <li key={idx} className="text-sm text-red-400 font-medium leading-relaxed">
                                <span className="font-bold text-red-500 block mb-1">{recall.Component}</span>
                                <ExpandableText text={recall.Summary} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {tsbs.length > 0 && (
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            <h4 className="text-sm font-black text-orange-500 uppercase tracking-wider">
                              Manufacturer Communications (TSBs)
                            </h4>
                          </div>
                          <ul className="space-y-3">
                            {tsbs.slice(0, 3).map((tsb: any, idx: number) => (
                              <li key={idx} className="text-sm text-orange-400 font-medium leading-relaxed">
                                <span className="font-bold text-orange-500 block mb-1">{tsb.Component}</span>
                                <ExpandableText text={tsb.Summary} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                        </>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)] hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all">
                      <p className="flex items-center text-[11px] text-blue-400 font-bold uppercase tracking-wider mb-3">
                        <Wrench className="w-3.5 h-3.5 mr-1.5" /> Maintenance & Costs
                      </p>
                      <p className="text-zinc-200 text-sm font-medium leading-relaxed">{aiRecord.deep_dive_maintenance}</p>
                    </div>

                    <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)] hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all">
                      <p className="flex items-center text-[11px] text-emerald-400 font-bold uppercase tracking-wider mb-3">
                        <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Resale Value Curve
                      </p>
                      <p className="text-zinc-200 text-sm font-medium leading-relaxed">{aiRecord.deep_dive_resale}</p>
                    </div>

                    <div className="bg-purple-500/5 p-4 rounded-xl border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.05)] hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] transition-all">
                      <p className="flex items-center text-[11px] text-purple-400 font-bold uppercase tracking-wider mb-3">
                        <Users className="w-3.5 h-3.5 mr-1.5" /> Competitor Alternatives
                      </p>
                      <p className="text-zinc-200 text-sm font-medium leading-relaxed">{aiRecord.deep_dive_competitors}</p>
                    </div>

                    {aiRecord.deep_dive_efficiency && (
                      <div className="bg-cyan-500/5 p-4 rounded-xl border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.05)] hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all">
                        <p className="flex items-center text-[11px] text-cyan-400 font-bold uppercase tracking-wider mb-3">
                          <Leaf className="w-3.5 h-3.5 mr-1.5" /> Real-World Efficiency
                        </p>
                        <p className="text-zinc-200 text-sm font-medium leading-relaxed">{aiRecord.deep_dive_efficiency}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-b from-indigo-950/20 to-transparent rounded-xl border border-indigo-900/30">
                  <h4 className="text-indigo-400 font-bold mb-2">Want the full picture?</h4>
                  <p className="text-zinc-400 text-sm mb-4 text-center max-w-md">Unlock the Master Mechanic Deep Dive to reveal detailed maintenance costs, resale value, and competitor alternatives.</p>
                  <button 
                    onClick={handleUnlockDeepDive}
                    disabled={isUnlockingDeepDive}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-full transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                  >
                    {isUnlockingDeepDive ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Unlocking...</>
                    ) : (
                      <>{session ? "Unlock Premium Deep Dive" : "Sign In to Unlock Deep Dive"}</>
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
