# Lab 5 - Practical Scenario Notes (Simple: Real Logic vs Broken Logic)

This file follows the same practical operator-friendly style used in previous labs:
1. What real secure logic should be.
2. What is broken in the lab.
3. How to apply attack flow in simple steps.
4. How challenge verification works.

---

## Overview
Lab 5 is an ecommerce wallet-abuse challenge with one final objective: retrieve and submit the FLAG.

Challenge account:
- Username: attacker1
- Password: ShopHack123!
- Starting wallet balance: $500

Products:
- 101: Pro Wireless Headset ($300)
- 102: Smart Home Hub ($240)
- 103: Performance Keyboard ($180)
- 999: Secret Item ($1000)

Coupon:
- Code: MEGA80
- Discount: 80%
- Max uses per user: 5
- Important: Secret Item (product 999) does not accept coupon codes.

---

## Endpoint Map

Auth:
- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`

Catalog/Checkout:
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/checkout/preview`
- `POST /api/orders/purchase`

Orders/Refund:
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders/:id/return`

Challenge/Reset:
- `POST /api/challenge/submit-flag`
- `POST /api/reset`

---

## Scenario 1: Coupon Discovery in Unexpected Location

## Real logic (should be)
Promotion codes should be announced through clear and intended marketing channels.
Users should not need hidden content to discover operationally valid codes.

## Lab behavior
The code is intentionally hinted in FAQ text in a non-obvious way.
This creates an investigation step before exploitation begins.

## How to apply (simple)
1. Login as attacker1.
2. Browse FAQ page.
3. Identify the hidden reference to `MEGA80`.
4. Use it in checkout preview on regular products.

## Evidence of success
- `POST /api/checkout/preview` on product 101 with `MEGA80` returns:
  - `originalPrice: 300`
  - `paidAmount: 60`

---

## Scenario 2: Refund Logic Abuse (Core Vulnerability)

## Real logic (should be)
Refund amount must be based on what customer actually paid (`paidAmount`),
not the original catalog/list price.

## Broken logic (in lab)
Return endpoint refunds `originalPrice` instead of `paidAmount`.
This allows direct profit from buy-then-return cycles.

## How to apply (simple)
1. Buy a regular product using `MEGA80` to minimize payment.
2. Immediately return the same order.
3. Receive full list-price refund, not discounted payment.
4. Repeat cycle to grow wallet balance.

## API related
- `POST /api/orders/purchase`
- `POST /api/orders/:id/return`
- `GET /api/me`

## Evidence of success
Example cycle using product 101:
- Pay: $60 (with coupon)
- Refund received: $300
- Net profit: +$240

---

## Scenario 3: Secret Item Purchase + FLAG Retrieval

## Real logic (should be)
Sensitive reward artifacts should never be exposed in regular order details,
and privileged item purchase should require legitimate economic conditions.

## Lab behavior
When Secret Item (product 999) is purchased successfully,
order details include the challenge flag.

Coupon is explicitly blocked for product 999,
so attacker must reach enough balance using the refund abuse first.

## How to apply (simple)
1. Increase wallet through Scenario 2 until balance >= $1000.
2. Buy product 999 without coupon.
3. Open order details for that paid order.
4. Read `FLAG: ...` from response/UI.
5. Submit via challenge console.

## API related
- `POST /api/checkout/preview` (product 999 should reject coupon)
- `POST /api/orders/purchase` (product 999, no coupon)
- `GET /api/orders/:id` (returns flag when order is paid and productId is 999)
- `POST /api/challenge/submit-flag`

## Evidence of success
- Secret Item order is `status: paid`.
- Order details include flag value.
- Flag submission endpoint returns success.

---

## Lab 5 Scoring Logic

## Base objective points
- Correct flag submission: +500

## Hint deduction
- 3 hints available
- each hint: -5

## Time bonus
- On finish:
  - `timeBonus = floor(remainingMinutes) * 10`

## Final formula
- `final = max(0, 500 - hintPenalty + timeBonus)`
- where `hintPenalty = usedHints * 5`

## Finish behavior
- Finish is triggered after correct flag submission.
- Final result panel is shown.
- Auto reset runs after a short delay.

---

## Time, Hints, Reset

## Time
- 20 minutes from Start Attempt.
- Timer is persistent/live across navigation via local state.
- If time reaches zero, attempt stops and player must reset.

## Hints
- Guidance-style hints only.
- Score penalty applies immediately per hint use.

## Reset behavior
- Manual reset button:
  - `POST /api/reset`
  - clears local challenge state and token
  - redirects to login
- Auto reset after success:
  - backend reset + local state clear
  - redirect to login for clean replay

---

## Quick Assessor Checklist
- [ ] Player can discover `MEGA80` from FAQ flow
- [ ] Coupon works on regular products and is blocked on product 999
- [ ] Refund flow returns original list price (intentional vulnerability)
- [ ] Player can grow balance through repeated buy/return cycles
- [ ] Secret Item purchase reveals flag only on paid order details
- [ ] Flag submission endpoint accepts only correct flag
- [ ] Final score includes base points, hint deductions, and time bonus
