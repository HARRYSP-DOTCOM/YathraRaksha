import io
from PIL import Image, ImageDraw

def _make_image_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

def _create_cat_image() -> bytes:
    img = Image.new("RGB", (256, 256), (160, 130, 90))
    draw = ImageDraw.Draw(img)
    for y in range(0, 256, 8):
        for x in range(0, 256, 8):
            r = 140 + (x * y) % 40
            g = 110 + (x + y) % 35
            b = 70 + (x * 3) % 30
            draw.rectangle([x, y, x + 7, y + 7], fill=(r, g, b))
    draw.ellipse([90, 100, 115, 125], fill=(50, 180, 50))
    draw.ellipse([145, 100, 170, 125], fill=(50, 180, 50))
    draw.polygon([(125, 140), (130, 150), (120, 150)], fill=(200, 120, 120))
    return _make_image_bytes(img)

def run():
    cat_bytes = _create_cat_image()
    img = Image.open(io.BytesIO(cat_bytes)).convert("RGB")
    img = img.resize((128, 128))
    pixels = list(img.getdata())
    
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
            
    print(f"Cat pixels: grey={grey_count}, dark={dark_count}, brown={brown_count}, total={len(pixels)}")
    print(f"pct_road = {(grey_count + dark_count + brown_count) / len(pixels)}")

if __name__ == "__main__":
    run()
