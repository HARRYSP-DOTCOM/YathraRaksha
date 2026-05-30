import io
from PIL import Image, ImageDraw

def _make_image_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

def _create_pothole_image() -> bytes:
    img = Image.new("RGB", (256, 256), (110, 110, 110))
    draw = ImageDraw.Draw(img)
    for y in range(256):
        for x in range(0, 256, 4):
            v = 100 + (x * 7 + y * 3) % 20
            draw.rectangle([x, y, x + 3, y], fill=(v, v, v))
    draw.ellipse([80, 90, 180, 170], fill=(25, 25, 25))
    draw.polygon([(75, 100), (85, 85), (100, 80), (90, 95)], fill=(30, 30, 30))
    draw.polygon([(170, 150), (185, 140), (190, 160), (175, 165)], fill=(35, 35, 35))
    draw.ellipse([100, 110, 160, 150], fill=(40, 50, 65))
    return _make_image_bytes(img)

def run():
    pothole_bytes = _create_pothole_image()
    img = Image.open(io.BytesIO(pothole_bytes)).convert("RGB")
    img = img.resize((128, 128))
    pixels = list(img.getdata())
    total = len(pixels)
    
    very_dark_count = 0
    dark_count = 0
    grey_count = 0
    
    for r, g, b in pixels:
        lum = (max(r, g, b) + min(r, g, b)) / 2
        if lum < 40:
            very_dark_count += 1
        if lum < 70:
            dark_count += 1
        mx = max(r, g, b)
        mn = min(r, g, b)
        sat = 0 if (mx + mn) == 0 else (mx - mn) / max(1, 255 - abs(mx + mn - 255))
        if sat < 0.15 and 40 < lum < 180:
            grey_count += 1

    raw = img.tobytes()
    edge_count = 0
    strong_edge_count = 0
    for y in range(128):
        for x in range(1, 127):
            idx = (y * 128 + x) * 3
            left = (raw[idx - 3] + raw[idx - 2] + raw[idx - 1]) / 3
            right = (raw[idx + 3] + raw[idx + 4] + raw[idx + 5]) / 3
            grad = abs(right - left)
            if grad > 30:
                edge_count += 1
            if grad > 60:
                strong_edge_count += 1
                
    pct_very_dark = very_dark_count / total
    pct_grey = grey_count / total
    edge_density = edge_count / (128 * 128)
    
    print(f"Pothole: very_dark={pct_very_dark}, grey={pct_grey}, edge={edge_density}")

if __name__ == "__main__":
    run()
