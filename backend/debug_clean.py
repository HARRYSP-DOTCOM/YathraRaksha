import io
import sys
sys.path.append("/home/ashin/Projects/YathraRaksha/backend")
from app.services.ai_analysis import validate_road_scene, analyze_defect
from PIL import Image, ImageDraw

def _make_image_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

def _create_road_no_defect_image() -> bytes:
    img = Image.new("RGB", (256, 256), (100, 100, 100))
    draw = ImageDraw.Draw(img)
    for y in range(256):
        for x in range(0, 256, 4):
            v = 90 + (x + y * 3) % 25
            draw.rectangle([x, y, x + 3, y], fill=(v, v, v))
    for y in range(0, 256, 30):
        draw.rectangle([124, y, 132, y + 15], fill=(210, 210, 210))
    for y in range(256):
        for x in range(230, 256):
            draw.point((x, y), fill=(50, 100 + y % 30, 40))
    return _make_image_bytes(img)

def run():
    print("Clean road:", validate_road_scene(_create_road_no_defect_image()))

if __name__ == "__main__":
    run()
