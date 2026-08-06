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
    const prompt = `You are a master mechanic and consumer advocate. Evaluate the ${year} ${make} ${model}. 
Give it a Lemon-Aid reliability score from 0-100 (where 100 is perfectly reliable). 
List its historical defects. 
Give one sentence of buying advice. 
Return ONLY valid JSON with keys: "score", "defect", "advice".`;

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
              description: "A summary of known historical defects",
            },
            advice: {
              type: Type.STRING,
              description: "One sentence of buying advice",
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
