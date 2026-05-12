"""Regression tests for v0.6 — Optional memorials surfacing.

Verifies the new `optional_memorials` API field and the rule that optional
memorials must surface as a SECONDARY liturgical identity on ferial / Sunday
days but never displace higher-rank celebrations.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from datetime import date  # noqa: E402
from liturgical import liturgical_for  # noqa: E402


def test_may_12_2026_surfaces_nereus_achilleus_and_pancras():
    out = liturgical_for(date(2026, 5, 12), variant="roman")
    # Primary identity stays the ferial — never displaced
    assert out["rank"] == "feria"
    assert out["name"] == "Tuesday — VI Week of Easter"
    # season_label stays clean structural metadata
    assert out["season_label"] == "Easter Season · VI Week of Easter"
    # optional_memorials surfaces BOTH saints
    names = [m["name"] for m in out["optional_memorials"]]
    assert "Sts. Nereus and Achilleus, Martyrs" in names
    assert "St. Pancras, Martyr" in names
    # Both should be liturgical red (martyrs)
    assert all(m["color"] == "red" for m in out["optional_memorials"])


def test_higher_rank_feast_suppresses_optionals():
    # Dec 28 = Holy Innocents, Martyrs (feast — obligatory). Optionals must NOT
    # appear because the feast already takes the day.
    out = liturgical_for(date(2026, 12, 28), variant="roman")
    assert out["name"] == "Holy Innocents, Martyrs"
    assert out["optional_memorials"] == []


def test_dec_29_ferial_christmas_surfaces_thomas_becket():
    # Dec 29 is ferial in Christmas season. St. Thomas Becket is optional.
    out = liturgical_for(date(2026, 12, 29), variant="roman")
    assert out["rank"] == "feria"
    names = [m["name"] for m in out["optional_memorials"]]
    assert any("Thomas Becket" in n for n in names)


def test_optional_memorials_field_always_present_as_list():
    # Every response must have the field, even when empty.
    for d in (date(2026, 5, 12), date(2026, 4, 5), date(2026, 12, 25), date(2026, 11, 22)):
        out = liturgical_for(d, variant="roman")
        assert "optional_memorials" in out
        assert isinstance(out["optional_memorials"], list)


def test_multiple_saints_same_day():
    # Apr 23 (modern): St. George + St. Adalbert both optional martyrs.
    out = liturgical_for(date(2026, 4, 23), variant="roman")
    if out["rank"] == "feria":  # if season hasn't been displaced by Easter mid-period
        names = [m["name"] for m in out["optional_memorials"]]
        assert any("George" in n for n in names)
        assert any("Adalbert" in n for n in names)


def test_optional_memorials_traditional_variant():
    # Traditional 1962 entry on May 12 should fall back to the trad-specific list.
    out = liturgical_for(date(2026, 5, 12), variant="traditional")
    if out["rank"] == "feria":
        names = [m["name"] for m in out["optional_memorials"]]
        assert any("Nereus" in n for n in names)


def test_season_label_unchanged_by_optionals():
    """Sanity: season_label is now pure structural metadata; saints live in
    optional_memorials. (This preserves the v0.4 contract for downstream
    clients that index into season_label for season+week text.)"""
    out = liturgical_for(date(2026, 5, 12), variant="roman")
    assert out["season_label"] == "Easter Season · VI Week of Easter"
    assert " · St" not in out["season_label"]  # no saint suffix
