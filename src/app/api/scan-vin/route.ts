import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Missing imageBase64' }, { status: 400 });
    }

    // Extract mime type and raw base64 data
    const matches = imageBase64.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }
    const mimeType = matches[1];
    const data = matches[2];
    
    const prompt = `Extract the 17-character VIN (Vehicle Identification Number) from this image. 
Return ONLY the 17-character string. Do not include any other text, punctuation, or spaces.
A VIN only contains uppercase letters and numbers, and it NEVER uses the letters I (i), O (o), or Q (q) to avoid confusion with numbers.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        prompt,
        {
          inlineData: {
            data,
            mimeType
          }
        }
      ]
    });

    let vin = response.text!.trim().toUpperCase();
    
    // Clean up any stray spaces or punctuation
    vin = vin.replace(/[^A-Z0-9]/g, '');

    // Basic validation
    if (vin.length !== 17) {
      return NextResponse.json({ error: 'Could not confidently read a 17-character VIN. Found: ' + (vin || 'Nothing') }, { status: 400 });
    }
    if (/[IOQ]/.test(vin)) {
      return NextResponse.json({ error: 'Invalid VIN detected (contains I, O, or Q)' }, { status: 400 });
    }

    return NextResponse.json({ vin });

  } catch (error) {
    console.error("VIN Scan Error:", error);
    return NextResponse.json({ error: 'Failed to scan image' }, { status: 500 });
  }
}
