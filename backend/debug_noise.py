import io
import sys
sys.path.append("/home/ashin/Projects/YathraRaksha/backend")
from app.services.ai_analysis import validate_road_scene
from PIL import Image
import random as rng

def run():
    rng.seed(42)
    noise = bytes(rng.randint(0, 255) for _ in range(256 * 256 * 3))
    img = Image.frombytes("RGB", (256, 256), noise)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    
    img2 = Image.open(io.BytesIO(buf.getvalue())).convert("RGB")
    img2 = img2.resize((128, 128))
    pixels = list(img2.getdata())
    
    grey_count = 0
    dark_count = 0
    brown_count = 0
    
    for r, g, b in pixels:
        mx = max(r, g, b)
        mn = min(r, g, b)
        lum = (mx + mn) / 2
        diff = mx - mn
        denom = 255 - abs(2 * lum - 255)
        sat = 0 if diff == 0 else (diff / denom if denom > 0 else 0)
        
        if sat < 0.15 and 40 < lum < 180:
            grey_count += 1
        if lum < 60:
            dark_count += 1
        if 80 < r < 200 and 50 < g < 160 and b < 120 and sat < 0.5:
            brown_count += 1
            
    raw_pixels = img2.tobytes()
    edge_count = 0
    for y in range(128):
        for x in range(1, 127):
            idx = (y * 128 + x) * 3
            left = (raw_pixels[idx - 3] + raw_pixels[idx - 2] + raw_pixels[idx - 1]) / 3
            right = (raw_pixels[idx + 3] + raw_pixels[idx + 4] + raw_pixels[idx + 5]) / 3
            if abs(right - left) > 30:
                edge_count += 1
                
    print(f"Noise pixels: grey={grey_count/len(pixels)}, dark={dark_count/len(pixels)}, brown={brown_count/len(pixels)}, edge={edge_count/(128*128)}")

if __name__ == "__main__":
    run()
