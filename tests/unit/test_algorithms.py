import sys
import os
# Traverse up to locate root monorepo path
_curr = os.path.abspath(__file__)
_root = None
while _curr:
    if os.path.exists(os.path.join(_curr, "services")) and os.path.exists(os.path.join(_curr, "packages")):
        _root = _curr
        break
    _parent = os.path.dirname(_curr)
    if _parent == _curr:
        _root = os.getcwd()
        break
    _curr = _parent

sys.path.append(os.path.join(_root, "packages", "shared-utils"))
sys.path.append(os.path.join(_root, "packages", "shared-schemas"))

from algorithms.sentiment import analyze_text
from algorithms.astrology import calculate_astrology
from datetime import date, time

def test_sentiment_rules():
    constructive_text = "Based on our database statistics, we should implement a partitioning index. " \
                         "The research data shows that 95% of queries execute under 2ms. " \
                         "For example, our analysis indicates this is a logical alternative to improve lookup speeds."
    res = analyze_text(constructive_text)
    assert res["sentiment_positive"] >= 0.0
    assert res["sentiment_neutral"] > 0.5
    assert res["constructiveness"] > 60.0
    assert res["fact_density"] > 30.0
    assert res["toxicity_risk"] < 10.0

def test_astrology_rules():
    b_date = date(1988, 11, 23)
    b_time = time(14, 15)
    loc = "San Francisco, CA"
    astro = calculate_astrology(b_date, b_time, loc)
    assert astro["sun_sign"] == "Sagittarius"

if __name__ == "__main__":
    test_sentiment_rules()
    test_astrology_rules()
    print("All unit tests passed successfully!")
