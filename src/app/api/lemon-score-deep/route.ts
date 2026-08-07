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
    if (cachedAdvice && cachedAdvice.has_deep_dive && cachedAdvice.last_updated && !isExpired(cachedAdvice.last_updated)) {
      console.log(`[DEEP DIVE CACHE HIT] Returning MongoDB data for ${year} ${make} ${model}`);
      return NextResponse.json({
        score: cachedAdvice.score,
        defect: cachedAdvice.defect,
        advice: cachedAdvice.advice,
        has_deep_dive: true,
        deep_dive_maintenance: cachedAdvice.deep_dive_maintenance,
        deep_dive_recalls: cachedAdvice.deep_dive_recalls,
        deep_dive_resale: cachedAdvice.deep_dive_resale,
        deep_dive_competitors: cachedAdvice.deep_dive_competitors
      });
    }

    console.log(`[DEEP DIVE CACHE MISS] Generating premium data for ${year} ${make} ${model}...`);

    // 4. Generate Premium Content
    const engineContext = engine !== 'Unknown' ? ` with the ${engine} engine` : '';
    const prompt = `You are a premium, expert automotive analyst providing a "Deep Dive" report for the ${year} ${make} ${model}${engineContext}. 
You must provide exactly four detailed paragraphs/sections as defined below (pay special attention to flaws/maintenance specific to the ${engine} engine if specified). 
Do not use markdown formatting inside the JSON strings.

1. Maintenance: Describe the expected maintenance schedule, specific costly repairs to anticipate (e.g., timing belt at 100k, expensive fluid flushes), and estimated annualized repair costs.
2. Recalls: List any major Technical Service Bulletins (TSBs) and safety recalls that a buyer MUST check the VIN against.
3. Resale: Analyze how this specific model year holds its value compared to class competitors over the next 5 years (depreciation curve).
4. Competitors: Suggest 2-3 specific competitor vehicles a buyer should also test drive if they are considering this car, and explain why.`;

    const modelObj = ai.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            maintenance: {
              type: SchemaType.STRING,
              description: "Detailed expected maintenance schedule and costly repairs to anticipate.",
            },
            recalls: {
              type: SchemaType.STRING,
              description: "Major TSBs and safety recalls to check for.",
            },
            resale: {
              type: SchemaType.STRING,
              description: "Depreciation curve and resale value analysis.",
            },
            competitors: {
              type: SchemaType.STRING,
              description: "Competitor vehicles to cross-shop and why.",
            },
          },
          required: ["maintenance", "recalls", "resale", "competitors"],
        },
      }
    });

    const result = await modelObj.generateContent(prompt);
    const response = result.response;
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
        deep_dive_maintenance: data.maintenance,
        deep_dive_recalls: data.recalls,
        deep_dive_resale: data.resale,
        deep_dive_competitors: data.competitors,
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
      deep_dive_maintenance: updatedDoc.deep_dive_maintenance,
      deep_dive_recalls: updatedDoc.deep_dive_recalls,
      deep_dive_resale: updatedDoc.deep_dive_resale,
      deep_dive_competitors: updatedDoc.deep_dive_competitors
    });
  } catch (error: any) {
    console.error('Error in Lemon-Score-Deep API:', error);
    return NextResponse.json({ error: `Backend Error: ${error.message || 'Unknown'}` }, { status: 500 });
  }
}
