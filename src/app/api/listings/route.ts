import { NextResponse } from 'next/server';

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

  const apiKey = process.env.MARKETCHECK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Marketcheck API key is missing' }, { status: 500 });
  }

  try {
    let url = `https://mc-api.marketcheck.com/v2/search/car/active?api_key=${apiKey}&zip=${encodeURIComponent(zip)}&radius=${radius}&car_type=used&rows=10&country=CA`;
    
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

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      console.error("Marketcheck Error:", data);
      return NextResponse.json({ error: data.message || 'Failed to fetch listings' }, { status: res.status });
    }

    // Map Marketcheck response to our CarListing interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappedListings = (data.listings || []).map((car: Record<string, any>) => {
      return {
        id: car.id,
        year: car.build?.year || 0,
        make: car.build?.make || 'Unknown',
        model: car.build?.model || 'Unknown',
        price: car.price || 0,
        mileage: car.miles || 0,
        location: `${car.dealer?.city || ''}, ${car.dealer?.state || ''}`,
        vin: car.vin,
        url: car.vdp_url,
        isLocal: true, // They are local by definition of zip/radius
        score: Math.floor(Math.random() * 40) + 40 // Default visual score (40-80) until AI is run
      };
    });

    return NextResponse.json({ listings: mappedListings });
  } catch (error) {
    console.error("Error calling Marketcheck:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
