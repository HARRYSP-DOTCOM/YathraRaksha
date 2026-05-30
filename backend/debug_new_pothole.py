import io
import sys
sys.path.append("/home/ashin/Projects/YathraRaksha/backend")
from tests.test_road_validation import _create_pothole_image
from PIL import Image

def run():
    img = Image.open(io.BytesIO(_create_pothole_image())).convert("RGB")
    img = img.resize((128, 128))
    pixels = list(img.getdata())
    
    very_dark_count = sum(1 for r,g,b in pixels if (max(r,g,b)+min(r,g,b))/2 < 40)
    
    edge_count = 0
    raw = img.tobytes()
    for y in range(128):
        for x in range(1, 127):
            idx = (y * 128 + x) * 3
            left = (raw[idx-3] + raw[idx-2] + raw[idx-1]) / 3
            right = (raw[idx+3] + raw[idx+4] + raw[idx+5]) / 3
            if abs(right - left) > 30:
                edge_count += 1
                
    print(f"very_dark: {very_dark_count/len(pixels)}, edge: {edge_count/(128*128)}")

if __name__ == "__main__":
    run()
