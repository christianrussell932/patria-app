"""Patria v0.4 — Liturgical season_label tests.

Verify the new `season_label` field returned by GET /api/liturgical/today
for various seasons & variants. Also includes a quick regression on
fixed-feast precedence (St. Francis of Assisi 2026-10-04).
"""
import os
import requests
import pytest

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or "https://emergent-blueprint-2.preview.emergentagent.com").rstrip("/")


# ---- helpers ----------------------------------------------------------------
def _get(d, variant="roman"):
    """Fetch /api/liturgical/today for a given date + variant."""
    r = requests.get(
        f"{BASE_URL}/api/liturgical/today",
        params={"d": d, "variant": variant},
        timeout=20,
    )
    assert r.status_code == 200, f"GET liturgical/today {d} {variant} → {r.status_code} {r.text}"
    return r.json()


# ---- season_label format ----------------------------------------------------
class TestSeasonLabelField:
    def test_field_present_on_every_response(self):
        # spot-check a handful of dates across the year
        for d in ["2026-01-15", "2026-03-01", "2026-04-15", "2026-07-04",
                  "2026-10-04", "2026-11-30", "2026-12-25"]:
            data = _get(d)
            assert "season_label" in data, f"missing season_label for {d}"
            assert isinstance(data["season_label"], str)
            assert len(data["season_label"]) > 0

    def test_easter_season_label_roman(self):
        # 2026-05-17 is in Easter season (Easter = 2026-04-05; +6 wks)
        data = _get("2026-05-17")  # Sun
        assert data["season"] == "Easter"
        # 2026-05-17 should land in VI Week of Easter
        assert "Easter Season" in data["season_label"]
        assert "Week of Easter" in data["season_label"]
        assert "·" in data["season_label"]

    def test_ordinary_time_label_roman(self):
        # 2026-10-13 — Ordinary Time, no special feast
        data = _get("2026-10-13")
        assert data["season"] == "Ordinary Time"
        assert data["season_label"].startswith("Ordinary Time")
        assert "Week in Ordinary Time" in data["season_label"]
        assert "·" in data["season_label"]

    def test_christmas_season_label(self):
        # 2026-12-28 — Christmas season (after Christmas, before Baptism of Lord)
        data = _get("2026-12-28")
        assert data["season"] == "Christmas"
        assert data["season_label"] == "Christmas Season"

    def test_lent_season_label(self):
        # Ash Wed 2026 = 2026-02-18; First Sunday of Lent = 2026-02-22; IV week = ~ 2026-03-15
        data = _get("2026-03-15")  # IV Sunday of Lent
        assert data["season"] == "Lent"
        assert data["season_label"].startswith("Lent")
        assert "Week of Lent" in data["season_label"]

    def test_advent_season_label(self):
        # First Sun of Advent 2025 = 2025-11-30 → II Sun 2025-12-07
        data = _get("2025-12-07")
        assert data["season"] == "Advent"
        assert data["season_label"].startswith("Advent")
        assert "Week of Advent" in data["season_label"]


# ---- Feast precedence -------------------------------------------------------
class TestFixedFeastWithSeasonLabel:
    def test_st_francis_2026_10_04(self):
        # 2026-10-04 is a Sunday — but FIXED_FEASTS overrides ferial Sunday only when
        # rank starts as 'feria'/'sunday'. Let's verify the override flow:
        data = _get("2026-10-04")
        # primary name = saint (St. Francis); season_label secondary = Ordinary Time
        assert "St. Francis of Assisi" in data["name"], f"got: {data['name']}"
        assert data["season"] == "Ordinary Time"
        assert "Ordinary Time" in data["season_label"]
        assert "Week in Ordinary Time" in data["season_label"]


# ---- Traditional variant ----------------------------------------------------
class TestTraditionalVariantSeasonLabel:
    def test_time_after_pentecost(self):
        # 2026-07-05 (Sunday) — well after Pentecost 2026 = 2026-05-24
        data = _get("2026-07-05", variant="traditional")
        assert data["variant"] == "traditional"
        assert data["season"] == "Ordinary Time"
        assert data["season_label"].startswith("Time after Pentecost")
        assert "Sunday after Pentecost" in data["season_label"]

    def test_time_after_epiphany(self):
        # 2026-01-25 — before Septuagesima (which begins ~2026-02-01); BoL 2026 = 2026-01-11
        data = _get("2026-01-25", variant="traditional")
        assert data["variant"] == "traditional"
        assert data["season"] == "Ordinary Time"
        assert data["season_label"].startswith("Time after Epiphany")
        assert "Sunday after Epiphany" in data["season_label"]

    def test_traditional_christmas(self):
        data = _get("2026-12-28", variant="traditional")
        assert data["season"] == "Christmas"
        assert data["season_label"] == "Christmas Season"


# ---- Regression: existing fields still intact -------------------------------
class TestRegressionLiturgicalShape:
    def test_response_shape(self):
        data = _get("2026-05-17")
        for k in ("date", "name", "color", "rank", "season",
                  "season_label", "fasting", "abstinence", "is_sunday", "variant"):
            assert k in data, f"missing key: {k}"
