import re
from typing import Dict, List

_CLEAN_RX = re.compile(r"[^a-z0-9\s]+")

def _normalize(s: str) -> str:
	s = s.lower()
	s = _CLEAN_RX.sub(" ", s)
	return " ".join(s.split())

# Add as many synonyms as you like; use simple words that often appear in receipts
_RULES: Dict[str, List[str]] = {
	"Food": [
		"pizza","burger","restaurant","nugget","milk","banana","chicken","date","spice",
		"bread","butter","egg","curd","paneer","cheese","yogurt","chapathi","dal"
	],
	"Groceries": [
		"costco","kroger","walmart","vegetable","oil","blueberry","peanut","flour","rice","lentil",
		"tindora","spinach","onion","tomato","banana","fruit","greens"
	],
	"Transport": ["uber","lyft","gas","fuel","ride","toll","parking"],
	"Household": ["detergent","tide","spray","nexxus","shampoo","cleaner","soap","paper","tissue"],
	"Health": ["protein","iq bar","ks protein","vitamin","supplement","whey","electrolyte"],
}

# Build flattened keyword list for fast matching
_FLAT: List[tuple[str, str]] = [(cat, _normalize(k)) for cat, kws in _RULES.items() for k in kws]

def suggest_category(description: str) -> str:
	desc = _normalize(description)
	if not desc:
		return "Uncategorized"

	# score each category by number of keyword hits (substring match)
	scores: Dict[str, int] = {}
	for cat, kw in _FLAT:
		if kw and kw in desc:
			scores[cat] = scores.get(cat, 0) + 1

	if not scores:
		return "Uncategorized"

	# pick the category with the highest score (ties broken by lexicographic order)
	best = max(scores.items(), key=lambda x: (x[1], x[0]))[0]
	return best