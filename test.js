fetch("https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/2HKRW2H53HH106569?format=json")
  .then(res => res.json())
  .then(data => {
    const relevant = data.Results.filter(r => 
      r.Value && 
      r.Value !== 'Not Applicable' && 
      r.Value !== 'null' && 
      (r.Variable.includes('Engine') || r.Variable.includes('Displacement') || r.Variable.includes('Turbo'))
    );
    console.log(JSON.stringify(relevant, null, 2));
  });
