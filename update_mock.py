import json
import urllib.request

file_path = 'd:/code/harry/YathraRaksha/js/mock-data.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('const roads = [')
end_idx = content.find('const complaints = [')
if start_idx != -1 and end_idx != -1:
    roads_str = content[start_idx + 14:end_idx].strip()[:-1]
    roads = json.loads(roads_str)
    
    for r in roads:
        coords = r['coordinates']
        if len(coords) > 1 and len(coords) < 10: # Only update if it hasn't been updated yet (few waypoints)
            coords_str = ';'.join([f"{c[1]},{c[0]}" for c in coords])
            url = f"https://router.project-osrm.org/route/v1/driving/{coords_str}?overview=full&geometries=geojson"
            try:
                req = urllib.request.urlopen(url)
                res = json.loads(req.read().decode())
                if res.get('code') == 'Ok' and len(res.get('routes', [])) > 0:
                    geom = res['routes'][0]['geometry']['coordinates']
                    r['coordinates'] = [[c[1], c[0]] for c in geom]
                    print(f"Updated {r['id']}")
                else:
                    print(f"OSRM failed for {r['id']} with code {res.get('code')}")
            except Exception as e:
                print(f"Error on {r['id']}: {e}")

    new_roads_str = json.dumps(roads, indent=2)
    new_content = content[:start_idx + 14] + new_roads_str + ';\n  ' + content[end_idx:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Done updating mock-data.js')
