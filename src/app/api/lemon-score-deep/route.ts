import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import connectToDatabase from '@/lib/mongodb';
import VehicleAdvice from '@/models/VehicleAdvice';

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function isExpired(dateString: Date) {
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
  const age = Date.now() - new Date(dateString).getTime();
  return age > NINETY_DAYS_MS;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearStr = searchParams.get('year');
  const make = searchParams.get('make');
  const model = searchParams.get('model');
  const engineParam = searchParams.get('engine');
  const engine = engineParam && engineParam.trim() !== '' ? engineParam : 'Unknown';

  if (!yearStr || !make || !model) {
    return NextResponse.json({ error: 'Missing year, make, or model parameters' }, { status: 400 });
  }

  const year = parseInt(yearStr, 10);

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
  }

  try {
    // 1. Connect to DB
    await connectToDatabase();

    // 2. Check Cache
    let cachedAdvice = await VehicleAdvice.findOne({ year, make, model, engine });

    // 3. Cache Hit Logic for Deep Dive
    // If the cached record doesn't have the new deep_dive_efficiency field, treat it as a miss to force regeneration.
    if (cachedAdvice && cachedAdvice.has_deep_dive && cachedAdvice.last_updated && !isExpired(cachedAdvice.last_updated) && cachedAdvice.deep_dive_test_drive && cachedAdvice.deep_dive_efficiency) {
      console.log(`[DEEP DIVE CACHE HIT] Returning MongoDB data for ${year} ${make} ${model}`);
      return NextResponse.json({
        score: cachedAdvice.score,
        defect: cachedAdvice.defect,
        advice: cachedAdvice.advice,
        has_deep_dive: true,
        deep_dive_test_drive: cachedAdvice.deep_dive_test_drive,
        deep_dive_maintenance: cachedAdvice.deep_dive_maintenance,
        deep_dive_recalls: cachedAdvice.deep_dive_recalls,
        deep_dive_resale: cachedAdvice.deep_dive_resale,
        deep_dive_competitors: cachedAdvice.deep_dive_competitors,
        deep_dive_efficiency: cachedAdvice.deep_dive_efficiency
      });
    }

    console.log(`[DEEP DIVE CACHE MISS] Generating premium data for ${year} ${make} ${model}...`);

    // 4. Generate Premium Content
    const engineContext = engine !== 'Unknown' ? ` with the ${engine} engine` : '';
    const prompt = `You are a premium, expert automotive analyst providing a "Deep Dive" report for the ${year} ${make} ${model}${engineContext} for the CANADIAN market. 
CRITICAL REGIONAL ACCURACY: You must strictly use NORTH AMERICAN / CANADIAN market specifications and engine availability for this exact model year. Do NOT reference European-market engines (e.g., if this is a 2009-2013 BMW X5 Diesel in North America, it uses the M57 engine, NOT the N57).
You must provide exactly five detailed paragraphs/sections as defined below (pay special attention to flaws/maintenance specific to the ${engine} engine if specified). 
Do not use markdown formatting inside the JSON strings.
IMPORTANT: Use the metric system for all measurements (e.g., kilometers instead of miles, L/100km instead of MPG).

1. Test Drive Checklist: What specific noises, feels, or common failure points a buyer MUST check for during a test drive or visual inspection.
2. Maintenance: Describe the expected maintenance schedule, specific costly repairs to anticipate (e.g., timing belt at 100k, expensive fluid flushes), and estimated annualized repair costs.
3. Resale: Analyze how this specific model year holds its value compared to class competitors over the next 5 years (depreciation curve).
4. Competitors: Suggest 2-3 specific competitor vehicles a buyer should also test drive if they are considering this car, and explain why.
5. Efficiency: Describe the real-world fuel economy or EV efficiency (in L/100km or kWh/100km) compared to official ratings, and what the buyer should actually expect to pay at the pump based on typical usage.
6. market_analysis: First, explicitly state the exact engine code and transmission used for this specific model year in the CANADIAN market. Acknowledge any differences from the European market.`;

    const modelObj = ai.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            market_analysis: {
              type: SchemaType.STRING,
              description: "Internal reasoning step verifying the exact Canadian market engine code.",
            },
            test_drive: {
              type: SchemaType.STRING,
              description: "Specific noises, feels, and common failure points to check during a test drive.",
            },
            maintenance: {
              type: SchemaType.STRING,
              description: "Detailed expected maintenance schedule and costly repairs to anticipate.",
            },
            resale: {
              type: SchemaType.STRING,
              description: "Depreciation curve and resale value analysis.",
            },
            competitors: {
              type: SchemaType.STRING,
              description: "Competitor vehicles to cross-shop and why.",
            },
            efficiency: {
              type: SchemaType.STRING,
              description: "Real-world fuel economy/efficiency in L/100km or kWh/100km.",
            },
          },
          required: ["market_analysis", "test_drive", "maintenance", "resale", "competitors", "efficiency"],
        },
      }
    });

    let result;
    let retries = 3;
    while (retries > 0) {
      try {
        result = await modelObj.generateContent(prompt);
        break;
      } catch (err: any) {
        if (err.message?.includes('503') && retries > 1) {
          console.warn(`[GEMINI 503] Retrying deep dive generation... (${retries - 1} attempts left)`);
          await new Promise(res => setTimeout(res, 1500));
          retries--;
        } else {
          throw err;
        }
      }
    }
    const response = result!.response;
    const text = response.text();

    if (!text) {
      throw new Error("Empty response from AI");
    }

    const data = JSON.parse(text);

    // 5. Upsert to DB with new fields
    // If it didn't exist, we must provide dummy base fields (though the normal route usually runs first)
    const updatePayload = {
      $set: {
        has_deep_dive: true,
        deep_dive_test_drive: data.test_drive,
        deep_dive_maintenance: data.maintenance,
        deep_dive_recalls: data.recalls || "N/A",
        deep_dive_resale: data.resale,
        deep_dive_competitors: data.competitors,
        deep_dive_efficiency: data.efficiency,
        last_updated: new Date()
      },
      $setOnInsert: {
        score: 50, // Default fallback if deep dive is somehow called first
        defect: "Detailed defect analysis pending.",
        advice: "Basic advice pending."
      }
    };

    const updatedDoc = await VehicleAdvice.findOneAndUpdate(
      { year, make, model, engine },
      updatePayload,
      { new: true, upsert: true }
    );

    console.log(`[DEEP DIVE CACHE SAVED] Premium data saved for ${year} ${make} ${model}`);

    return NextResponse.json({
      score: updatedDoc.score,
      defect: updatedDoc.defect,
      advice: updatedDoc.advice,
      has_deep_dive: true,
      deep_dive_test_drive: updatedDoc.deep_dive_test_drive,
      deep_dive_maintenance: updatedDoc.deep_dive_maintenance,
      deep_dive_recalls: updatedDoc.deep_dive_recalls,
      deep_dive_resale: updatedDoc.deep_dive_resale,
      deep_dive_competitors: updatedDoc.deep_dive_competitors,
      deep_dive_efficiency: updatedDoc.deep_dive_efficiency
    });
  } catch (error: any) {
    console.error('Error in Lemon-Score-Deep API:', error);
    return NextResponse.json({ error: `Backend Error: ${error.message || 'Unknown'}` }, { status: 500 });
  }
}
