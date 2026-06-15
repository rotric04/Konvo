import re

# Rule-based Sentiment and Trait Engine
# Deterministic and explainable.

POSITIVE_WORDS = {
    "great", "awesome", "excellent", "good", "love", "wonderful", "amazing", "fantastic", "positive",
    "agree", "support", "helpful", "appreciate", "thank", "thanks", "happy", "excited", "progress",
    "solved", "success", "recommend", "brilliant", "outstanding", "glad", "kind", "friendly"
}

NEGATIVE_WORDS = {
    "bad", "terrible", "awful", "hate", "disagree", "unhelpful", "useless", "broken", "wrong",
    "error", "fail", "failure", "angry", "sad", "annoyed", "frustrated", "worry", "worried",
    "issue", "problem", "defect", "flaw", "stupid", "dumb", "nonsense", "waste", "poor", "difficult"
}

SUPPORTIVE_PHRASES = {
    "thank you", "thanks for", "appreciate", "great work", "good job", "well done", "fully agree",
    "completely agree", "i support", "happy to help", "kudos", "congratulations", "glad you",
    "let me know if you need", "reach out"
}

CURIOUS_PHRASES = {
    "why", "how do", "what is", "is it possible", "how does", "can you explain", "wondering",
    "curious to know", "any thoughts on", "does anyone know", "have you considered", "question about"
}

AGGRESSIVE_PHRASES = {
    "you are wrong", "nonsense", "bullshit", "shut up", "stupid", "idiot", "don't care", "useless",
    "waste of time", "stop doing", "completely wrong", "makes no sense", "are you serious"
}

CONSTRUCTIVE_PHRASES = {
    "for example", "to improve", "i suggest", "alternative", "solution", "in my experience",
    "have you tried", "on the other hand", "however", "therefore", "firstly", "secondly", "recommend"
}

ANALYTICAL_PHRASES = {
    "based on", "the data", "statistics", "research", "percent", "%", "evidence", "hypothesis",
    "logical", "metrics", "conclude", "analyze", "formula", "measured", "correlation", "factor"
}

INSPIRATIONAL_PHRASES = {
    "dream", "vision", "inspire", "hope", "future", "believe", "achieve", "together",
    "never give up", "growth", "potential", "transform", "possible", "empower", "purpose"
}

HUMOROUS_PHRASES = {
    "haha", "lol", "lmao", "joke", "funny", "rofl", "hilarious", "laugh", "😂", "🤣", "😅"
}

def analyze_text(text: str) -> dict:
    if not text or not text.strip():
        return {
            "sentiment_positive": 0.0,
            "sentiment_neutral": 1.0,
            "sentiment_negative": 0.0,
            "trait_supportive": 0.0,
            "trait_curious": 0.0,
            "trait_aggressive": 0.0,
            "trait_constructive": 0.0,
            "trait_analytical": 0.0,
            "trait_emotional": 0.0,
            "trait_humorous": 0.0,
            "trait_inspirational": 0.0,
            "constructiveness": 50.0,
            "fact_density": 20.0,
            "toxicity_risk": 0.0,
            "explanations": ["Empty text analyzed. Defaulting to neutral."]
        }

    text_lower = text.lower()
    words = re.findall(r'\b\w+\b', text_lower)
    word_count = len(words)
    
    if word_count == 0:
        word_count = 1

    # Counts
    pos_count = sum(1 for w in words if w in POSITIVE_WORDS)
    neg_count = sum(1 for w in words if w in NEGATIVE_WORDS)
    
    # Phrase matching helper
    def phrase_matches(phrase_set):
        return sum(1 for phrase in phrase_set if phrase in text_lower)

    sup_matches = phrase_matches(SUPPORTIVE_PHRASES)
    cur_matches = phrase_matches(CURIOUS_PHRASES) + text.count('?')
    agg_matches = phrase_matches(AGGRESSIVE_PHRASES) + sum(1 for w in words if w in {"stupid", "idiot", "nonsense", "hate", "trash", "garbage"})
    con_matches = phrase_matches(CONSTRUCTIVE_PHRASES)
    ana_matches = phrase_matches(ANALYTICAL_PHRASES) + sum(1 for char in text if char.isdigit()) * 0.1
    emo_matches = sum(1 for w in words if w in {"sad", "angry", "excited", "happy", "love", "passion", "fear", "hurt", "worry", "feel", "feeling"})
    hum_matches = phrase_matches(HUMOROUS_PHRASES)
    ins_matches = phrase_matches(INSPIRATIONAL_PHRASES)

    # Sentiment ratios (must sum to 1.0)
    total_sentiment_signals = pos_count + neg_count
    if total_sentiment_signals > 0:
        sentiment_positive = pos_count / total_sentiment_signals
        sentiment_negative = neg_count / total_sentiment_signals
        
        # Scale down if few sentiment signals relative to text length
        signal_density = total_sentiment_signals / word_count
        if signal_density < 0.1:
            sentiment_neutral = 1.0 - (sentiment_positive + sentiment_negative) * 0.5
            sentiment_positive *= 0.25
            sentiment_negative *= 0.25
        else:
            sentiment_neutral = max(0.0, 1.0 - (sentiment_positive + sentiment_negative))
    else:
        sentiment_positive = 0.0
        sentiment_negative = 0.0
        sentiment_neutral = 1.0

    # Clean ratios summing to 1.0
    sum_sent = sentiment_positive + sentiment_neutral + sentiment_negative
    sentiment_positive /= sum_sent
    sentiment_neutral /= sum_sent
    sentiment_negative /= sum_sent

    # Normalize traits between 0.0 and 1.0
    def normalize_trait(matches, factor=0.2):
        return min(1.0, matches * factor)

    trait_supportive = normalize_trait(sup_matches + pos_count * 0.2)
    trait_curious = normalize_trait(cur_matches, 0.4)
    trait_aggressive = normalize_trait(agg_matches, 0.5)
    trait_constructive = normalize_trait(con_matches + (1 if word_count > 40 else 0), 0.3)
    trait_analytical = normalize_trait(ana_matches, 0.3)
    trait_emotional = normalize_trait(emo_matches + neg_count * 0.2, 0.3)
    trait_humorous = normalize_trait(hum_matches, 0.5)
    trait_inspirational = normalize_trait(ins_matches, 0.4)

    # Constructiveness: length, structure, low aggression, neutral/positive tone
    constructiveness_score = 50.0
    constructiveness_score += (trait_constructive * 20.0)
    constructiveness_score += (trait_analytical * 15.0)
    constructiveness_score += (trait_supportive * 10.0)
    constructiveness_score -= (trait_aggressive * 40.0)
    # Length premium
    constructiveness_score += min(15.0, (word_count / 10.0))
    constructiveness_score = max(0.0, min(100.0, constructiveness_score))

    # Fact Density: numbers, analytical terms, length, references (like "http" or "source:")
    fact_count = sum(1 for char in text if char.isdigit())
    fact_count += sum(1 for w in words if w in {"source", "reference", "citation", "study", "data", "science", "proof", "report", "statistics", "research"})
    if "http" in text_lower or ".com" in text_lower or ".org" in text_lower:
        fact_count += 3
    
    fact_density_score = 10.0
    fact_density_score += (trait_analytical * 40.0)
    fact_density_score += (fact_count * 5.0)
    fact_density_score += min(15.0, (word_count / 20.0))
    fact_density_score = max(0.0, min(100.0, fact_density_score))

    # Toxicity Risk: based on aggression, swear words
    swear_words = {"fuck", "shit", "asshole", "bitch", "cunt", "bastard", "dick"}
    swears_found = sum(1 for w in words if w in swear_words)
    
    toxicity_score = trait_aggressive * 40.0 + (swears_found * 30.0)
    if "caps" in text: # check yelling (more than 4 capital letters in a row)
        if re.search(r'[A-Z]{4,}', text):
            toxicity_score += 10.0
    toxicity_score = max(0.0, min(100.0, toxicity_score))

    # Explanations
    explanations = []
    if sentiment_positive > 0.4:
        explanations.append(f"Identified {pos_count} positive emotion terms (e.g. {[w for w in words if w in POSITIVE_WORDS][:3]}).")
    if sentiment_negative > 0.4:
        explanations.append(f"Identified {neg_count} negative emotion terms (e.g. {[w for w in words if w in NEGATIVE_WORDS][:3]}).")
    if trait_supportive > 0.4:
        explanations.append("High supportive markers indicating collaborative/encouraging feedback.")
    if trait_curious > 0.4:
        explanations.append("Contains question prompts or curious terminology, seeking understanding.")
    if trait_aggressive > 0.4:
        explanations.append("Aggressive vocabulary or hostile structures detected.")
    if trait_analytical > 0.4:
        explanations.append(f"Analytical indicators: containing numerical values or statistical references.")
    if toxicity_score > 30.0:
        explanations.append("Elevated toxicity markers representing high threat, yelling, or direct hostile phrases.")
    if constructiveness_score > 70.0:
        explanations.append("Highly constructive format: well-structured suggestions, longer length, and lack of toxic language.")
    
    if not explanations:
        explanations.append("Balanced, neutral communication style with standard informational densities.")

    return {
        "sentiment_positive": sentiment_positive,
        "sentiment_neutral": sentiment_neutral,
        "sentiment_negative": sentiment_negative,
        "trait_supportive": trait_supportive,
        "trait_curious": trait_curious,
        "trait_aggressive": trait_aggressive,
        "trait_constructive": trait_constructive,
        "trait_analytical": trait_analytical,
        "trait_emotional": trait_emotional,
        "trait_humorous": trait_humorous,
        "trait_inspirational": trait_inspirational,
        "constructiveness": constructiveness_score,
        "fact_density": fact_density_score,
        "toxicity_risk": toxicity_score,
        "explanations": explanations
    }
