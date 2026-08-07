export interface VINData {
  engineType: string;
  plant: string;
  make: string;
  model: string;
  year: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function decodeVIN(vin: string): Promise<VINData | null> {
  // If it's one of our fake 11-character mock VINs, return dummy factory data
  if (vin.length < 17) {
    return {
      make: "Mock Make",
      model: "Mock Model",
      year: "20XX",
      engineType: "2.4L 4 Cyl",
      plant: "Assembly Plant, USA"
    };
  }

  try {
    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`);
    if (!response.ok) {
      throw new Error("Failed to fetch VIN data");
    }
    const data = await response.json();
    
    // NHTSA API returns an array of Results with Variable and Value pairs.
    const results = data.Results || [];
    
    const extractValue = (variableName: string) => {
      const item = results.find((r: any) => r.Variable === variableName);
      return item?.Value && item.Value !== "Not Applicable" ? item.Value : "Unknown";
    };

    // Build a highly specific engine string
    let disp = extractValue("Displacement (L)");
    if (disp !== "Unknown") {
      const parsedDisp = parseFloat(disp);
      if (!isNaN(parsedDisp)) {
        disp = parsedDisp.toFixed(1);
      }
    }
    const config = extractValue("Engine Configuration");
    const cyl = extractValue("Engine Number of Cylinders");
    const turbo = extractValue("Turbo");

    let engineStr = "";
    if (disp !== "Unknown") engineStr += `${disp}L `;
    if (config !== "Unknown") engineStr += `${config} `;
    if (cyl !== "Unknown") engineStr += `${cyl} Cyl`;
    if (turbo === "Yes") engineStr += " Turbo";
    
    if (!engineStr.trim()) engineStr = "Unknown Engine";

    return {
      make: extractValue("Make"),
      model: extractValue("Model"),
      year: extractValue("Model Year"),
      engineType: engineStr.trim(),
      plant: extractValue("Plant City") + ", " + extractValue("Plant Country"),
    };
  } catch (error) {
    console.error("Error decoding VIN:", error);
    return null;
  }
}

export async function fetchRecalls(vin: string) {
  if (vin.length < 17) return [];
  try {
    const res = await fetch(`https://api.nhtsa.gov/recalls/recallsByVin?vin=${vin}&format=json`);
    const data = await res.json();
    return data.results || data.Results || [];
  } catch (err) {
    console.error("Error fetching recalls:", err);
    return [];
  }
}

export async function fetchTSBs(year: number | string, make: string, model: string) {
  try {
    const res = await fetch(`https://api.nhtsa.gov/recalls/recallsByVehicle?make=${make}&model=${model}&modelYear=${year}&format=json`);
    const data = await res.json();
    return data.results || data.Results || [];
  } catch (err) {
    console.error("Error fetching TSBs:", err);
    return [];
  }
}
