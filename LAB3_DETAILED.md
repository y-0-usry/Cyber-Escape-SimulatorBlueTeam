# Lab 3 - Practical Scenario Notes (Simple: Real Logic vs Broken Logic)

This file follows the same operator-friendly style as Lab 1 and Lab 2:
1. What real secure logic should be.
2. What is broken in the lab.
3. How to apply attack steps in simple practical flow.
4. How challenge verification works.

---

## Overview
Lab 3 is an organization-management SaaS target (dashboard, profile, org settings, projects, pricing, admin panel) plus a challenge console.

Primary challenge account:
- Username: attacker1
- Password: OrgBreak2026!

Secondary helper account (trial stays active):
- Username: trialhelper
- Password: TrialBridge2026!

Important fixed values:
- Admin email: `admin@CyberEscape.com`
- Target org display name: `Cyber Escape`

---

## Endpoint Map

Auth:
- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`

Profile:
- `GET /api/profile`
- `POST /api/profile`

Organization:
- `GET /api/orgs/current`
- `POST /api/orgs/current/rename`

Projects:
- `GET /api/orgs/current/projects`
- `POST /api/orgs/:orgId/projects`

Admin:
- `GET /api/admin/files`
- `GET /api/admin/file?file=...`

Challenge/Reset:
- `GET /api/challenge/status`
- `POST /api/challenge/submit-flag`
- `POST /api/reset`

---

## Scenario 1: Organization Name Normalization Bypass

## Real logic (should be)
Organization uniqueness checks should compare normalized values,
not only raw input strings.

If `Cyber Escape` already exists, all equivalent forms should be rejected.

## Broken logic (in lab)
The duplicate check is weak on raw input,
while UI-visible value is normalized later.

Because of this mismatch, attacker can send a crafted raw name
that is accepted, but displayed as `Cyber Escape` after normalization.

## How to apply (simple)
1. Login as `attacker1`.
2. Open org rename flow (or capture `POST /api/orgs/current/rename`).
3. Use one of these payload styles:
   - Multi-space payload:
     - `Cyber                  Escape`
   - Zero-width payload (insert zero-width char in any position):
       - `Cyber\u200BEscape` (example representation, use a real U+200B char in Burp/editor)
4. Send request and reload org/dashboard view.

## API related
- `POST /api/orgs/current/rename`
- `GET /api/orgs/current`
- `GET /api/challenge/status`

## Evidence of success
- Visible org name becomes exactly `Cyber Escape`.
- Raw name is not exactly the plain original string, showing normalization effect.

## Game verification
- `task1=true` when display name is `Cyber Escape`
- and the raw name indicates one of accepted bypass patterns.

---

## Scenario 2: Subscription Bypass for Project Creation

## Real logic (should be)
Project creation permission must be evaluated from the same account/session
and the same target organization.

If attacker org is free plan with expired trial and limit reached,
new project creation must be blocked.

## Broken logic (in lab)
Project-creation flow can be influenced with trial context from helper account,
while request is still submitted under attacker session for attacker org.

This allows creating extra projects in attacker org even after plan limit.

## How to apply (simple)
1. Confirm attacker org is already limit-reached on free plan.
2. Login helper account (`trialhelper`) and inspect create-project request shape.
3. Reuse/forge create request targeting attacker org endpoint:
   - `POST /api/orgs/{attacker_org_id}/projects`
4. Keep attacker session token/cookie for final request.
5. Include trial context payload field from helper flow, such as:
   - `sourceTrialOrgId` mapped to active trial org.
6. Send request and check attacker org projects count.

## Forbidden case (must fail)
- If request targets org not owned by current session user,
  server should return `403 Forbidden`.

## API related
- `POST /api/orgs/:orgId/projects`
- `GET /api/orgs/current`
- `GET /api/challenge/status`

## Evidence of success
- New project appears under attacker org despite expired trial/limit state.

## Game verification
- `task2=true` when attacker org project count becomes greater than allowed free-plan limit.

---

## Scenario 3: Admin Email Pivot + File Parameter Abuse + FLAG

## Real logic (should be)
1. Profile update endpoint should enforce server-side field allow-list
   (e.g., update `name` only, reject unauthorized email role pivots).
2. Admin panel authorization should be role-based and server-controlled.
3. File-view endpoint should enforce strict file allow-list,
   not trust user-provided `file` parameter directly.

## Broken logic (in lab)
1. Profile update accepts unexpected `email` parameter.
2. Lab page gives an indirect clue by saying: if submit fails, contact admin at `admin@CyberEscape.com`.
3. Changing attacker email to admin email unlocks admin panel.
4. Admin file viewer uses `file=...` parameter in a weak way.
5. Changing `file` to `flag.txt` reveals the flag content.

## How to apply (simple)
1. Login as attacker account.
2. Note the indirect hint shown on lab page (admin contact email):
   - `admin@CyberEscape.com`
3. Capture profile update request:
   - `POST /api/profile`
4. Add/replace parameter:
   - `email=admin@CyberEscape.com`
5. Send request and refresh UI.
6. Admin Panel becomes visible.
7. Open any file in admin panel and capture URL/endpoint request.
8. Change query parameter to:
   - `file=flag.txt`
9. Read returned flag.
10. Submit it in challenge console.

## API related
- `POST /api/profile`
- `GET /api/admin/files`
- `GET /api/admin/file?file=...`
- `POST /api/challenge/submit-flag`

## Evidence of success
- Admin panel is accessible after email pivot.
- `flag.txt` response contains valid challenge flag.
- Flag submission returns success.

## Game verification
- `task3=true` only after correct flag submission.

---

## Lab 3 Scoring Logic

## Task points
- Task1 (org rename bypass): +120
- Task2 (subscription bypass): +120
- Task3 (flag submission): +160

## Hint deduction
- 3 hints available
- each hint: -5

## Time bonus
- On finish:
  - `timeBonus = floor(remainingMinutes) * 10`

## Final formula
- `taskBonus = t1 + t2 + t3`
- `hintPenalty = usedHints * 5`
- `final = max(0, taskBonus - hintPenalty + timeBonus)`

## Finish gating
- Finish button appears only when tasks are `3/3`.
- Attempt cannot be finished before that.

---

## Time, Hints, Reset

## Time
- 20 minutes from Start Attempt.
- Timer is live and persistent across navigation.
- If player leaves lab page and returns, timer continues from real remaining time.

## Hints
- Hints are guidance-style only.
- Score deduction applies immediately per hint.

## Reset Everything
- Manual reset:
  - `POST /api/reset`
  - local challenge state reset
  - auth/session token cleared
- Auto reset after successful finish:
  - backend reset + local state clear
  - redirect to login for clean next attempt

---

## Quick Assessor Checklist
- [ ] Task1 solved (visible org name is `Cyber Escape` through bypass payload)
- [ ] Task2 solved (attacker org project count increased beyond free-plan limit)
- [ ] Task3 solved (correct flag submitted)
- [ ] Tasks remain hidden before Start Attempt
- [ ] Timer remains live across navigation until timeout/finish
- [ ] Final score = task bonus + time bonus - hint penalties
