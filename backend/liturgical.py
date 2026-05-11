"""Liturgical calendar engine — Patria.

Computes liturgical season, color, feast (saint), and fasting status for a date.
Supports two variants:
  - "roman" (default): post-Vatican-II Roman calendar
  - "traditional": pre-1962 Tridentine calendar (Septuagesima, Sundays after Pentecost, etc.)

Approximation good enough for MVP.
"""
from datetime import date, timedelta


SEASON_GREEN = "green"      # Ordinary Time / Time after Pentecost / Time after Epiphany
SEASON_VIOLET = "violet"    # Advent, Lent, Septuagesima
SEASON_WHITE = "white"      # Christmas, Easter, solemnities of Lord/Mary/non-martyr Saints
SEASON_RED = "red"           # Palm Sunday, Good Friday, Pentecost, martyrs, apostles
SEASON_ROSE = "rose"         # Gaudete, Laetare


def compute_easter(year: int) -> date:
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
    christmas = date(year, 12, 25)
    sunday_before = christmas - timedelta(days=(christmas.weekday() + 1) % 7 + 1)
    return sunday_before - timedelta(weeks=3)


ROMAN_NUMERALS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
                  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX",
                  "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII",
                  "XXVIII", "XXIX", "XXX", "XXXI", "XXXII", "XXXIII", "XXXIV"]


def roman(n: int) -> str:
    return ROMAN_NUMERALS[n] if 0 <= n < len(ROMAN_NUMERALS) else str(n)


WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


# Notable fixed feasts: (month, day) -> (name_modern, name_traditional, color, rank)
FIXED_FEASTS = {
    (1, 1):  ("Solemnity of Mary, Mother of God",  "Circumcision of the Lord",           SEASON_WHITE, "solemnity"),
    (1, 6):  ("Epiphany of the Lord",              "Epiphany of the Lord",               SEASON_WHITE, "solemnity"),
    (1, 25): ("Conversion of St. Paul",            "Conversion of St. Paul",             SEASON_WHITE, "feast"),
    (2, 2):  ("Presentation of the Lord",          "Purification of the Blessed Virgin", SEASON_WHITE, "feast"),
    (2, 22): ("Chair of St. Peter",                "Chair of St. Peter at Antioch",      SEASON_WHITE, "feast"),
    (3, 17): ("St. Patrick",                       "St. Patrick, Bishop & Confessor",    SEASON_WHITE, "optional"),
    (3, 19): ("St. Joseph, Spouse of the BVM",     "St. Joseph, Spouse of the BVM",      SEASON_WHITE, "solemnity"),
    (3, 25): ("Annunciation of the Lord",          "Annunciation of the BVM",            SEASON_WHITE, "solemnity"),
    (5, 1):  ("St. Joseph the Worker",             "Sts. Philip & James, Apostles",      SEASON_WHITE, "memorial"),
    (6, 13): ("St. Anthony of Padua",              "St. Anthony of Padua, Confessor",    SEASON_WHITE, "memorial"),
    (6, 24): ("Nativity of St. John the Baptist",  "Nativity of St. John the Baptist",   SEASON_WHITE, "solemnity"),
    (6, 29): ("Sts. Peter and Paul, Apostles",     "Sts. Peter & Paul, Apostles",        SEASON_RED,   "solemnity"),
    (7, 11): ("St. Benedict, Abbot",               "St. Pius I, Pope & Martyr",          SEASON_WHITE, "memorial"),
    (7, 22): ("St. Mary Magdalene",                "St. Mary Magdalene, Penitent",       SEASON_WHITE, "feast"),
    (7, 26): ("Sts. Joachim & Anne",               "St. Anne, Mother of the BVM",        SEASON_WHITE, "memorial"),
    (7, 31): ("St. Ignatius of Loyola",            "St. Ignatius of Loyola, Confessor",  SEASON_WHITE, "memorial"),
    (8, 4):  ("St. John Vianney",                  "St. Dominic, Confessor",             SEASON_WHITE, "memorial"),
    (8, 6):  ("Transfiguration of the Lord",       "Transfiguration of the Lord",        SEASON_WHITE, "feast"),
    (8, 8):  ("St. Dominic",                       "Sts. Cyriacus & Companions, Martyrs", SEASON_WHITE, "memorial"),
    (8, 15): ("Assumption of the BVM",             "Assumption of the BVM",              SEASON_WHITE, "solemnity"),
    (8, 28): ("St. Augustine",                     "St. Augustine, Bp. & Doctor",        SEASON_WHITE, "memorial"),
    (9, 5):  ("St. Teresa of Calcutta",            "St. Lawrence Justinian, Bishop",     SEASON_WHITE, "optional"),
    (9, 14): ("Exaltation of the Holy Cross",      "Exaltation of the Holy Cross",       SEASON_RED,   "feast"),
    (9, 29): ("Sts. Michael, Gabriel, Raphael, Archangels", "St. Michael the Archangel", SEASON_WHITE, "feast"),
    (10, 1): ("St. Thérèse of the Child Jesus",    "St. Remigius, Bishop & Confessor",   SEASON_WHITE, "memorial"),
    (10, 4): ("St. Francis of Assisi",             "St. Francis of Assisi, Confessor",   SEASON_WHITE, "memorial"),
    (10, 7): ("Our Lady of the Rosary",            "Our Lady of the Most Holy Rosary",   SEASON_WHITE, "memorial"),
    (10, 15):("St. Teresa of Avila",               "St. Teresa of Avila, Virgin",        SEASON_WHITE, "memorial"),
    (10, 22):("St. John Paul II",                  "",                                   SEASON_WHITE, "optional"),
    (11, 1): ("All Saints",                        "All Saints",                         SEASON_WHITE, "solemnity"),
    (11, 2): ("All Souls",                         "Commemoration of All the Faithful Departed", SEASON_VIOLET, "feast"),
    (11, 22):("St. Cecilia",                       "St. Cecilia, Virgin & Martyr",       SEASON_RED,   "memorial"),
    (12, 6): ("St. Nicholas",                      "St. Nicholas, Bishop & Confessor",   SEASON_WHITE, "optional"),
    (12, 8): ("Immaculate Conception of the BVM",  "Immaculate Conception of the BVM",   SEASON_WHITE, "solemnity"),
    (12, 12):("Our Lady of Guadalupe",             "Our Lady of Guadalupe",              SEASON_WHITE, "feast"),
    (12, 14):("St. John of the Cross",             "",                                   SEASON_WHITE, "memorial"),
    (12, 25):("Nativity of the Lord (Christmas)",  "Nativity of the Lord (Christmas)",   SEASON_WHITE, "solemnity"),
    (12, 26):("St. Stephen, First Martyr",         "St. Stephen, Protomartyr",           SEASON_RED,   "feast"),
    (12, 27):("St. John, Apostle and Evangelist",  "St. John, Apostle & Evangelist",     SEASON_WHITE, "feast"),
    (12, 28):("Holy Innocents, Martyrs",           "Holy Innocents, Martyrs",            SEASON_RED,   "feast"),
    (1, 28): ("St. Thomas Aquinas",                "St. Cyril of Alexandria, Bp. & Doctor", SEASON_WHITE, "memorial"),
}


def _name_modern(d: date, season: str, season_start: date,
                 baptism_of_lord: date, ash_wed: date,
                 pentecost: date, christ_the_king: date) -> str:
    """Compose a ferial name like 'Monday — II Week in Ordinary Time'."""
    weekday = WEEKDAY_NAMES[d.weekday()]

    if season == "Advent":
        # Sundays vs. weekdays
        week = ((d - season_start).days // 7) + 1
        if d.weekday() == 6:
            return f"{roman(week)} Sunday of Advent"
        return f"{weekday} — {roman(week)} Week of Advent"
    if season == "Christmas":
        # Within octave (Dec 25 .. Jan 1)
        if date(d.year if d.month == 12 else d.year - 1, 12, 25) <= d <= date(d.year if d.month == 1 else d.year, 1, 1):
            return "Day in the Octave of the Nativity"
        return f"{weekday} — Christmas Season"
    if season == "Lent":
        # Week numbering starts at the Sunday following Ash Wednesday for Lent I
        first_sunday_lent = ash_wed + timedelta(days=(6 - ash_wed.weekday()) % 7 or 7)
        if d < first_sunday_lent:
            return f"{weekday} after Ash Wednesday"
        week = ((d - first_sunday_lent).days // 7) + 1
        if d.weekday() == 6:
            return f"{roman(week)} Sunday of Lent"
        return f"{weekday} — {roman(week)} Week of Lent"
    if season in ("Easter", "Easter Octave"):
        week = ((d - season_start).days // 7) + 1
        if d.weekday() == 6:
            return f"{roman(week)} Sunday of Easter"
        return f"{weekday} — {roman(week)} Week of Easter"
    if season == "Ordinary Time":
        # Week 1 of OT begins the day after the Baptism of the Lord.
        if d < ash_wed:
            week = ((d - baptism_of_lord).days // 7) + 1
        else:
            # After Pentecost — continuous numbering up to Christ the King
            # Compute "weeks remaining" so the final week is XXXIV (Christ the King)
            weeks_to_ck = ((christ_the_king - d).days // 7)
            week = 34 - weeks_to_ck
        week = max(1, min(34, week))
        if d.weekday() == 6:
            return f"{roman(week)} Sunday in Ordinary Time"
        return f"{weekday} — {roman(week)} Week in Ordinary Time"
    return weekday


def _name_traditional(d: date, season: str, season_start: date,
                      baptism_of_lord: date, ash_wed: date,
                      pentecost: date, christ_the_king: date) -> str:
    """Traditional pre-1962 naming: 'Sundays after Pentecost/Epiphany', Septuagesima."""
    weekday = WEEKDAY_NAMES[d.weekday()]

    if season == "Advent":
        week = ((d - season_start).days // 7) + 1
        if d.weekday() == 6:
            return f"{roman(week)} Sunday of Advent"
        return f"{weekday} — {roman(week)} Week of Advent"
    if season == "Christmas":
        return f"{weekday} — Christmastide"
    if season in ("Septuagesima",):
        # Three pre-Lenten Sundays: Septuagesima, Sexagesima, Quinquagesima
        diff = (d - season_start).days
        weeks = diff // 7
        names = ["Septuagesima", "Sexagesima", "Quinquagesima"]
        sname = names[min(weeks, 2)]
        if d.weekday() == 6:
            return f"{sname} Sunday"
        return f"{weekday} after {sname}"
    if season == "Lent":
        first_sunday_lent = ash_wed + timedelta(days=(6 - ash_wed.weekday()) % 7 or 7)
        if d < first_sunday_lent:
            return f"{weekday} after Ash Wednesday"
        week = ((d - first_sunday_lent).days // 7) + 1
        if d.weekday() == 6:
            return f"{roman(week)} Sunday in Lent"
        return f"{weekday} of the {roman(week)} Week in Lent"
    if season in ("Easter", "Easter Octave", "Paschaltide"):
        week = ((d - season_start).days // 7) + 1
        if d.weekday() == 6:
            return f"{roman(week)} Sunday after Easter"
        return f"{weekday} after {roman(week)} Sunday of Easter"
    if season == "Ordinary Time":
        if d < ash_wed:
            # "Time after Epiphany" — Sundays after Epiphany
            sundays = ((d - baptism_of_lord).days // 7) + 1
            sundays = max(1, sundays)
            if d.weekday() == 6:
                return f"{roman(sundays)} Sunday after Epiphany"
            return f"{weekday} after {roman(sundays)} Sunday after Epiphany"
        # Time after Pentecost
        diff = (d - pentecost).days
        week = (diff // 7) + 1
        if d.weekday() == 6:
            return f"{roman(week)} Sunday after Pentecost"
        return f"{weekday} after {roman(week)} Sunday after Pentecost"
    return weekday


def liturgical_for(d: date, variant: str = "roman") -> dict:
    year = d.year
    variant = variant if variant in ("roman", "traditional") else "roman"

    easter = compute_easter(year)
    ash_wednesday = easter - timedelta(days=46)
    palm_sunday = easter - timedelta(days=7)
    holy_thursday = easter - timedelta(days=3)
    good_friday = easter - timedelta(days=2)
    holy_saturday = easter - timedelta(days=1)
    pentecost = easter + timedelta(days=49)
    trinity_sunday = easter + timedelta(days=56)
    corpus_christi_modern = easter + timedelta(days=60)   # Sun after Trinity (US)
    corpus_christi_trad = easter + timedelta(days=60)     # In tradition, Thursday after Trinity (60th day approx)
    sacred_heart = easter + timedelta(days=68)
    christ_the_king = first_sunday_of_advent(year) - timedelta(days=7)
    advent_start = first_sunday_of_advent(year)
    gaudete = advent_start + timedelta(days=14)
    laetare = ash_wednesday + timedelta(days=25)
    septuagesima = ash_wednesday - timedelta(days=17)  # 3 Sundays before Lent
    bol = date(year, 1, 7)
    while bol.weekday() != 6:
        bol += timedelta(days=1)

    is_friday = d.weekday() == 4
    is_sunday = d.weekday() == 6

    # Determine season
    if advent_start <= d < date(year, 12, 25):
        season_name, season_start, color = "Advent", advent_start, SEASON_VIOLET
    elif date(year, 12, 25) <= d <= date(year, 12, 31) or date(year, 1, 1) <= d <= bol:
        # Christmas season
        season_name = "Christmas"
        season_start = date(d.year if d.month == 12 else d.year - 1, 12, 25)
        color = SEASON_WHITE
    elif variant == "traditional" and septuagesima <= d < ash_wednesday:
        season_name, season_start, color = "Septuagesima", septuagesima, SEASON_VIOLET
    elif ash_wednesday <= d < easter:
        season_name, season_start, color = "Lent", ash_wednesday, SEASON_VIOLET
    elif easter <= d <= pentecost:
        season_name, season_start, color = "Easter", easter, SEASON_WHITE
    else:
        season_name, season_start, color = "Ordinary Time", bol + timedelta(days=1), SEASON_GREEN

    # Default ferial name
    if variant == "traditional":
        name = _name_traditional(d, season_name, season_start, bol, ash_wednesday, pentecost, christ_the_king)
    else:
        name = _name_modern(d, season_name, season_start, bol, ash_wednesday, pentecost, christ_the_king)
    rank = "feria" if not is_sunday else "sunday"
    fasting = False
    abstinence = False

    # Moveable solemnities/feasts (override)
    if d == easter:
        name, color, rank, season_name = "Easter Sunday", SEASON_WHITE, "solemnity", "Easter Octave"
    elif d == palm_sunday:
        name, color, rank = "Palm Sunday of the Passion", SEASON_RED, "solemnity"
        abstinence = True
    elif d == holy_thursday:
        name, color, rank = "Holy Thursday — Mass of the Lord's Supper", SEASON_WHITE, "solemnity"
    elif d == good_friday:
        name, color, rank = "Good Friday of the Lord's Passion", SEASON_RED, "solemnity"
        fasting, abstinence = True, True
    elif d == holy_saturday:
        name, color, rank = "Holy Saturday", SEASON_VIOLET, "solemnity"
    elif d == pentecost:
        name, color, rank = "Pentecost Sunday", SEASON_RED, "solemnity"
    elif d == trinity_sunday:
        name, color, rank = "Most Holy Trinity", SEASON_WHITE, "solemnity"
    elif d == (corpus_christi_trad if variant == "traditional" else corpus_christi_modern):
        name = "Most Holy Body and Blood of Christ" if variant == "roman" else "Corpus Christi"
        color, rank = SEASON_WHITE, "solemnity"
    elif d == sacred_heart:
        name, color, rank = "Most Sacred Heart of Jesus", SEASON_WHITE, "solemnity"
    elif d == christ_the_king and variant == "roman":
        name, color, rank = "Our Lord Jesus Christ, King of the Universe", SEASON_WHITE, "solemnity"
    elif d == ash_wednesday:
        name, color, rank = "Ash Wednesday", SEASON_VIOLET, "feast"
        fasting, abstinence = True, True
    elif d == bol and variant == "roman":
        name, color, rank, season_name = "Baptism of the Lord", SEASON_WHITE, "feast", "Christmas"
    elif d == gaudete:
        name = "Gaudete Sunday — III of Advent" if variant == "roman" else "Gaudete — III Sunday of Advent"
        color, rank = SEASON_ROSE, "solemnity"
    elif d == laetare:
        name = "Laetare Sunday — IV of Lent" if variant == "roman" else "Laetare — IV Sunday of Lent"
        color, rank = SEASON_ROSE, "solemnity"

    # Fixed feasts override (don't trample our newly-named moveables above)
    if rank in ("feria", "sunday"):
        ff = FIXED_FEASTS.get((d.month, d.day))
        if ff:
            f_modern, f_trad, f_color, f_rank = ff
            chosen = f_trad if (variant == "traditional" and f_trad) else f_modern
            if season_name in ("Advent", "Lent", "Septuagesima") and f_rank in ("optional", "memorial"):
                # Keep season name structure but show the saint inline
                name = f"{name} · {chosen}"
                rank = f_rank
            else:
                name = chosen
                color = f_color
                rank = f_rank

    # Friday abstinence (traditional default through year; Lent strictly)
    if rank in ("feria", "sunday", "memorial", "optional"):
        if season_name == "Lent" and is_friday:
            abstinence = True
        elif season_name not in ("Easter", "Easter Octave") and is_friday and not is_sunday:
            # Optional Friday penance; do not flag fasting, just abstinence-eligible
            abstinence = True

    # Solemnity lifts Friday penance (outside of Lent)
    if rank == "solemnity" and color != SEASON_VIOLET and season_name != "Lent":
        abstinence = False

    return {
        "date": d.isoformat(),
        "name": name,
        "color": color,
        "rank": rank,
        "season": season_name,
        "fasting": fasting,
        "abstinence": abstinence,
        "is_sunday": is_sunday,
        "variant": variant,
    }


def liturgical_month(year: int, month: int, variant: str = "roman") -> list:
    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)
    days = []
    cur = date(year, month, 1)
    while cur < next_month:
        days.append(liturgical_for(cur, variant=variant))
        cur += timedelta(days=1)
    return days
