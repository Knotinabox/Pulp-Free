import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import connectToDatabase from '@/lib/mongodb';
import OwnershipAdvice from '@/models/OwnershipAdvice';

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
    await connectToDatabase();

    let cachedAdvice = await OwnershipAdvice.findOne({ year, make, model, engine });

    if (cachedAdvice && cachedAdvice.last_updated && !isExpired(cachedAdvice.last_updated)) {
      console.log(`[OWNERSHIP CACHE HIT] Returning MongoDB data for ${year} ${make} ${model} ${engine}`);
      return NextResponse.json({
        quirks: cachedAdvice.quirks,
        maintenance: cachedAdvice.maintenance,
      });
    }

    console.log(`[OWNERSHIP CACHE MISS] Generating ownership data for ${year} ${make} ${model} ${engine}...`);

    const engineContext = engine !== 'Unknown' ? ` with the ${engine} engine` : '';
    const prompt = `You are a master mechanic providing highly detailed, verbose ownership advice to someone who ALREADY OWNS a ${year} ${make} ${model}${engineContext} in the CANADIAN market. 
CRITICAL REGIONAL ACCURACY: You must strictly use NORTH AMERICAN / CANADIAN market specifications and engine availability for this exact model year. Do NOT reference European-market engines (e.g., if this is a 2009-2013 BMW X5 Diesel in North America, it uses the M57 engine, NOT the N57).
Do not give them buying advice or tell them to avoid purchasing it—they already own it. 
IMPORTANT: Use the metric system for all measurements (e.g., kilometers). Be highly verbose and exhaustive in your technical explanations.

Provide two highly detailed sections:
1. market_analysis: First, explicitly state the exact engine code (e.g., M57 vs N57) and transmission used for this specific model year in the CANADIAN market. Acknowledge any differences from the European market.
2. quirks: Be very verbose. Tap into deep enthusiast forum knowledge. List the obscure quirks, known failures, and specific symptoms they should watch out for (e.g., failing plastic cowlings raining water on injectors, vacuum line degradation, sensor failures that cause cascading issues). Give actionable advice on how to mitigate these issues.
3. maintenance: Be very verbose. Detail the expected maintenance schedule. What specific parts need preventative replacement before they fail? What are the typical costs they should budget for annually? Explain the reasoning behind these intervals.`;

    const modelObj = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            market_analysis: {
              type: SchemaType.STRING,
              description: "Internal reasoning step verifying the exact Canadian market engine code.",
            },
            quirks: {
              type: SchemaType.STRING,
              description: "Common quirks, known failures, symptoms to watch out for, and mitigation advice.",
            },
            maintenance: {
              type: SchemaType.STRING,
              description: "Expected maintenance schedule, preventative replacements, and annual budget.",
            },
          },
          required: ["market_analysis", "quirks", "maintenance"],
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

    const updatedDoc = await OwnershipAdvice.findOneAndUpdate(
      { year, make, model, engine },
      {
        $set: {
          quirks: data.quirks,
          maintenance: data.maintenance,
          last_updated: new Date()
        }
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      quirks: updatedDoc.quirks,
      maintenance: updatedDoc.maintenance,
    });
  } catch (error: any) {
    console.error('Error in Garage Insights API:', error);
    return NextResponse.json({ error: `Backend Error: ${error.message || 'Unknown'}` }, { status: 500 });
  }
}
