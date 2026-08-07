import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import connectToDatabase from '@/lib/mongodb';
import VehicleAdvice from '@/models/VehicleAdvice';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    let cachedAdvice = await VehicleAdvice.findOne({ year, make, model });

    // 3. Cache Hit Logic
    if (cachedAdvice && cachedAdvice.last_updated) {
      if (!isExpired(cachedAdvice.last_updated)) {
        console.log(`[CACHE HIT] Returning MongoDB data for ${year} ${make} ${model}`);
        return NextResponse.json({
          score: cachedAdvice.score,
          defect: cachedAdvice.defect,
          advice: cachedAdvice.advice
        });
      }
      console.log(`[CACHE EXPIRED] Data for ${year} ${make} ${model} is older than 90 days. Generating fresh...`);
    } else {
      console.log(`[CACHE MISS] No MongoDB entry for ${year} ${make} ${model}. Generating fresh...`);
    }

    // 4. Cache Miss / Expired Logic
    const prompt = `You are an expert master mechanic, consumer advocate, and used car buyer's guide. Evaluate the ${year} ${make} ${model}. 
Focus heavily on highly specific pre-purchase data. Identify if this model year represents a major generational shift (e.g., "switched to a new 1.5L turbo which had oil dilution issues"). 
Highlight specific engine, transmission, or electrical flaws a buyer MUST look for during a test drive.
Give it a Pulp-Free reliability score from 0-100 (where 100 is perfectly reliable). 
In the 'defect' field, describe these specific historical problems and generational quirks in detail (2-3 sentences). 
In the 'advice' field, give clear, actionable buying advice (e.g., "Avoid the 1.5L turbo and look for the naturally aspirated 2.0L instead").`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.INTEGER,
              description: "A reliability score from 0 to 100",
            },
            defect: {
              type: Type.STRING,
              description: "A detailed summary of specific historical problems, generational quirks, and engine/transmission flaws (2-3 sentences)",
            },
            advice: {
              type: Type.STRING,
              description: "Clear, actionable buying advice (e.g., 'Avoid the 1.5L turbo and look for the 2.0L')",
            },
          },
          required: ["score", "defect", "advice"],
        },
      }
    });

    if (!response.text) {
      throw new Error("Empty response from AI");
    }

    const data = JSON.parse(response.text);

    // 5. Upsert to DB
    await VehicleAdvice.findOneAndUpdate(
      { year, make, model },
      { 
        $set: {
          score: data.score,
          defect: data.defect,
          advice: data.advice,
          last_updated: new Date()
        } 
      },
      { new: true, upsert: true }
    );
    console.log(`[CACHE SAVED] Fresh data saved to MongoDB for ${year} ${make} ${model}`);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in Lemon-Score API:', error);
    return NextResponse.json({ error: `Backend Error: ${error.message || 'Unknown'}` }, { status: 500 });
  }
}
