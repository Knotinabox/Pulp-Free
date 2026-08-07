import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import VehicleAdvice from '@/models/VehicleAdvice';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let zip = searchParams.get('zip') || '78701';
  const radius = searchParams.get('radius') || '50';
  const type = searchParams.get('type') || '';
  const budget = searchParams.get('budget') || '';
  
  // Clean zip/postal code
  zip = zip.trim().toUpperCase();
  // If user entered a 3-character Canadian FSA (e.g. "V8W"), pad it with "1A1" because Marketcheck requires 6 characters for Canada.
  if (/^[A-Z]\d[A-Z]$/.test(zip)) {
    zip += '1A1';
  }
  
  const make = searchParams.get('make') || '';
  const model = searchParams.get('model') || '';
  const sort = searchParams.get('sort') || '';
  const sortOrder = searchParams.get('sort_order') || '';
  const start = searchParams.get('start') || '0';

  const apiKey = process.env.MARKETCHECK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Marketcheck API key is missing' }, { status: 500 });
  }

  try {
    let url = `https://mc-api.marketcheck.com/v2/search/car/active?api_key=${apiKey}&zip=${encodeURIComponent(zip)}&radius=${radius}&car_type=used&rows=50&start=${start}&country=CA`;
    
    if (make) {
      url += `&make=${encodeURIComponent(make)}`;
    }
    if (model) {
      url += `&model=${encodeURIComponent(model)}`;
    }
    if (type) {
      url += `&body_type=${encodeURIComponent(type)}`;
    }
    if (budget) {
      url += `&price_range=0-${encodeURIComponent(budget)}`;
    }
    if (sort && sortOrder) {
      url += `&sort_by=${encodeURIComponent(sort)}&sort_order=${encodeURIComponent(sortOrder)}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      console.error("Marketcheck Error:", data);
      return NextResponse.json({ error: data.message || 'Failed to fetch listings' }, { status: res.status });
    }

    // Map Marketcheck response to our CarListing interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let listings = (data.listings || []).map((car: Record<string, any>) => {
      return {
        id: car.id || Math.random().toString(),
        year: car.build?.year || 0,
        make: car.build?.make || 'Unknown',
        model: car.build?.model || 'Unknown',
        price: car.price || 0,
        mileage: Math.round((car.miles || 0) * 1.60934), // Convert miles to km
        location: `${car.dealer?.city || 'Unknown'}, ${car.dealer?.state || '??'}`,
        vin: car.vin || '',
        url: car.vdp_url || '',
        score: undefined // Default state
      };
    });

    // 2. Fetch cached scores from MongoDB
    try {
      await connectToDatabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uniqueModels = Array.from(new Set(listings.map((l: any) => `${l.year}|${l.make}|${l.model}`))) as string[];
      const queries = uniqueModels.map(key => {
        const [yearStr, make, model] = key.split('|');
        return { year: parseInt(yearStr, 10), make, model };
      });
      
      const cachedScores = await VehicleAdvice.find({ $or: queries });
      const scoreMap = new Map();
      cachedScores.forEach(doc => {
        scoreMap.set(`${doc.year}|${doc.make}|${doc.model}`, doc.score);
      });

      // 3. Map scores back to listings
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listings = listings.map((l: any) => {
        const key = `${l.year}|${l.make}|${l.model}`;
        if (scoreMap.has(key)) {
          l.score = scoreMap.get(key);
        }
        return l;
      });
    } catch (dbError) {
      console.error('Error fetching cached scores for feed:', dbError);
    }

    return NextResponse.json({ listings });
  } catch (error) {
    console.error("Error calling Marketcheck:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
