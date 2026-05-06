"""Built-in challenge templates for Catholic Household OS."""

CHALLENGE_TEMPLATES = {
    "advent_jesse_tree": {
        "key": "advent_jesse_tree",
        "title": "Advent — Jesse Tree",
        "subtitle": "25 days through salvation history",
        "description": "Walk the family through Sacred Scripture from Creation to Christ. One ornament, one passage, one virtue per day until Christmas.",
        "days_total": 25,
        "category": "advent",
        "color": "violet",
    },
    "lent_40": {
        "key": "lent_40",
        "title": "Lent — 40 Days in the Desert",
        "subtitle": "Prayer · Fasting · Almsgiving",
        "description": "Forty days of intentional penance and renewal. Daily check-in across the three pillars; conclude at the Easter Vigil.",
        "days_total": 40,
        "category": "lent",
        "color": "violet",
    },
    "exodus_90": {
        "key": "exodus_90",
        "title": "The Ninety — A Spiritual Exodus",
        "subtitle": "90 days of ascetic discipline",
        "description": "A structured 90-day rule of life: cold showers, no alcohol, no screens after dark, daily holy hour, fraternity. For the household ready to be re-formed.",
        "days_total": 90,
        "category": "ascesis",
        "color": "red",
    },
    "marian_consecration_33": {
        "key": "marian_consecration_33",
        "title": "Marian Consecration — 33 Days",
        "subtitle": "St. Louis de Montfort method",
        "description": "Thirty-three days of preparation culminating in total consecration to Jesus through Mary. Daily readings, prayers, and reflections.",
        "days_total": 33,
        "category": "marian",
        "color": "white",
    },
    "rosary_54": {
        "key": "rosary_54",
        "title": "54-Day Rosary Novena",
        "subtitle": "27 in petition · 27 in thanksgiving",
        "description": "The classic Marian novena. Pray a full Rosary daily — for an intention, then in thanksgiving. The household keeps the chain unbroken.",
        "days_total": 54,
        "category": "marian",
        "color": "rose",
    },
}


def list_templates():
    return list(CHALLENGE_TEMPLATES.values())


def get_template(key: str):
    return CHALLENGE_TEMPLATES.get(key)
