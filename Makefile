security-scan:
	bandit -r services/ packages/ gateway.py
	pip-audit -r requirements.txt
