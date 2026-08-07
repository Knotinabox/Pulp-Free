"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import ScoreGauge from "@/components/ScoreGauge";

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const vins = searchParams.get("vins")?.split(",") || [];
  
  const [cars, setCars] = useState<any[]>([]);
  const [deepDives, setDeepDives] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (vins.length === 0) {
      router.push("/garage");
      return;
    }

    const fetchCars = async () => {
      try {
        const res = await fetch("/api/garage");
        const data = await res.json();
        if (data.cars) {
          const selectedCars = data.cars.filter((c: any) => vins.includes(c.vin));
          setCars(selectedCars);
          
          // Fetch deep dives for all selected cars simultaneously
          const dives: Record<string, any> = {};
          await Promise.all(selectedCars.map(async (car: any) => {
            try {
              const res = await fetch(`/api/lemon-score-deep?year=${car.year}&make=${car.make}&model=${car.model}`);
              const dd = await res.json();
              dives[car.vin] = dd;
            } catch (e) {
              console.error(e);
            }
          }));
          setDeepDives(dives);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchCars();
  }, [vins.join(","), router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-8">
          <Link href="/garage" className="p-2 mr-4 bg-zinc-900 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-black text-white tracking-tight">Side-by-Side Comparison</h1>
        </div>

        <div className="overflow-x-auto pb-8">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="p-4 border-b border-zinc-800 bg-zinc-950 sticky left-0 z-20 w-48"></th>
                {cars.map(car => (
                  <th key={car.vin} className="p-4 border-b border-zinc-800 bg-zinc-900/50 min-w-[300px] align-top">
                    <div className="w-full h-40 rounded-lg overflow-hidden bg-zinc-800 mb-4">
                      {car.image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={car.image} alt="Car" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">No Image</div>
                      )}
                    </div>
                    <div className="text-xl font-bold text-white leading-tight">
                      {car.year} {car.make} {car.model}
                    </div>
                    <div className="text-2xl font-black text-lime-500 mt-2">${car.price.toLocaleString()}</div>
                    {car.url && (
                      <a href={car.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors">
                        View Dealership <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <tr>
                <td className="p-4 font-bold text-zinc-400 uppercase text-xs tracking-wider sticky left-0 bg-zinc-950 z-20">Mileage</td>
                {cars.map(car => (
                  <td key={car.vin} className="p-4 text-white font-medium">{Math.round(car.mileage).toLocaleString()} km</td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-bold text-zinc-400 uppercase text-xs tracking-wider sticky left-0 bg-zinc-950 z-20">Location</td>
                {cars.map(car => (
                  <td key={car.vin} className="p-4 text-zinc-300">{car.location}</td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-bold text-zinc-400 uppercase text-xs tracking-wider sticky left-0 bg-zinc-950 z-20">Pulp Score</td>
                {cars.map(car => (
                  <td key={car.vin} className="p-4">
                    {deepDives[car.vin]?.score !== undefined ? (
                      <div className="transform scale-75 origin-left">
                        <ScoreGauge score={deepDives[car.vin].score} />
                      </div>
                    ) : (
                      <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-bold text-zinc-400 uppercase text-xs tracking-wider sticky left-0 bg-zinc-950 z-20">Quirks & Defects</td>
                {cars.map(car => (
                  <td key={car.vin} className="p-4 text-zinc-300 text-sm leading-relaxed align-top">
                    {deepDives[car.vin]?.defect || "Loading..."}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-bold text-zinc-400 uppercase text-xs tracking-wider sticky left-0 bg-zinc-950 z-20">Master Mechanic Advice</td>
                {cars.map(car => (
                  <td key={car.vin} className="p-4 text-zinc-300 text-sm leading-relaxed align-top">
                    {deepDives[car.vin]?.advice || "Loading..."}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-bold text-zinc-400 uppercase text-xs tracking-wider sticky left-0 bg-zinc-950 z-20">Expected Maintenance</td>
                {cars.map(car => (
                  <td key={car.vin} className="p-4 text-zinc-300 text-sm leading-relaxed align-top">
                    {deepDives[car.vin]?.deep_dive_maintenance || "Loading deep dive..."}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-bold text-zinc-400 uppercase text-xs tracking-wider sticky left-0 bg-zinc-950 z-20">Resale Value</td>
                {cars.map(car => (
                  <td key={car.vin} className="p-4 text-zinc-300 text-sm leading-relaxed align-top">
                    {deepDives[car.vin]?.deep_dive_resale || "Loading deep dive..."}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-950"><Loader2 className="w-8 h-8 animate-spin text-lime-500" /></div>}>
      <CompareContent />
    </Suspense>
  );
}
