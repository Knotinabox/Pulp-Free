import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year');
  const make = searchParams.get('make');
  const model = searchParams.get('model');

  if (!year || !make || !model) {
    return NextResponse.json({ error: 'Missing year, make, or model parameters' }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
  }

  try {
    const prompt = `You are an expert master mechanic, consumer advocate, and used car buyer's guide. Evaluate the ${year} ${make} ${model}. 
Focus heavily on highly specific pre-purchase data. Identify if this model year represents a major generational shift (e.g., "switched to a new 1.5L turbo which had oil dilution issues"). 
Highlight specific engine, transmission, or electrical flaws a buyer MUST look for during a test drive.
Give it a Lemon-Aid reliability score from 0-100 (where 100 is perfectly reliable). 
In the 'defect' field, describe these specific historical problems and generational quirks in detail (2-3 sentences). 
In the 'advice' field, give clear, actionable buying advice (e.g., "Avoid the 1.5L turbo and look for the naturally aspirated 2.0L instead").`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching from Gemini API:', error);
    return NextResponse.json({ error: 'Failed to generate Lemon-Aid score' }, { status: 500 });
  }
}
