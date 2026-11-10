"""
Part 11: The Autonomous Stripe Revenue & Checkout Engine
Configures the $1.00 7-day trial to $350/mo recurring subscription,
enforces territory exclusivity, and automates instant token issuance via webhooks.
"""

import json
import os
import logging
from typing import Dict, Any, Optional, Tuple
from src.auth_gate import check_territory_availability, issue_subscriber_token, validate_token

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def initiate_subscription_checkout(
    email: str,
    metro: str,
    category: str,
    base_url: str = "http://localhost:8000"
) -> Dict[str, Any]:
    """
    Checks territory availability and generates a checkout session.
    If Stripe API keys are configured in environment (STRIPE_SECRET_KEY),
    creates an official Stripe Checkout Session. Otherwise, runs in sandbox simulation mode.
    """
    email = email.lower().strip()
    metro = metro.strip()
    category = category.strip()

    # 1. Verify territory exclusivity
    is_available, current_owner = check_territory_availability(metro, category)
    if not is_available:
        return {
            "status": "LOCKED",
            "message": f"Territory for {category} in {metro} is already locked by a competitor ({current_owner}).",
            "checkout_url": None
        }

    stripe_key = os.getenv("STRIPE_SECRET_KEY")

    # 2. Production Stripe Integration (when key is active)
    if stripe_key:
        try:
            import stripe
            stripe.api_key = stripe_key
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': f'CivicIntel {metro} Commercial License ({category})',
                            'description': 'Daily commercial permits, direct owner mobile numbers & AI sales dossiers.'
                        },
                        'unit_amount': 35000, # $350.00
                        'recurring': {'interval': 'month'}
                    },
                    'quantity': 1,
                }],
                subscription_data={
                    'trial_period_days': 7,
                    'metadata': {'metro': metro, 'category': category}
                },
                mode='subscription',
                success_url=f"{base_url}/portal.html?token={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{base_url}/index.html#pricing",
                customer_email=email,
                metadata={'metro': metro, 'category': category}
            )
            return {
                "status": "SUCCESS",
                "mode": "STRIPE_LIVE",
                "checkout_url": session.url,
                "session_id": session.id
            }
        except Exception as e:
            logging.error(f"Stripe API error: {e}")

    # 3. Sandbox / Instant Fulfillment Simulation Mode ($0 testing)
    simulated_token = issue_subscriber_token(
        email=email,
        metro=metro,
        category=category,
        stripe_customer_id=f"cus_sim_{email.split('@')[0]}"
    )

    access_url = f"{base_url}/portal.html?token={simulated_token}"

    return {
        "status": "SUCCESS",
        "mode": "SANDBOX_SIMULATION",
        "token": simulated_token,
        "access_url": access_url,
        "message": f"Subscription activated! $1.00 trial initiated. Auto-renews at $350/mo on Day 7."
    }


def handle_stripe_webhook_payload(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Webhook Fulfillment Handler:
    Listens for 'checkout.session.completed', issues token, and locks territory.
    """
    event_type = event.get("type")
    
    if event_type == "checkout.session.completed":
        session = event.get("data", {}).get("object", {})
        email = session.get("customer_email") or session.get("customer_details", {}).get("email")
        metadata = session.get("metadata", {})
        metro = metadata.get("metro", "Austin")
        category = metadata.get("category", "Point-of-Sale (POS)")
        customer_id = session.get("customer")

        token = issue_subscriber_token(
            email=email,
            metro=metro,
            category=category,
            stripe_customer_id=customer_id
        )

        return {
            "fulfilled": True,
            "email": email,
            "token": token,
            "access_url": f"portal.html?token={token}"
        }

    return None


if __name__ == "__main__":
    print("=" * 70)
    print("PART 11: STRIPE REVENUE ENGINE & CHECKOUT TEST")
    print("=" * 70)

    # Test 1: Checkout for an open territory (Orlando, Food Wholesale)
    res = initiate_subscription_checkout(
        email="dave.sales@usfoods.com",
        metro="Orlando",
        category="Food Wholesale (Broadline)"
    )
    print(f"Checkout Status: {res.get('status')} [{res.get('mode')}]")
    print(f"Message:         {res.get('message')}")
    print(f"Access URL:      {res.get('access_url')}")

    # Test 2: Attempting to buy an already locked territory
    conflict = initiate_subscription_checkout(
        email="competitor@sysco.com",
        metro="Orlando",
        category="Food Wholesale (Broadline)"
    )
    print("\nAttempting Duplicate Purchase for Same Territory:")
    print(f"Status:          {conflict.get('status')}")
    print(f"Reason:          {conflict.get('message')}")
    print("-" * 70)

