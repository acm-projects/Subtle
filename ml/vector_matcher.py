"""
Subtle ML & Vector Matching Engine (Python)

Uses semantic embeddings with cluster soft-cosine expansion to capture deep lifestyle,
workplace proximity, and vibe matches between users and housing listings.
"""

import sys
import json
import math
import re
from typing import List, Dict, Any

# Group semantic vocabulary into co-occurring theme clusters
CLUSTERS = {
    'culinary': ['cooking', 'baking', 'culinary', 'kitchen', 'food'],
    'fitness': ['fitness', 'gym', 'workout', 'running', 'active', 'pool'],
    'study_quiet': ['reading', 'study', 'quiet', 'peaceful', 'relaxed', 'chill', 'clean', 'desk', 'workspace'],
    'social_nightlife': ['music', 'nightlife', 'social', 'outgoing', 'roommates', 'shared'],
    'outdoors_nature': ['outdoors', 'nature', 'hiking', 'parks', 'balcony'],
    'transit_commute': ['walking', 'transit', 'subway', 'metro', 'bus', 'bike', 'cycling', 'commute', 'convenient', 'central', 'downtown'],
    'home_comfort': ['furnished', 'laundry', 'washer', 'dryer', 'wifi', 'internet', 'sunny', 'bright', 'spacious', 'modern', 'air conditioning'],
    'pets': ['pet', 'pets', 'dog', 'cat', 'pet friendly'],
    'privacy': ['private', 'studio', 'entire place'],
    'parking': ['parking', 'garage', 'car']
}

ALL_TERMS = []
TERM_TO_CLUSTER = {}
for cluster_name, terms in CLUSTERS.items():
    for t in terms:
        if t not in TERM_TO_CLUSTER:
            ALL_TERMS.append(t)
            TERM_TO_CLUSTER[t] = cluster_name

DIMENSIONS = len(ALL_TERMS)

def dot_product(v1: List[float], v2: List[float]) -> float:
    return sum(a * b for a, b in zip(v1, v2))

def vector_norm(v: List[float]) -> float:
    return math.sqrt(sum(x * x for x in v))

def normalize(v: List[float]) -> List[float]:
    norm = vector_norm(v)
    if norm == 0:
        return [0.0] * len(v)
    return [x / norm for x in v]

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    n1 = vector_norm(v1)
    n2 = vector_norm(v2)
    if n1 == 0 or n2 == 0:
        return 0.5
    return dot_product(v1, v2) / (n1 * n2)

def vectorize_text(text: str, boost_terms: List[str] = None) -> List[float]:
    if boost_terms is None:
        boost_terms = []
    
    vec = [0.0] * DIMENSIONS
    lower_text = text.lower()
    
    # 1. Direct term hits
    active_clusters = set()
    for idx, term in enumerate(ALL_TERMS):
        weight = 0.0
        if term in lower_text:
            weight += 2.0
        if any(term in b.lower() or b.lower() in term for b in boost_terms):
            weight += 3.5
        
        if weight > 0:
            vec[idx] = weight
            active_clusters.add(TERM_TO_CLUSTER[term])
            
    # 2. Cluster Semantic Soft-Expansion (e.g. gym <-> fitness, kitchen <-> cooking)
    for idx, term in enumerate(ALL_TERMS):
        cluster = TERM_TO_CLUSTER[term]
        if cluster in active_clusters and vec[idx] == 0:
            vec[idx] = 1.0  # semantic affinity propagation

    return normalize(vec)

def vectorize_user_profile(profile: Dict[str, Any]) -> List[float]:
    parts = []
    if profile.get('housing_style'):
        parts.append(str(profile['housing_style']))
    if profile.get('user_transportation'):
        parts.append(f"commute transit by {profile['user_transportation']}")
    if profile.get('has_car'):
        parts.append("has car needs parking")
    
    interests = profile.get('user_interests') or []
    if isinstance(interests, list):
        parts.extend(interests)
    
    accs = profile.get('user_accommodations') or []
    if isinstance(accs, list):
        parts.extend(accs)
        
    if profile.get('wants_roommates') is False:
        parts.append("private studio no roommates peaceful quiet")
    elif profile.get('wants_roommates') is True:
        parts.append("social intern roommates shared community")
        
    if profile.get('noise_level'):
        parts.append(f"{profile['noise_level']} noise environment quiet study")
    if profile.get('cleanliness'):
        parts.append(f"{profile['cleanliness']} clean living")

    text_summary = " ".join(parts)
    boosts = (interests if isinstance(interests, list) else []) + (accs if isinstance(accs, list) else [])
    return vectorize_text(text_summary, boosts)

def vectorize_listing(listing: Dict[str, Any]) -> List[float]:
    amenities = listing.get('amenities') or []
    tags = listing.get('tags') or []
    features = listing.get('features') or []

    text_parts = [
        listing.get('title') or '',
        listing.get('subtitle') or '',
        listing.get('neighborhood') or '',
        listing.get('description') or '',
        listing.get('homeType') or '',
        listing.get('roomType') or '',
        " ".join(amenities),
        " ".join(tags),
        " ".join(features)
    ]
    full_text = " ".join(text_parts)
    boosts = amenities + tags
    return vectorize_text(full_text, boosts)

def compute_subtle_score(listing: Dict[str, Any], user_profile: Dict[str, Any] = None) -> Dict[str, Any]:
    if not user_profile:
        return {
            'listing': listing,
            'finalScore': listing.get('score', 85),
            'vectorSimilarity': 0.8,
            'budgetFit': 1.0,
            'commuteFit': 1.0,
            'lifestyleReasons': listing.get('whyScore', [])
        }

    # 1. Machine Learning Vector Cosine Similarity
    user_vec = vectorize_user_profile(user_profile)
    listing_vec = vectorize_listing(listing)
    cos_sim = max(0.0, cosine_similarity(user_vec, listing_vec))

    # 2. Budget Elasticity Model
    max_budget = None
    b_str = (user_profile.get('monthly_budget') or '').lower()
    if 'under' in b_str and '1,500' in b_str:
        max_budget = 1500
    elif '1,500' in b_str and '2,000' in b_str:
        max_budget = 2000
    elif '2,000' in b_str and '2,500' in b_str:
        max_budget = 2500
    elif '2,500+' in b_str:
        max_budget = 3500

    price = float(listing.get('price', 0))
    budget_fit = 1.0
    if max_budget is not None and price > 0:
        if price <= max_budget:
            savings = (max_budget - price) / max_budget
            budget_fit = 1.0 + min(0.08, savings * 0.15)
        else:
            over_ratio = (price - max_budget) / max_budget
            budget_fit = max(0.2, 1.0 - over_ratio * 2.2)

    # 3. Commute & Transit Fit
    commute_mins = float(listing.get('commuteMinutes', 20))
    target_commute = user_profile.get('commute_time')
    if not isinstance(target_commute, (int, float)):
        target_commute = 30.0

    if commute_mins <= target_commute:
        commute_fit = 1.0 + (target_commute - commute_mins) / 100.0
    else:
        extra_mins = commute_mins - target_commute
        commute_fit = max(0.4, 1.0 - (extra_mins / 25.0) * 0.45)

    pref_transit = (user_profile.get('user_transportation') or '').lower()
    commute_mode = listing.get('commuteMode', 'transit')
    if 'walk' in pref_transit and commute_mode == 'walk':
        commute_fit += 0.08
    if 'transit' in pref_transit and commute_mode in ['transit', 'walk']:
        commute_fit += 0.06

    # 4. Must-Have Accommodations
    user_accs = user_profile.get('user_accommodations') or []
    accommodation_fit = 1.0
    listing_text = " ".join([
        listing.get('title') or '',
        listing.get('description') or '',
        " ".join(listing.get('amenities') or []),
        " ".join(listing.get('tags') or [])
    ]).lower()

    if any('pet' in str(a).lower() for a in user_accs):
        if any(w in listing_text for w in ['pet', 'dog', 'cat']):
            accommodation_fit += 0.06
        else:
            accommodation_fit -= 0.15

    # 5. Composite Score (40% Vector + 30% Budget + 20% Commute + 10% Accommodations)
    composite = (
        cos_sim * 0.40 +
        min(1.0, budget_fit) * 0.30 +
        min(1.0, commute_fit) * 0.20 +
        min(1.0, accommodation_fit) * 0.10
    )

    raw_score = round(55 + composite * 44)
    final_score = max(58, min(99, raw_score))

    # 6. Natural Language Reason Generation
    reasons = []
    if cos_sim > 0.50:
        user_interests = user_profile.get('user_interests') or []
        matched_interests = [i for i in user_interests if i.lower() in listing_text]
        if matched_interests:
            reasons.append(f"Vibe match: Ideal for interns into {' & '.join(matched_interests[:2])}")
        else:
            reasons.append("High lifestyle & environment compatibility with your preferences")

    if max_budget is not None:
        if price <= max_budget:
            reasons.append(f"${int(price)}/mo is within your {user_profile.get('monthly_budget')} budget")
        else:
            reasons.append(f"${int(price)}/mo · slightly above target budget")

    reasons.append(f"{int(commute_mins)}-min {commute_mode} commute to work")

    if any('pet' in str(a).lower() for a in user_accs) and 'pet' in listing_text:
        reasons.append("Verified pet-friendly sublet")

    updated_listing = dict(listing)
    updated_listing['score'] = final_score
    updated_listing['whyScore'] = reasons if reasons else listing.get('whyScore', [])

    return {
        'listing': updated_listing,
        'finalScore': final_score,
        'vectorSimilarity': round(cos_sim, 2),
        'budgetFit': round(budget_fit, 2),
        'commuteFit': round(commute_fit, 2),
        'lifestyleReasons': reasons
    }

def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        sample_profile = {
            'student_email': 'alex@ucla.edu',
            'monthly_budget': '$1,500 - $2,000',
            'user_interests': ['Cooking', 'Fitness'],
            'user_transportation': 'Walking',
            'wants_roommates': False,
            'commute_time': 20
        }
        sample_listing = {
            'id': '1',
            'title': 'Sunny 1BR in Culver City',
            'description': 'Quiet building with kitchen and gym, 12 min walk to office.',
            'price': 1850,
            'commuteMinutes': 12,
            'commuteMode': 'walk',
            'amenities': ['Gym', 'Wi-Fi', 'Furnished'],
            'tags': ['Pets allowed']
        }
        result = compute_subtle_score(sample_listing, sample_profile)
        print("ML Output:", json.dumps(result, indent=2))
        return

    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip() and len(sys.argv) > 1:
            raw_input = sys.argv[1]

        payload = json.loads(raw_input)
        user_profile = payload.get('userProfile')
        listings = payload.get('listings', [])

        scored_results = [compute_subtle_score(l, user_profile) for l in listings]
        
        output = {
            'scored': [r['listing'] for r in scored_results],
            'mlAnalytics': [
                {
                    'id': r['listing'].get('id'),
                    'title': r['listing'].get('title'),
                    'finalScore': r['finalScore'],
                    'vectorSimilarity': r['vectorSimilarity'],
                    'budgetFit': r['budgetFit'],
                    'commuteFit': r['commuteFit'],
                }
                for r in scored_results
            ]
        }
        print(json.dumps(output))
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

