"""Liturgical calendar engine.

Computes liturgical season, color, feast (saint), and fasting status for a date.
Uses Western (Roman) calendar. Approximation good enough for MVP.
"""
from datetime import date, timedelta
from typing import Optional


SEASON_GREEN = "green"      # Ordinary Time
SEASON_VIOLET = "violet"    # Advent, Lent
SEASON_WHITE = "white"      # Christmas, Easter, solemnities of Lord/Mary/Saints not martyrs
SEASON_RED = "red"           # Palm Sunday, Good Friday, Pentecost, martyrs, apostles
SEASON_ROSE = "rose"         # Gaudete (3rd Sun Advent), Laetare (4th Sun Lent)


def compute_easter(year: int) -> date:
    """Anonymous Gregorian / Meeus-Jones-Butcher algorithm."""
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    lp = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * lp) // 451
    month = (h + lp - 7 * m + 114) // 31
    day = ((h + lp - 7 * m + 114) % 31) + 1
    return date(year, month, day)


def first_sunday_of_advent(year: int) -> date:
    """Sunday closest to Nov 30 (St. Andrew). Always 4 Sundays before Christmas."""
    christmas = date(year, 12, 25)
    # Walk back to nearest Sunday before Christmas (incl 24th if Sun)
    sunday_before = christmas - timedelta(days=(christmas.weekday() + 1) % 7 + 1)
    # Now back 3 more Sundays
    return sunday_before - timedelta(weeks=3)


# Notable feasts: month/day -> (name, color, rank, fasting?)
# rank: solemnity, feast, memorial, optional, feria
FIXED_FEASTS = {
    (1, 1): ("Solemnity of Mary, Mother of God", SEASON_WHITE, "solemnity"),
    (1, 6): ("Epiphany of the Lord", SEASON_WHITE, "solemnity"),
    (1, 25): ("Conversion of St. Paul", SEASON_WHITE, "feast"),
    (2, 2): ("Presentation of the Lord", SEASON_WHITE, "feast"),
    (3, 19): ("St. Joseph, Spouse of the BVM", SEASON_WHITE, "solemnity"),
    (3, 25): ("Annunciation of the Lord", SEASON_WHITE, "solemnity"),
    (6, 24): ("Nativity of St. John the Baptist", SEASON_WHITE, "solemnity"),
    (6, 29): ("Sts. Peter and Paul, Apostles", SEASON_RED, "solemnity"),
    (8, 6): ("Transfiguration of the Lord", SEASON_WHITE, "feast"),
    (8, 15): ("Assumption of the BVM", SEASON_WHITE, "solemnity"),
    (9, 14): ("Exaltation of the Holy Cross", SEASON_RED, "feast"),
    (9, 29): ("Sts. Michael, Gabriel, Raphael, Archangels", SEASON_WHITE, "feast"),
    (10, 7): ("Our Lady of the Rosary", SEASON_WHITE, "memorial"),
    (11, 1): ("All Saints", SEASON_WHITE, "solemnity"),
    (11, 2): ("All Souls", SEASON_VIOLET, "feast"),
    (12, 8): ("Immaculate Conception of the BVM", SEASON_WHITE, "solemnity"),
    (12, 12): ("Our Lady of Guadalupe", SEASON_WHITE, "feast"),
    (12, 25): ("Nativity of the Lord (Christmas)", SEASON_WHITE, "solemnity"),
    (12, 26): ("St. Stephen, First Martyr", SEASON_RED, "feast"),
    (12, 27): ("St. John, Apostle and Evangelist", SEASON_WHITE, "feast"),
    (12, 28): ("Holy Innocents, Martyrs", SEASON_RED, "feast"),
    # A few popular memorials
    (1, 28): ("St. Thomas Aquinas", SEASON_WHITE, "memorial"),
    (3, 17): ("St. Patrick", SEASON_WHITE, "optional"),
    (7, 11): ("St. Benedict, Abbot", SEASON_WHITE, "memorial"),
    (7, 22): ("St. Mary Magdalene", SEASON_WHITE, "feast"),
    (7, 31): ("St. Ignatius of Loyola", SEASON_WHITE, "memorial"),
    (8, 4): ("St. John Vianney", SEASON_WHITE, "memorial"),
    (8, 8): ("St. Dominic", SEASON_WHITE, "memorial"),
    (8, 28): ("St. Augustine", SEASON_WHITE, "memorial"),
    (9, 5): ("St. Teresa of Calcutta", SEASON_WHITE, "optional"),
    (10, 1): ("St. Thérèse of the Child Jesus", SEASON_WHITE, "memorial"),
    (10, 4): ("St. Francis of Assisi", SEASON_WHITE, "memorial"),
    (10, 15): ("St. Teresa of Avila", SEASON_WHITE, "memorial"),
    (10, 22): ("St. John Paul II", SEASON_WHITE, "optional"),
    (11, 22): ("St. Cecilia", SEASON_RED, "memorial"),
    (12, 6): ("St. Nicholas", SEASON_WHITE, "optional"),
    (12, 14): ("St. John of the Cross", SEASON_WHITE, "memorial"),
}


def liturgical_for(d: date) -> dict:
    year = d.year

    # Compute moveable feasts
    easter = compute_easter(year)
    ash_wednesday = easter - timedelta(days=46)
    palm_sunday = easter - timedelta(days=7)
    holy_thursday = easter - timedelta(days=3)
    good_friday = easter - timedelta(days=2)
    holy_saturday = easter - timedelta(days=1)
    pentecost = easter + timedelta(days=49)
    trinity_sunday = easter + timedelta(days=56)
    corpus_christi = easter + timedelta(days=60)  # Sunday after Trinity (USA)
    sacred_heart = easter + timedelta(days=68)
    christ_the_king = first_sunday_of_advent(year) - timedelta(days=7)
    advent_start = first_sunday_of_advent(year)
    gaudete = advent_start + timedelta(days=14)
    laetare = ash_wednesday + timedelta(days=25)  # 4th Sunday of Lent
    # Baptism of the Lord = Sunday after Jan 6 (MVP simplification)
    bol = date(year, 1, 7)
    while bol.weekday() != 6:
        bol += timedelta(days=1)

    # Default
    name = "Feria"
    color = SEASON_GREEN
    rank = "feria"
    season_name = "Ordinary Time"
    fasting = False
    abstinence = False

    # Fridays — abstinence in Catholic tradition
    is_friday = d.weekday() == 4

    # 1) Triduum and moveable solemnities
    if d == easter:
        name, color, rank, season_name = "Easter Sunday", SEASON_WHITE, "solemnity", "Easter Octave"
    elif d == palm_sunday:
        name, color, rank, season_name = "Palm Sunday of the Passion", SEASON_RED, "solemnity", "Holy Week"
        abstinence = True
    elif d == holy_thursday:
        name, color, rank, season_name = "Holy Thursday — Mass of the Lord's Supper", SEASON_WHITE, "solemnity", "Sacred Triduum"
    elif d == good_friday:
        name, color, rank, season_name = "Good Friday of the Lord's Passion", SEASON_RED, "solemnity", "Sacred Triduum"
        fasting, abstinence = True, True
    elif d == holy_saturday:
        name, color, rank, season_name = "Holy Saturday", SEASON_VIOLET, "solemnity", "Sacred Triduum"
    elif d == pentecost:
        name, color, rank, season_name = "Pentecost Sunday", SEASON_RED, "solemnity", "Easter"
    elif d == trinity_sunday:
        name, color, rank, season_name = "Most Holy Trinity", SEASON_WHITE, "solemnity", "Ordinary Time"
    elif d == corpus_christi:
        name, color, rank, season_name = "Most Holy Body and Blood of Christ", SEASON_WHITE, "solemnity", "Ordinary Time"
    elif d == sacred_heart:
        name, color, rank, season_name = "Most Sacred Heart of Jesus", SEASON_WHITE, "solemnity", "Ordinary Time"
    elif d == christ_the_king:
        name, color, rank, season_name = "Our Lord Jesus Christ, King of the Universe", SEASON_WHITE, "solemnity", "Ordinary Time"
    elif d == ash_wednesday:
        name, color, rank, season_name = "Ash Wednesday", SEASON_VIOLET, "feast", "Lent"
        fasting, abstinence = True, True
    elif d == bol:
        name, color, rank, season_name = "Baptism of the Lord", SEASON_WHITE, "feast", "Christmas"
    elif d == gaudete:
        name, color, rank, season_name = "Gaudete Sunday — III of Advent", SEASON_ROSE, "solemnity", "Advent"
    elif d == laetare:
        name, color, rank, season_name = "Laetare Sunday — IV of Lent", SEASON_ROSE, "solemnity", "Lent"
    else:
        # 2) Determine season first
        if advent_start <= d < date(year, 12, 25):
            season_name = "Advent"
            color = SEASON_VIOLET
        elif date(year, 12, 25) <= d <= date(year, 12, 31) or date(year, 1, 1) <= d <= bol:
            season_name = "Christmas"
            color = SEASON_WHITE
        elif ash_wednesday < d < easter:
            season_name = "Lent"
            color = SEASON_VIOLET
            if is_friday:
                abstinence = True
        elif easter < d <= pentecost:
            season_name = "Easter"
            color = SEASON_WHITE
        else:
            season_name = "Ordinary Time"
            color = SEASON_GREEN

        # 3) Override with fixed feast if present
        ff = FIXED_FEASTS.get((d.month, d.day))
        if ff:
            f_name, f_color, f_rank = ff
            # Don't override an Advent/Lent ferial unless solemnity/feast
            if season_name in ("Advent", "Lent") and f_rank in ("optional", "memorial"):
                # keep season, but show saint
                name = f_name
                rank = f_rank
            else:
                name = f_name
                color = f_color
                rank = f_rank

        if name == "Feria":
            # Friday in Ordinary time -> abstinence (traditional)
            if is_friday and season_name not in ("Easter",):
                abstinence = True

    # If solemnity falls on a Friday of Lent — fasting still applies in Lent, but abstinence rules can lift for solemnity
    if rank == "solemnity" and color != SEASON_VIOLET:
        # Solemnity removes Friday penance traditionally
        if is_friday and season_name != "Lent":
            abstinence = False

    return {
        "date": d.isoformat(),
        "name": name,
        "color": color,
        "rank": rank,
        "season": season_name,
        "fasting": fasting,
        "abstinence": abstinence,
        "is_sunday": d.weekday() == 6,
    }


def liturgical_month(year: int, month: int) -> list:
    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)
    days = []
    cur = date(year, month, 1)
    while cur < next_month:
        days.append(liturgical_for(cur))
        cur += timedelta(days=1)
    return days
