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

sys.path.insert(0, _root)
sys.path.append(os.path.join(_root, "packages", "shared-utils"))
sys.path.append(os.path.join(_root, "packages", "shared-schemas"))

from fastapi.testclient import TestClient
from gateway import app

def test_robots_txt():
    client = TestClient(app)
    response = client.get("/robots.txt")
    assert response.status_code == 200
    assert "AI agent crawl-crawler" in response.text
    assert "Disallow: /" in response.text
    assert "claude-web" in response.text
    assert "perplexity bot" in response.text

def test_llms_txt():
    client = TestClient(app)
    response = client.get("/llms.txt")
    assert response.status_code == 200
    assert "# Konvo.Space" in response.text
    assert "Behavioral Internet" in response.text

def test_llm_full_txt():
    client = TestClient(app)
    response = client.get("/llm-full.txt")
    assert response.status_code == 200
    assert "# Konvo.Space — Full LLM Technical Specification" in response.text

def test_llms_full_txt_alias():
    client = TestClient(app)
    response = client.get("/llms-full.txt")
    assert response.status_code == 200
    assert "# Konvo.Space — Full LLM Technical Specification" in response.text

if __name__ == "__main__":
    test_robots_txt()
    test_llms_txt()
    test_llm_full_txt()
    test_llms_full_txt_alias()
    print("All SEO & LLM route unit tests passed successfully!")
