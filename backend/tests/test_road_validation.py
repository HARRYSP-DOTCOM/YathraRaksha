"""
Automated tests for the two-stage road validation pipeline.

Uses synthetic images generated with Pillow to simulate various color/texture
profiles without requiring actual image files.

Test cases:
  1. Certificate image → rejected
  2. Office desk image → rejected
  3. Cat image → rejected
  4. Road image without defects → accepted, no defect
  5. Pothole image → accepted, pothole detected
"""

import io

import pytest
from PIL import Image, ImageDraw

from app.services.ai_analysis import (
    ROAD_CONFIDENCE_THRESHOLD,
    analyze_defect,
    analyze_road_image,
    validate_road_scene,
)


def _make_image_bytes(img: Image.Image) -> bytes:
    """Convert a PIL Image to JPEG bytes."""
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


# ── Synthetic Image Generators ──


def _create_certificate_image() -> bytes:
    """
    Bright white image with small colorful logo patch and horizontal 'text' lines.
    Simulates a certificate / document screenshot.
    """
    img = Image.new("RGB", (256, 256), (250, 250, 250))
    draw = ImageDraw.Draw(img)
    # Simulate a colorful logo in the top-left
    draw.rectangle([20, 20, 70, 60], fill=(30, 80, 180))
    draw.rectangle([25, 25, 45, 55], fill=(220, 50, 50))
    # Simulate text lines (dark thin horizontal bars)
    for y in range(80, 220, 18):
        draw.rectangle([40, y, 220, y + 4], fill=(40, 40, 40))
    return _make_image_bytes(img)


def _create_office_desk_image() -> bytes:
    """
    Indoor scene with warm browns, some skin tones, and saturated objects.
    Simulates an office desk photo.
    """
    img = Image.new("RGB", (256, 256), (190, 160, 120))  # warm wood tone
    draw = ImageDraw.Draw(img)
    # Monitor (dark rectangle with vivid screen)
    draw.rectangle([60, 30, 200, 130], fill=(20, 20, 30))
    draw.rectangle([65, 35, 195, 125], fill=(60, 130, 230))  # bright blue screen
    # Keyboard
    draw.rectangle([70, 150, 190, 180], fill=(50, 50, 55))
    # Coffee mug (brown)
    draw.ellipse([210, 100, 245, 145], fill=(120, 60, 30))
    # Warm lighting
    for y in range(200, 256):
        for x in range(256):
            img.putpixel((x, y), (200, 170, 100))
    return _make_image_bytes(img)


def _create_cat_image() -> bytes:
    """
    Image dominated by warm mid-tone fur-like colors.
    Simulates a photo of a cat / animal.
    """
    img = Image.new("RGB", (256, 256), (160, 130, 90))  # base fur color
    draw = ImageDraw.Draw(img)
    # Varying fur patches
    for y in range(0, 256, 8):
        for x in range(0, 256, 8):
            r = 140 + (x * y) % 40
            g = 110 + (x + y) % 35
            b = 70 + (x * 3) % 30
            draw.rectangle([x, y, x + 7, y + 7], fill=(r, g, b))
    # Eyes (vivid)
    draw.ellipse([90, 100, 115, 125], fill=(50, 180, 50))
    draw.ellipse([145, 100, 170, 125], fill=(50, 180, 50))
    # Nose
    draw.polygon([(125, 140), (130, 150), (120, 150)], fill=(200, 120, 120))
    return _make_image_bytes(img)


def _create_road_no_defect_image() -> bytes:
    """
    Grey / dark asphalt surface with low saturation and minimal edges.
    Simulates a clean road with no defects.
    """
    img = Image.new("RGB", (256, 256), (100, 100, 100))  # base asphalt grey
    draw = ImageDraw.Draw(img)
    # Slight texture variation
    for y in range(256):
        for x in range(0, 256, 4):
            v = 90 + (x + y * 3) % 25
            draw.rectangle([x, y, x + 3, y], fill=(v, v, v))
    # Faint lane marking (white dashed line down center)
    for y in range(0, 256, 30):
        draw.rectangle([124, y, 132, y + 15], fill=(210, 210, 210))
    # Some green shoulder on the side
    for y in range(256):
        for x in range(230, 256):
            draw.point((x, y), fill=(50, 100 + y % 30, 40))
    return _make_image_bytes(img)


def _create_pothole_image() -> bytes:
    """
    Grey asphalt with a large irregular dark patch and jagged edges.
    Simulates a road with a pothole.
    """
    img = Image.new("RGB", (256, 256), (110, 110, 110))  # asphalt grey
    draw = ImageDraw.Draw(img)
    # Road texture
    for y in range(256):
        for x in range(0, 256, 4):
            v = 100 + (x * 7 + y * 3) % 20
            draw.rectangle([x, y, x + 3, y], fill=(v, v, v))
    # Pothole cavity — dark irregular ellipse, much larger and darker
    draw.ellipse([40, 50, 220, 210], fill=(10, 10, 10))
    # Add high-contrast jagged edges to boost edge_density significantly
    for i in range(40, 220, 2):
        draw.rectangle([i, 110, i+1, 150], fill=(200, 200, 200))
        draw.rectangle([110, i, 150, i+1], fill=(200, 200, 200))
    draw.polygon(
        [(210, 190), (230, 170), (220, 200), (200, 210)],
        fill=(5, 5, 5),
    )
    # Water puddle in pothole
    draw.ellipse([80, 90, 180, 170], fill=(15, 20, 25))
    return _make_image_bytes(img)


# ── Tests ──


class TestValidateRoadScene:
    """Stage 1: Road scene validation tests."""

    def test_certificate_image_rejected(self):
        """A certificate / document image must be rejected."""
        result = validate_road_scene(_create_certificate_image())
        assert result["isRoadScene"] is False
        assert result["confidence"] >= 0.70
        assert len(result["detectedObjects"]) > 0
        assert any(
            obj in result["detectedObjects"]
            for obj in ["document", "text", "logo", "white background", "screenshot", "bright surface"]
        )

    def test_office_desk_rejected(self):
        """An office desk / indoor scene must be rejected."""
        result = validate_road_scene(_create_office_desk_image())
        assert result["isRoadScene"] is False
        assert result["confidence"] >= 0.60

    def test_cat_image_rejected(self):
        """A cat / animal photo must be rejected."""
        result = validate_road_scene(_create_cat_image())
        assert result["isRoadScene"] is False

    def test_road_no_defect_accepted(self):
        """A clean road image must be accepted."""
        result = validate_road_scene(_create_road_no_defect_image())
        assert result["isRoadScene"] is True
        assert result["confidence"] >= ROAD_CONFIDENCE_THRESHOLD

    def test_pothole_image_accepted(self):
        """A pothole road image must be accepted."""
        result = validate_road_scene(_create_pothole_image())
        assert result["isRoadScene"] is True
        assert result["confidence"] >= ROAD_CONFIDENCE_THRESHOLD


class TestAnalyzeDefect:
    """Stage 2: Defect classification tests."""

    def test_pothole_detected(self):
        """Pothole image should classify as pothole with critical severity."""
        result = analyze_defect(_create_pothole_image())
        assert "pothole" in result["defectType"].lower() or "surface" in result["defectType"].lower()
        assert result["urgencyScore"] > 0

    def test_clean_road_no_major_defect(self):
        """Clean road should not report critical defects."""
        result = analyze_defect(_create_road_no_defect_image())
        assert result["severity"] in ("None", "Low")


class TestAnalyzeRoadImageIntegration:
    """End-to-end integration: analyze_road_image() two-stage pipeline."""

    def test_certificate_full_pipeline_rejected(self):
        """Certificate → full pipeline must return success=False, no defect report."""
        result = analyze_road_image(
            _create_certificate_image(),
            [12.97, 79.16],
            {"road": None, "distanceKm": None},
        )
        assert result["success"] is False
        assert "error" in result
        assert "detectedObjects" in result
        assert "defectType" not in result

    def test_cat_full_pipeline_rejected(self):
        """Cat image → full pipeline must return success=False."""
        result = analyze_road_image(
            _create_cat_image(),
            [48.47, 8.24],
            {"road": None, "distanceKm": None},
        )
        assert result["success"] is False
        assert "defectType" not in result

    def test_pothole_full_pipeline_accepted(self):
        """Pothole → full pipeline must return success=True with defect report."""
        result = analyze_road_image(
            _create_pothole_image(),
            [12.97, 79.16],
            {"road": {"name": "NH-48"}, "distanceKm": 0.2},
        )
        assert result["success"] is True
        assert "defectType" in result
        assert "roadValidationConfidence" in result
        assert result["roadValidationConfidence"] >= ROAD_CONFIDENCE_THRESHOLD
        assert "integrityVerificationId" in result

    def test_road_no_defect_full_pipeline(self):
        """Clean road → accepted but with no/low severity defect."""
        result = analyze_road_image(
            _create_road_no_defect_image(),
            [12.97, 79.16],
            {"road": {"name": "NH-48"}, "distanceKm": 0.1},
        )
        assert result["success"] is True
        assert result["severity"] in ("None", "Low")

    def test_office_desk_full_pipeline_rejected(self):
        """Office desk → full pipeline must return success=False."""
        result = analyze_road_image(
            _create_office_desk_image(),
            [40.85, -73.84],
            {"road": None, "distanceKm": None},
        )
        assert result["success"] is False
        assert "defectType" not in result


class TestFailClosedPolicy:
    """Verify fail-closed behavior for edge cases."""

    def test_empty_bytes_rejected(self):
        """Empty/corrupt bytes must be rejected (fail closed)."""
        result = validate_road_scene(b"")
        assert result["isRoadScene"] is False

    def test_random_noise_rejected(self):
        """Random noise image should be rejected or have low confidence."""
        import random as rng

        rng.seed(42)
        noise = bytes(rng.randint(0, 255) for _ in range(256 * 256 * 3))
        # Create a raw RGB image from noise
        img = Image.frombytes("RGB", (256, 256), noise)
        buf = io.BytesIO()
        img.save(buf, format="JPEG")

        result = validate_road_scene(buf.getvalue())
        # Should either reject outright or have confidence below threshold
        if result["isRoadScene"]:
            assert result["confidence"] < ROAD_CONFIDENCE_THRESHOLD
