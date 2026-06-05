const fs = require('fs');

(async () => {
    const filePath = 'd:/code/harry/YathraRaksha/js/mock-data.js';
    let content = fs.readFileSync(filePath, 'utf-8');

    // Extract the mock data by evaluating it
    // Create a sandbox to extract MOCK_DATA
    const sandbox = { window: {} };
    const scriptStr = content;
    
    // Quick hack: just require it by stripping the wrapper or using eval
    const codeToEval = content.replace('window.MOCK_DATA = (() => {', 'return (() => {')
                              .replace(/}\)\(\);/g, '})();');
    
    let mockData;
    try {
        mockData = new Function(codeToEval)();
    } catch (e) {
        console.error('Eval failed', e);
        return;
    }

    const roads = mockData.roads;
    for (let i = 0; i < roads.length; i++) {
        const r = roads[i];
        if (r.coordinates.length > 1 && r.coordinates.length < 15) {
            const coordsStr = r.coordinates.map(c => `${c[1]},${c[0]}`).join(';');
            const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
            try {
                const response = await fetch(url);
                const res = await response.json();
                if (res.code === 'Ok' && res.routes.length > 0) {
                    const geom = res.routes[0].geometry.coordinates;
                    r.coordinates = geom.map(c => [c[1], c[0]]);
                    console.log(`Updated ${r.id}`);
                } else {
                    console.log(`OSRM failed for ${r.id} with code ${res.code}`);
                }
            } catch (e) {
                console.log(`Error on ${r.id}: ${e}`);
            }
            // Small delay to prevent rate limit
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }

    // Now we need to write it back. To not mess up the structure, we can rebuild the whole file 
    // exactly like build_mock_data.py does!
    
    const jsContent = `/**
 * YATHRA RAKSHA — Real Data Layer
 * Data sourced from official JSON files.
 */

window.MOCK_DATA = (() => {
  const contractors = ${JSON.stringify(mockData.contractors, null, 2)};
  const roads = ${JSON.stringify(roads, null, 2)};
  const complaints = ${JSON.stringify(mockData.complaints, null, 2)};
  const tenders = ${JSON.stringify(mockData.tenders, null, 2)};

  // ── Helper functions ─────────────────────────────────────
  function getRoadById(id) { return roads.find(r => r.id === id); }
  function getContractorById(id) { return contractors.find(c => c.id === id); }
  function getComplaintsByRoad(roadId) { return complaints.filter(c => c.road_id === roadId); }
  function getTenderByRoad(roadId) { return tenders.find(t => t.road_id === roadId); }

  function getConditionColor(condition) {
    const map = { "Excellent": "#639922", "Good": "#639922", "Fair": "#EF9F27", "Poor": "#E68A00", "Critical": "#E24B4A" };
    return map[condition] || "#888780";
  }

  function formatINR(amount) {
    if (amount >= 10000000) return \`₹\${(amount / 10000000).toFixed(2)} Cr\`;
    if (amount >= 100000) return \`₹\${(amount / 100000).toFixed(2)} L\`;
    return \`₹\${amount.toLocaleString("en-IN")}\`;
  }

  function getRoadAge(constructionDate) {
    const built = new Date(constructionDate);
    const now = new Date();
    const years = Math.floor((now - built) / (365.25 * 24 * 60 * 60 * 1000));
    return \`\${years} years\`;
  }

  function getSummaryStats() {
    const totalAllocated = tenders.reduce((s, t) => s + t.budget_allocated, 0);
    const totalReleased = tenders.reduce((s, t) => s + t.released, 0);
    const totalSpent = tenders.reduce((s, t) => s + t.spent, 0);
    const totalBalance = totalAllocated - totalSpent;
    return { totalAllocated, totalReleased, totalSpent, totalBalance };
  }

  return {
    roads, contractors, complaints, tenders,
    getRoadById, getContractorById, getComplaintsByRoad, getTenderByRoad,
    getConditionColor, formatINR, getRoadAge, getSummaryStats
  };
})();
`;

    fs.writeFileSync(filePath, jsContent, 'utf-8');
    console.log('Successfully written mock-data.js');

})();
