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

    // Note: NHTSA has very specific variable names
    return {
      make: extractValue("Make"),
      model: extractValue("Model"),
      year: extractValue("Model Year"),
      engineType: extractValue("Engine Configuration") + " " + extractValue("Engine Number of Cylinders") + " Cyl", // Often fragmented in NHTSA
      plant: extractValue("Plant City") + ", " + extractValue("Plant Country"),
    };
  } catch (error) {
    console.error("Error decoding VIN:", error);
    return null;
  }
}
