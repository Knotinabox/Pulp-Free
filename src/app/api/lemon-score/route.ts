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
    const engineContext = engine !== 'Unknown' ? ` with the ${engine} engine` : '';
    const prompt = `You are an expert master mechanic, consumer advocate, and used car buyer's guide. Evaluate the ${year} ${make} ${model}${engineContext}. 
Focus heavily on highly specific pre-purchase data. Identify if this model year represents a major generational shift. 
Highlight specific engine, transmission, or electrical flaws a buyer MUST look for during a test drive (pay special attention to flaws common to the ${engine} engine if specified).

The Pulp Score: Your primary task is to calculate a 'Pulp Score' from 0 to 100. "Pulp" represents mechanical risk, known model-year defects, poor reliability, and general fluff.
- 0 - 20 (Low Pulp): Highly reliable powertrains, excellent build quality, and low risk of major failure.
- 21 - 50 (Moderate Pulp): Generally good, but has known quirks (e.g., minor transmission shudders, specific oil-burning issues) that a buyer must check.
- 51 - 100 (High Pulp / Lemon): Notorious for catastrophic failures, extremely high maintenance costs, or major safety recalls.

In the 'defect' field, describe these specific historical problems and generational quirks in detail (2-3 sentences). 
In the 'advice' field, give clear, actionable buying advice.`;

    const modelObj = ai.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            score: {
              type: SchemaType.INTEGER,
              description: "A reliability score from 0 to 100",
            },
            defect: {
              type: SchemaType.STRING,
              description: "A detailed summary of specific historical problems, generational quirks, and engine/transmission flaws (2-3 sentences)",
            },
            advice: {
              type: SchemaType.STRING,
              description: "Clear, actionable buying advice (e.g., 'Avoid the 1.5L turbo and look for the 2.0L')",
            },
          },
          required: ["score", "defect", "advice"],
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

    // 5. Upsert to DB
    await VehicleAdvice.findOneAndUpdate(
      { year, make, model, engine },
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
