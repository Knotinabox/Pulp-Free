"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, AlertTriangle, ShieldAlert, Loader2, Camera, Wrench, TrendingUp, Users, Leaf, Trash2 } from "lucide-react";
import { fetchRecalls, fetchTSBs } from "@/utils/nhtsa";

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

export function OwnershipCard({ car, onRemove }: { car: any, onRemove: () => void }) {
  const [recalls, setRecalls] = useState<any[]>([]);
  const [tsbs, setTsbs] = useState<any[]>([]);
  const [isLoadingSafety, setIsLoadingSafety] = useState(true);

  const [aiRecord, setAiRecord] = useState<LemonRecord | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(true);

  const [localImage, setLocalImage] = useState(car.image);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [isEditingMileage, setIsEditingMileage] = useState(false);
  const [localMileage, setLocalMileage] = useState(car.mileage || 0);
  const [mileageInput, setMileageInput] = useState(car.mileage?.toString() || "");

  const handleMileageUpdate = async () => {
    try {
      const res = await fetch("/api/garage/update-mileage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vin: car.vin, mileage: mileageInput })
      });
      if (res.ok) {
        setLocalMileage(Number(mileageInput));
        setIsEditingMileage(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // Fetch safety data (NHTSA)
    const loadSafety = async () => {
      try {
        const [recallData, tsbData] = await Promise.all([
          fetchRecalls(car.vin),
          fetchTSBs(car.year.toString(), car.make, car.model)
        ]);
        setRecalls(recallData || []);
        setTsbs(tsbData || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingSafety(false);
      }
    };
    loadSafety();
  }, [car.year, car.make, car.model]);

  useEffect(() => {
    // Fetch deep dive data
    const fetchDeepDive = async () => {
      try {
        const res = await fetch(`/api/lemon-score-deep?year=${car.year}&make=${car.make}&model=${car.model}`);
        const data = await res.json();
        if (data.score !== undefined) {
          setAiRecord(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingAi(false);
      }
    };
    fetchDeepDive();
  }, [car.vin, car.year, car.make, car.model, car.price, car.mileage]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        const res = await fetch("/api/garage/update-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vin: car.vin, imageBase64: base64String })
        });
        
        if (res.ok) {
          setLocalImage(base64String);
        }
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative group">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={onRemove}
          className="w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white backdrop-blur-md shadow-lg transition-colors opacity-0 group-hover:opacity-100"
          title="Remove from garage"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      {/* Photo Section */}
      <div className="w-full md:w-1/3 relative h-64 md:h-auto bg-zinc-950 flex flex-col items-center justify-center overflow-hidden border-r border-zinc-800">
        {localImage ? (
          <img src={localImage} alt={`${car.year} ${car.make} ${car.model}`} className="w-full h-full object-cover" />
        ) : (
          <div className="text-zinc-600 flex flex-col items-center">
            <CarIcon className="w-16 h-16 mb-2 opacity-50" />
            <span className="text-sm font-medium tracking-wide">No Photo Available</span>
          </div>
        )}
        
        {/* Hover Upload Button */}
        <div className={`absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity ${isUploadingImage ? 'opacity-100' : ''}`}>
          <label className="cursor-pointer bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 transition-colors">
            {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {isUploadingImage ? "Uploading..." : (localImage ? "Change Photo" : "Upload Photo")}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>
      </div>

      {/* Details Section */}
      <div className="flex-1 p-6 flex flex-col">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-white">{car.year} {car.make} {car.model}</h2>
          <div className="text-zinc-400 font-mono text-sm mt-1">{car.vin}</div>
          <div className="flex gap-4 mt-3">
            {isEditingMileage ? (
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  value={mileageInput}
                  onChange={(e) => setMileageInput(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-md px-3 py-1 text-sm text-white font-mono w-32 focus:outline-none focus:border-lime-500"
                  placeholder="e.g. 150000"
                />
                <button onClick={handleMileageUpdate} className="px-3 py-1 bg-lime-500 text-black font-bold text-sm rounded-md hover:bg-lime-400">Save</button>
                <button onClick={() => setIsEditingMileage(false)} className="px-3 py-1 bg-zinc-800 text-zinc-400 font-bold text-sm rounded-md hover:text-white">Cancel</button>
              </div>
            ) : (
              <button 
                onClick={() => setIsEditingMileage(true)}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-md text-sm font-bold text-zinc-300 transition-colors group relative"
              >
                {localMileage ? `${localMileage.toLocaleString()} km` : "Add Mileage"}
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none">Click to edit</span>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Urgent Alerts (Recalls & TSBs) */}
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" /> Urgent Alerts
            </h3>
            {isLoadingSafety ? (
              <div className="flex items-center gap-2 text-zinc-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Checking safety databases...</div>
            ) : (
              <div className="space-y-3">
                {recalls.length === 0 && tsbs.length === 0 ? (
                  <div className="bg-lime-500/5 border border-lime-500/20 rounded-xl p-4 flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-lime-500 shrink-0" />
                    <p className="text-sm font-medium text-lime-400">No active safety recalls or major TSBs found.</p>
                  </div>
                ) : (
                  <>
                    {recalls.length > 0 && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                        <div className="text-xs font-black text-red-500 uppercase tracking-wider mb-2">🚨 {recalls.length} Open Safety Recall{recalls.length > 1 ? 's' : ''}</div>
                        <ul className="space-y-2">
                          {recalls.slice(0, 2).map((r, i) => (
                            <li key={i} className="text-sm text-red-400">
                              <span className="font-bold text-red-500 block">{r.Component}</span>
                              <ExpandableText text={r.Summary} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {tsbs.length > 0 && (
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                        <div className="text-xs font-black text-orange-500 uppercase tracking-wider mb-2">Manufacturer Communications (TSBs)</div>
                        <ul className="space-y-2">
                          {tsbs.slice(0, 2).map((t, i) => (
                            <li key={i} className="text-sm text-orange-400">
                              <span className="font-bold text-orange-500 block">{t.Component}</span>
                              <ExpandableText text={t.Summary} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* AI Insights (Common Quirks & Maintenance) */}
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-500" /> Ownership Insights
            </h3>
            {isLoadingAi ? (
              <div className="flex items-center gap-2 text-zinc-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Analyzing vehicle history...</div>
            ) : aiRecord ? (
              <div className="grid grid-cols-1 gap-4">
                {aiRecord.defect && (
                  <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/50">
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1">Common Quirks</p>
                    <p className="text-zinc-300 text-sm">{aiRecord.defect}</p>
                    {aiRecord.advice && <p className="text-lime-400 text-sm font-medium mt-2">💡 {aiRecord.advice}</p>}
                  </div>
                )}
                
                {aiRecord.deep_dive_maintenance && (
                  <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                    <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-2">Expected Maintenance</p>
                    <p className="text-zinc-200 text-sm leading-relaxed">{aiRecord.deep_dive_maintenance}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-zinc-500 text-sm">Failed to load insights.</div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// Simple car silhouette icon
function CarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}
