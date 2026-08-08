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
    
    const prompt = `Extract the main numeric odometer reading from this vehicle dashboard image. 
Return ONLY the raw number without commas, spaces, or units (e.g. '150000'). 
Do not include trip meters or temperature readings.
If you cannot clearly find an odometer reading, return the exact string 'ERROR'.`;

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

    const resultText = response.text!.trim().toUpperCase();
    
    if (resultText === 'ERROR' || !resultText) {
      return NextResponse.json({ error: 'Could not confidently read an odometer value from the image.' }, { status: 400 });
    }

    // Clean up any stray spaces or punctuation, leaving only digits
    const rawNumber = resultText.replace(/[^0-9]/g, '');

    if (!rawNumber) {
      return NextResponse.json({ error: 'No digits found in the extracted text.' }, { status: 400 });
    }

    return NextResponse.json({ odometer: Number(rawNumber) });

  } catch (error) {
    console.error("Odometer Scan Error:", error);
    return NextResponse.json({ error: 'Failed to scan image' }, { status: 500 });
  }
}
