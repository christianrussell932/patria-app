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
    """The First Sunday of Advent — Sunday closest to St. Andrew (Nov 30).

    Equivalently: the Sunday strictly before Christmas, minus 3 weeks.
    weekday(): Mon=0 .. Sun=6. Days back to Sunday strictly before Christmas
    is `weekday() + 1` (so a Sunday Christmas yields 7 days back, not 0).
    """
    christmas = date(year, 12, 25)
    sunday_before_christmas = christmas - timedelta(days=christmas.weekday() + 1)
    return sunday_before_christmas - timedelta(weeks=3)


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


# ---------------------------------------------------------------------------
# Optional memorials (modern Roman calendar)
#
# These celebrate saints whose observance is OPTIONAL — they should never
# eclipse the ferial day of the season, but they should appear as a SECONDARY
# liturgical identity. Multiple saints can fall on the same day (e.g., May 12:
# Sts. Nereus & Achilleus AND St. Pancras), so each entry is a list.
#
# Entries are deliberately omitted on days that already host an obligatory
# memorial / feast / solemnity in FIXED_FEASTS — the higher-rank celebration
# subsumes them. Days with an obligatory memorial that the user has marked as
# `memorial` in FIXED_FEASTS may still gain an additional optional memorial
# here (the obligatory becomes primary; this becomes tertiary commemoration).
# ---------------------------------------------------------------------------
OPTIONAL_MEMORIALS_MODERN: dict[tuple[int, int], list[dict]] = {
    # January
    (1, 2):  [{"name": "Sts. Basil the Great and Gregory Nazianzen, Bishops & Doctors", "color": SEASON_WHITE}],
    (1, 3):  [{"name": "The Most Holy Name of Jesus", "color": SEASON_WHITE}],
    (1, 4):  [{"name": "St. Elizabeth Ann Seton", "color": SEASON_WHITE}],
    (1, 5):  [{"name": "St. John Neumann, Bishop", "color": SEASON_WHITE}],
    (1, 7):  [{"name": "St. Raymond of Penyafort, Priest", "color": SEASON_WHITE}],
    (1, 13): [{"name": "St. Hilary, Bishop & Doctor", "color": SEASON_WHITE}],
    (1, 17): [{"name": "St. Anthony, Abbot", "color": SEASON_WHITE}],
    (1, 20): [
        {"name": "St. Fabian, Pope & Martyr", "color": SEASON_RED},
        {"name": "St. Sebastian, Martyr", "color": SEASON_RED},
    ],
    (1, 21): [{"name": "St. Agnes, Virgin & Martyr", "color": SEASON_RED}],
    (1, 22): [{"name": "St. Vincent, Deacon & Martyr", "color": SEASON_RED}],
    (1, 24): [{"name": "St. Francis de Sales, Bishop & Doctor", "color": SEASON_WHITE}],
    (1, 26): [{"name": "Sts. Timothy and Titus, Bishops", "color": SEASON_WHITE}],
    (1, 27): [{"name": "St. Angela Merici, Virgin", "color": SEASON_WHITE}],
    (1, 31): [{"name": "St. John Bosco, Priest", "color": SEASON_WHITE}],
    # February
    (2, 3):  [
        {"name": "St. Blaise, Bishop & Martyr", "color": SEASON_RED},
        {"name": "St. Ansgar, Bishop", "color": SEASON_WHITE},
    ],
    (2, 5):  [{"name": "St. Agatha, Virgin & Martyr", "color": SEASON_RED}],
    (2, 6):  [{"name": "Sts. Paul Miki and Companions, Martyrs", "color": SEASON_RED}],
    (2, 8):  [
        {"name": "St. Jerome Emiliani", "color": SEASON_WHITE},
        {"name": "St. Josephine Bakhita, Virgin", "color": SEASON_WHITE},
    ],
    (2, 10): [{"name": "St. Scholastica, Virgin", "color": SEASON_WHITE}],
    (2, 11): [{"name": "Our Lady of Lourdes", "color": SEASON_WHITE}],
    (2, 14): [{"name": "Sts. Cyril, Monk, and Methodius, Bishop", "color": SEASON_WHITE}],
    (2, 17): [{"name": "Seven Holy Founders of the Servite Order", "color": SEASON_WHITE}],
    (2, 21): [{"name": "St. Peter Damian, Bishop & Doctor", "color": SEASON_WHITE}],
    (2, 23): [{"name": "St. Polycarp, Bishop & Martyr", "color": SEASON_RED}],
    # March
    (3, 4):  [{"name": "St. Casimir", "color": SEASON_WHITE}],
    (3, 7):  [{"name": "Sts. Perpetua and Felicity, Martyrs", "color": SEASON_RED}],
    (3, 8):  [{"name": "St. John of God, Religious", "color": SEASON_WHITE}],
    (3, 9):  [{"name": "St. Frances of Rome, Religious", "color": SEASON_WHITE}],
    (3, 18): [{"name": "St. Cyril of Jerusalem, Bishop & Doctor", "color": SEASON_WHITE}],
    (3, 23): [{"name": "St. Turibius of Mogrovejo, Bishop", "color": SEASON_WHITE}],
    # April
    (4, 2):  [{"name": "St. Francis of Paola, Hermit", "color": SEASON_WHITE}],
    (4, 4):  [{"name": "St. Isidore of Seville, Bishop & Doctor", "color": SEASON_WHITE}],
    (4, 5):  [{"name": "St. Vincent Ferrer, Priest", "color": SEASON_WHITE}],
    (4, 7):  [{"name": "St. John Baptist de la Salle, Priest", "color": SEASON_WHITE}],
    (4, 11): [{"name": "St. Stanislaus, Bishop & Martyr", "color": SEASON_RED}],
    (4, 13): [{"name": "St. Martin I, Pope & Martyr", "color": SEASON_RED}],
    (4, 21): [{"name": "St. Anselm, Bishop & Doctor", "color": SEASON_WHITE}],
    (4, 23): [
        {"name": "St. George, Martyr", "color": SEASON_RED},
        {"name": "St. Adalbert, Bishop & Martyr", "color": SEASON_RED},
    ],
    (4, 24): [{"name": "St. Fidelis of Sigmaringen, Priest & Martyr", "color": SEASON_RED}],
    (4, 28): [
        {"name": "St. Peter Chanel, Priest & Martyr", "color": SEASON_RED},
        {"name": "St. Louis Marie de Montfort, Priest", "color": SEASON_WHITE},
    ],
    (4, 29): [{"name": "St. Catherine of Siena, Virgin & Doctor", "color": SEASON_WHITE}],
    (4, 30): [{"name": "St. Pius V, Pope", "color": SEASON_WHITE}],
    # May
    (5, 2):  [{"name": "St. Athanasius, Bishop & Doctor", "color": SEASON_WHITE}],
    (5, 3):  [{"name": "Sts. Philip and James, Apostles", "color": SEASON_RED}],
    (5, 10): [{"name": "St. Damien de Veuster of Molokai, Priest", "color": SEASON_WHITE}],
    (5, 12): [
        {"name": "Sts. Nereus and Achilleus, Martyrs", "color": SEASON_RED},
        {"name": "St. Pancras, Martyr", "color": SEASON_RED},
    ],
    (5, 13): [{"name": "Our Lady of Fatima", "color": SEASON_WHITE}],
    (5, 15): [{"name": "St. Isidore the Farmer", "color": SEASON_WHITE}],
    (5, 18): [{"name": "St. John I, Pope & Martyr", "color": SEASON_RED}],
    (5, 20): [{"name": "St. Bernardine of Siena, Priest", "color": SEASON_WHITE}],
    (5, 21): [{"name": "St. Christopher Magallanes and Companions, Martyrs", "color": SEASON_RED}],
    (5, 22): [{"name": "St. Rita of Cascia, Religious", "color": SEASON_WHITE}],
    (5, 25): [
        {"name": "St. Bede the Venerable, Priest & Doctor", "color": SEASON_WHITE},
        {"name": "St. Gregory VII, Pope", "color": SEASON_WHITE},
        {"name": "St. Mary Magdalene de'Pazzi, Virgin", "color": SEASON_WHITE},
    ],
    (5, 26): [{"name": "St. Philip Neri, Priest", "color": SEASON_WHITE}],
    (5, 27): [{"name": "St. Augustine of Canterbury, Bishop", "color": SEASON_WHITE}],
    # June
    (6, 1):  [{"name": "St. Justin, Martyr", "color": SEASON_RED}],
    (6, 2):  [{"name": "Sts. Marcellinus and Peter, Martyrs", "color": SEASON_RED}],
    (6, 3):  [{"name": "Sts. Charles Lwanga and Companions, Martyrs", "color": SEASON_RED}],
    (6, 5):  [{"name": "St. Boniface, Bishop & Martyr", "color": SEASON_RED}],
    (6, 6):  [{"name": "St. Norbert, Bishop", "color": SEASON_WHITE}],
    (6, 9):  [{"name": "St. Ephrem, Deacon & Doctor", "color": SEASON_WHITE}],
    (6, 11): [{"name": "St. Barnabas, Apostle", "color": SEASON_RED}],
    (6, 19): [{"name": "St. Romuald, Abbot", "color": SEASON_WHITE}],
    (6, 21): [{"name": "St. Aloysius Gonzaga, Religious", "color": SEASON_WHITE}],
    (6, 22): [
        {"name": "St. Paulinus of Nola, Bishop", "color": SEASON_WHITE},
        {"name": "Sts. John Fisher, Bishop & Martyr, and Thomas More, Martyr", "color": SEASON_RED},
    ],
    (6, 27): [{"name": "St. Cyril of Alexandria, Bishop & Doctor", "color": SEASON_WHITE}],
    (6, 28): [{"name": "St. Irenaeus, Bishop, Martyr & Doctor", "color": SEASON_RED}],
    # July
    (7, 1):  [{"name": "St. Junipero Serra, Priest", "color": SEASON_WHITE}],
    (7, 3):  [{"name": "St. Thomas, Apostle", "color": SEASON_RED}],
    (7, 4):  [{"name": "St. Elizabeth of Portugal", "color": SEASON_WHITE}],
    (7, 5):  [{"name": "St. Anthony Mary Zaccaria, Priest", "color": SEASON_WHITE}],
    (7, 6):  [{"name": "St. Maria Goretti, Virgin & Martyr", "color": SEASON_RED}],
    (7, 9):  [{"name": "Sts. Augustine Zhao Rong and Companions, Martyrs", "color": SEASON_RED}],
    (7, 13): [{"name": "St. Henry", "color": SEASON_WHITE}],
    (7, 14): [
        {"name": "St. Camillus de Lellis, Priest", "color": SEASON_WHITE},
        {"name": "St. Kateri Tekakwitha, Virgin", "color": SEASON_WHITE},
    ],
    (7, 15): [{"name": "St. Bonaventure, Bishop & Doctor", "color": SEASON_WHITE}],
    (7, 16): [{"name": "Our Lady of Mount Carmel", "color": SEASON_WHITE}],
    (7, 20): [{"name": "St. Apollinaris, Bishop & Martyr", "color": SEASON_RED}],
    (7, 21): [{"name": "St. Lawrence of Brindisi, Priest & Doctor", "color": SEASON_WHITE}],
    (7, 23): [{"name": "St. Bridget of Sweden, Religious", "color": SEASON_WHITE}],
    (7, 24): [{"name": "St. Sharbel Makhluf, Priest", "color": SEASON_WHITE}],
    (7, 25): [{"name": "St. James, Apostle", "color": SEASON_RED}],
    (7, 29): [{"name": "Sts. Martha, Mary, and Lazarus", "color": SEASON_WHITE}],
    (7, 30): [{"name": "St. Peter Chrysologus, Bishop & Doctor", "color": SEASON_WHITE}],
    # August
    (8, 1):  [{"name": "St. Alphonsus Liguori, Bishop & Doctor", "color": SEASON_WHITE}],
    (8, 2):  [
        {"name": "St. Eusebius of Vercelli, Bishop", "color": SEASON_WHITE},
        {"name": "St. Peter Julian Eymard, Priest", "color": SEASON_WHITE},
    ],
    (8, 5):  [{"name": "Dedication of the Basilica of St. Mary Major", "color": SEASON_WHITE}],
    (8, 7):  [
        {"name": "St. Sixtus II, Pope, and Companions, Martyrs", "color": SEASON_RED},
        {"name": "St. Cajetan, Priest", "color": SEASON_WHITE},
    ],
    (8, 9):  [{"name": "St. Teresa Benedicta of the Cross, Virgin & Martyr", "color": SEASON_RED}],
    (8, 10): [{"name": "St. Lawrence, Deacon & Martyr", "color": SEASON_RED}],
    (8, 11): [{"name": "St. Clare, Virgin", "color": SEASON_WHITE}],
    (8, 12): [{"name": "St. Jane Frances de Chantal, Religious", "color": SEASON_WHITE}],
    (8, 13): [{"name": "Sts. Pontian, Pope, and Hippolytus, Priest, Martyrs", "color": SEASON_RED}],
    (8, 14): [{"name": "St. Maximilian Mary Kolbe, Priest & Martyr", "color": SEASON_RED}],
    (8, 16): [{"name": "St. Stephen of Hungary", "color": SEASON_WHITE}],
    (8, 19): [{"name": "St. John Eudes, Priest", "color": SEASON_WHITE}],
    (8, 20): [{"name": "St. Bernard, Abbot & Doctor", "color": SEASON_WHITE}],
    (8, 21): [{"name": "St. Pius X, Pope", "color": SEASON_WHITE}],
    (8, 22): [{"name": "Queenship of the Blessed Virgin Mary", "color": SEASON_WHITE}],
    (8, 23): [{"name": "St. Rose of Lima, Virgin", "color": SEASON_WHITE}],
    (8, 24): [{"name": "St. Bartholomew, Apostle", "color": SEASON_RED}],
    (8, 25): [
        {"name": "St. Louis", "color": SEASON_WHITE},
        {"name": "St. Joseph Calasanz, Priest", "color": SEASON_WHITE},
    ],
    (8, 27): [{"name": "St. Monica", "color": SEASON_WHITE}],
    (8, 29): [{"name": "Passion of St. John the Baptist", "color": SEASON_RED}],
    # September
    (9, 3):  [{"name": "St. Gregory the Great, Pope & Doctor", "color": SEASON_WHITE}],
    (9, 9):  [{"name": "St. Peter Claver, Priest", "color": SEASON_WHITE}],
    (9, 12): [{"name": "The Most Holy Name of Mary", "color": SEASON_WHITE}],
    (9, 13): [{"name": "St. John Chrysostom, Bishop & Doctor", "color": SEASON_WHITE}],
    (9, 15): [{"name": "Our Lady of Sorrows", "color": SEASON_WHITE}],
    (9, 16): [{"name": "Sts. Cornelius, Pope, and Cyprian, Bishop, Martyrs", "color": SEASON_RED}],
    (9, 17): [
        {"name": "St. Robert Bellarmine, Bishop & Doctor", "color": SEASON_WHITE},
        {"name": "St. Hildegard of Bingen, Virgin & Doctor", "color": SEASON_WHITE},
    ],
    (9, 19): [{"name": "St. Januarius, Bishop & Martyr", "color": SEASON_RED}],
    (9, 20): [{"name": "Sts. Andrew Kim Tae-gon, Priest, Paul Chong Ha-sang, and Companions, Martyrs", "color": SEASON_RED}],
    (9, 21): [{"name": "St. Matthew, Apostle & Evangelist", "color": SEASON_RED}],
    (9, 23): [{"name": "St. Pius of Pietrelcina (Padre Pio), Priest", "color": SEASON_WHITE}],
    (9, 26): [{"name": "Sts. Cosmas and Damian, Martyrs", "color": SEASON_RED}],
    (9, 27): [{"name": "St. Vincent de Paul, Priest", "color": SEASON_WHITE}],
    (9, 28): [
        {"name": "St. Wenceslaus, Martyr", "color": SEASON_RED},
        {"name": "Sts. Lawrence Ruiz and Companions, Martyrs", "color": SEASON_RED},
    ],
    (9, 30): [{"name": "St. Jerome, Priest & Doctor", "color": SEASON_WHITE}],
    # October
    (10, 2): [{"name": "The Holy Guardian Angels", "color": SEASON_WHITE}],
    (10, 6): [
        {"name": "St. Bruno, Priest", "color": SEASON_WHITE},
        {"name": "Blessed Marie-Rose Durocher, Virgin", "color": SEASON_WHITE},
    ],
    (10, 9): [
        {"name": "St. Denis, Bishop, and Companions, Martyrs", "color": SEASON_RED},
        {"name": "St. John Leonardi, Priest", "color": SEASON_WHITE},
    ],
    (10, 14): [{"name": "St. Callistus I, Pope & Martyr", "color": SEASON_RED}],
    (10, 16): [
        {"name": "St. Hedwig, Religious", "color": SEASON_WHITE},
        {"name": "St. Margaret Mary Alacoque, Virgin", "color": SEASON_WHITE},
    ],
    (10, 17): [{"name": "St. Ignatius of Antioch, Bishop & Martyr", "color": SEASON_RED}],
    (10, 18): [{"name": "St. Luke, Evangelist", "color": SEASON_RED}],
    (10, 19): [{"name": "Sts. John de Brebeuf and Isaac Jogues, Priests, and Companions, Martyrs", "color": SEASON_RED}],
    (10, 20): [{"name": "St. Paul of the Cross, Priest", "color": SEASON_WHITE}],
    (10, 23): [{"name": "St. John of Capistrano, Priest", "color": SEASON_WHITE}],
    (10, 24): [{"name": "St. Anthony Mary Claret, Bishop", "color": SEASON_WHITE}],
    (10, 28): [{"name": "Sts. Simon and Jude, Apostles", "color": SEASON_RED}],
    # November
    (11, 3): [{"name": "St. Martin de Porres, Religious", "color": SEASON_WHITE}],
    (11, 4): [{"name": "St. Charles Borromeo, Bishop", "color": SEASON_WHITE}],
    (11, 9): [{"name": "Dedication of the Lateran Basilica", "color": SEASON_WHITE}],
    (11, 10): [{"name": "St. Leo the Great, Pope & Doctor", "color": SEASON_WHITE}],
    (11, 11): [{"name": "St. Martin of Tours, Bishop", "color": SEASON_WHITE}],
    (11, 12): [{"name": "St. Josaphat, Bishop & Martyr", "color": SEASON_RED}],
    (11, 13): [{"name": "St. Frances Xavier Cabrini, Virgin", "color": SEASON_WHITE}],
    (11, 15): [{"name": "St. Albert the Great, Bishop & Doctor", "color": SEASON_WHITE}],
    (11, 16): [
        {"name": "St. Margaret of Scotland", "color": SEASON_WHITE},
        {"name": "St. Gertrude the Great, Virgin", "color": SEASON_WHITE},
    ],
    (11, 17): [{"name": "St. Elizabeth of Hungary, Religious", "color": SEASON_WHITE}],
    (11, 18): [
        {"name": "Dedication of the Basilicas of Sts. Peter and Paul, Apostles", "color": SEASON_WHITE},
        {"name": "St. Rose Philippine Duchesne, Virgin", "color": SEASON_WHITE},
    ],
    (11, 21): [{"name": "The Presentation of the Blessed Virgin Mary", "color": SEASON_WHITE}],
    (11, 23): [
        {"name": "St. Clement I, Pope & Martyr", "color": SEASON_RED},
        {"name": "St. Columban, Abbot", "color": SEASON_WHITE},
        {"name": "Blessed Miguel Agustin Pro, Priest & Martyr", "color": SEASON_RED},
    ],
    (11, 24): [{"name": "Sts. Andrew Dung-Lac, Priest, and Companions, Martyrs", "color": SEASON_RED}],
    (11, 25): [{"name": "St. Catherine of Alexandria, Virgin & Martyr", "color": SEASON_RED}],
    (11, 30): [{"name": "St. Andrew, Apostle", "color": SEASON_RED}],
    # December
    (12, 3): [{"name": "St. Francis Xavier, Priest", "color": SEASON_WHITE}],
    (12, 4): [{"name": "St. John Damascene, Priest & Doctor", "color": SEASON_WHITE}],
    (12, 7): [{"name": "St. Ambrose, Bishop & Doctor", "color": SEASON_WHITE}],
    (12, 9): [{"name": "St. Juan Diego Cuauhtlatoatzin", "color": SEASON_WHITE}],
    (12, 11): [{"name": "St. Damasus I, Pope", "color": SEASON_WHITE}],
    (12, 13): [{"name": "St. Lucy, Virgin & Martyr", "color": SEASON_RED}],
    (12, 21): [{"name": "St. Peter Canisius, Priest & Doctor", "color": SEASON_WHITE}],
    (12, 23): [{"name": "St. John of Kanty, Priest", "color": SEASON_WHITE}],
    (12, 29): [{"name": "St. Thomas Becket, Bishop & Martyr", "color": SEASON_RED}],
    (12, 31): [{"name": "St. Sylvester I, Pope", "color": SEASON_WHITE}],
}


# Optional commemorations specific to the Traditional 1962 calendar that the
# modern dict above does not already cover. (Kept compact — the heavy lifting
# for the traditional sanctoral is still in FIXED_FEASTS.)
OPTIONAL_MEMORIALS_TRADITIONAL: dict[tuple[int, int], list[dict]] = {
    (5, 12): [
        {"name": "Sts. Nereus, Achilleus, Domitilla and Pancras, Martyrs", "color": SEASON_RED},
    ],
}


def _optional_memorials_for(d: date, variant: str) -> list[dict]:
    """Return the list of optional saint commemorations for date d under variant."""
    table = OPTIONAL_MEMORIALS_TRADITIONAL if variant == "traditional" else OPTIONAL_MEMORIALS_MODERN
    return table.get((d.month, d.day), [])


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


def _first_sunday_after_epiphany(year: int) -> date:
    """Sunday between Jan 7 and Jan 13 inclusive — the I Sunday after Epiphany (1962)."""
    d = date(year, 1, 7)
    while d.weekday() != 6:
        d += timedelta(days=1)
    return d


def _traditional_post_pentecost_label(sun: date, pentecost: date,
                                       advent_start: date, septuagesima: date) -> str:
    """Return the 1962 Missal label for a Sunday in Time after Pentecost.

    Rubric (1962 General Rubrics):
      - First Sunday after Pentecost = Trinity Sunday (= pentecost + 7d).
      - Sundays after Pentecost are counted I, II, III, ... up to the Last Sunday
        (the Sunday immediately before Advent).
      - If the Sundays after Epiphany did not all occur in winter (Lent began
        early), the displaced Sundays are RESUMED after the XXIII Sunday after
        Pentecost — placed immediately before the Last Sunday after Pentecost,
        in their original Epiphany numbering order.
    """
    first_post_pent_sun = pentecost + timedelta(days=7)
    last_sun_before_advent = advent_start - timedelta(days=7)
    total = ((last_sun_before_advent - first_post_pent_sun).days // 7) + 1  # includes Last

    first_epi_sun = _first_sunday_after_epiphany(pentecost.year)
    available_epi = max(0, (septuagesima - first_epi_sun).days // 7)  # I..N
    displaced_epi = max(0, 6 - available_epi)

    idx = (sun - first_post_pent_sun).days // 7  # 0-based slot
    regular_count = total - displaced_epi - 1  # regular numbered Sundays after Pentecost

    if idx == total - 1:
        return "Last Sunday after Pentecost"
    if idx < regular_count:
        return f"{roman(idx + 1)} Sunday after Pentecost"
    if idx < total - 1:
        epi_num = available_epi + (idx - regular_count) + 1
        return f"{roman(epi_num)} Sunday after Epiphany (resumed)"
    # Fallback — defensive
    return f"{roman(idx + 1)} Sunday after Pentecost"


def _name_traditional(d: date, season: str, season_start: date,
                      baptism_of_lord: date, ash_wed: date,
                      pentecost: date, christ_the_king: date,
                      advent_start: date, septuagesima: date) -> str:
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
            # "Time after Epiphany" — Sundays after Epiphany.
            # First Sunday after Epiphany = the Sunday between Jan 7-13 (1962).
            first_epi_sun = _first_sunday_after_epiphany(d.year)
            if d < first_epi_sun:
                # Days from Jan 7 (after Epiphany Jan 6) up to the first Sunday after Epiphany
                # are weekdays "after Epiphany" — not yet within the I Sunday's week.
                if d.weekday() == 6:
                    # Defensive — shouldn't reach here for a Sunday
                    return "Sunday after Epiphany"
                return f"{weekday} after Epiphany"
            sundays = ((d - first_epi_sun).days // 7) + 1
            sundays = max(1, sundays)
            if d.weekday() == 6:
                return f"{roman(sundays)} Sunday after Epiphany"
            return f"{weekday} after {roman(sundays)} Sunday after Epiphany"
        # Time after Pentecost (incl. resumed Epiphany Sundays + Last Sunday)
        if d.weekday() == 6:
            sun = d
        else:
            # Previous Sunday (weekday() Mon=0 .. Sun=6); for Mon, that's d - 1d.
            sun = d - timedelta(days=d.weekday() + 1)
        label = _traditional_post_pentecost_label(sun, pentecost, advent_start, septuagesima)
        if d.weekday() == 6:
            return label
        return f"{weekday} after {label}"
    return weekday


def _season_label(d: date, season: str, season_start: date,
                  baptism_of_lord: date, ash_wed: date,
                  pentecost: date, christ_the_king: date, variant: str,
                  advent_start: date, septuagesima: date) -> str:
    """Always-on secondary line, e.g. 'Easter Season · VI Week of Easter'."""
    if season == "Advent":
        week = ((d - season_start).days // 7) + 1
        return f"Advent · {roman(week)} Week of Advent"
    if season == "Christmas":
        return "Christmas Season"
    if season == "Septuagesima":
        diff = (d - season_start).days
        weeks = diff // 7
        names = ["Septuagesima", "Sexagesima", "Quinquagesima"]
        return f"Pre-Lent · {names[min(weeks, 2)]}"
    if season == "Lent":
        first_sunday_lent = ash_wed + timedelta(days=(6 - ash_wed.weekday()) % 7 or 7)
        if d < first_sunday_lent:
            return "Lent · Days of Ashes"
        week = ((d - first_sunday_lent).days // 7) + 1
        return f"Lent · {roman(week)} Week of Lent"
    if season in ("Easter", "Easter Octave"):
        week = ((d - season_start).days // 7) + 1
        return f"Easter Season · {roman(week)} Week of Easter"
    if season == "Ordinary Time":
        if variant == "traditional":
            if d < ash_wed:
                first_epi_sun = _first_sunday_after_epiphany(d.year)
                if d < first_epi_sun:
                    return "Time after Epiphany"
                n = ((d - first_epi_sun).days // 7) + 1
                return f"Time after Epiphany · {roman(max(1, n))} Sunday after Epiphany"
            # Time after Pentecost (with 1962 resumed-Epiphany handling)
            sun = d if d.weekday() == 6 else d - timedelta(days=d.weekday() + 1)
            label = _traditional_post_pentecost_label(sun, pentecost, advent_start, septuagesima)
            return f"Time after Pentecost · {label}"
        if d < ash_wed:
            week = ((d - baptism_of_lord).days // 7) + 1
        else:
            weeks_to_ck = ((christ_the_king - d).days // 7)
            week = 34 - weeks_to_ck
        week = max(1, min(34, week))
        return f"Ordinary Time · {roman(week)} Week in Ordinary Time"
    return season


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
        name = _name_traditional(d, season_name, season_start, bol, ash_wednesday, pentecost, christ_the_king, advent_start, septuagesima)
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

    # Optional memorials — appear as a SECONDARY liturgical identity of the day.
    # They never displace the ferial / sunday primary name; they are exposed as a
    # structured list (`optional_memorials`) so the dashboard can render them in
    # their own dedicated slot. If the day already hosts a feast/solemnity/
    # memorial in FIXED_FEASTS (rank already promoted out of feria/sunday),
    # suppress them — the higher-rank celebration subsumes optional commemorations.
    optional_memorials: list[dict] = []
    if rank in ("feria", "sunday"):
        optional_memorials = _optional_memorials_for(d, variant)

    season_label = _season_label(
        d, season_name, season_start, bol, ash_wednesday, pentecost,
        christ_the_king, variant, advent_start, septuagesima,
    )

    return {
        "date": d.isoformat(),
        "name": name,
        "color": color,
        "rank": rank,
        "season": season_name,
        "season_label": season_label,
        "optional_memorials": optional_memorials,
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
