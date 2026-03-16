# Lab 4 - Practical Scenario Notes (Simple: Real Logic vs Broken Logic)

This file follows the same practical style used in previous labs:
1. What real secure logic should be.
2. What is broken in the lab.
3. How to apply attack steps in simple flow.
4. How challenge verification works.

---

## Overview
Lab 4 is an organization-role governance target with hidden role IDs and member management.

Role mapping in this lab:
- owner = 1
- admin = 2
- viewer = 3

Challenge account:
- Username: attacker1
- Password: TakeOver2026!

Initial state:
- Attacker is inside victim org as admin (2).
- Original owner exists and should normally remain the only owner.

---

## Endpoint Map

Auth:
- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`

Org + Members:
- `GET /api/org/current`
- `GET /api/org/members`
- `POST /api/org/members/:id/access`
- `POST /api/org/members/:id/delete`

Audit/Supporting:
- `GET /api/audit/logs`
- `GET /api/projects`
- `GET /api/reports`
- `GET /api/billing/events`

Challenge/Reset:
- `GET /api/challenge/status`
- `POST /api/challenge/submit-flag`
- `POST /api/reset`

---

## Scenario 1: Hidden Role Privilege Escalation

## Real logic (should be)
Admin should only assign admin/viewer roles,
and must never be able to set any user (including self) to owner.

Owner role should be tightly controlled and unique by policy.

## Broken logic (in lab)
Role-change request contains user identifier in URL and body.
A hidden bypass path allows admin to promote self to owner
when both identifiers are manipulated and `access_rights` is set to `1`.

## How to apply (simple)
1. Login as attacker (initially admin).
2. Capture role update request:
   - `POST /api/org/members/:id/access`
3. Change URL `:id` to attacker user id.
4. Change body `user_id` to attacker user id.
5. Set body `access_rights=1`.
6. Send request.

## API related
- `POST /api/org/members/:id/access`
- `GET /api/me`
- `GET /api/challenge/status`

## Evidence of success
- Attacker role becomes owner (`access_rights=1`).

## Game verification
- `task1=true` when attacker becomes owner through this escalation pattern.

---

## Scenario 2: Org Takeover by Downgrading Original Owner

## Real logic (should be)
Only legitimate owner workflows should control owner transitions,
and system should strongly protect original owner state.

Before attacker becomes owner, any attempt to change original owner should be forbidden.

## Broken logic (in lab)
After attacker self-promotes to owner, server accepts role downgrade
for the original owner (to admin or viewer), enabling takeover flow.

## How to apply (simple)
1. Confirm Task 1 is done (attacker is owner).
2. Capture role update request for original owner user id.
3. Set `access_rights` to `2` or `3`.
4. Send request.

## API related
- `POST /api/org/members/:id/access`
- `GET /api/audit/logs`
- `GET /api/challenge/status`

## Evidence of success
- Original owner is no longer owner.
- Audit logs show downgrade performed by attacker.

## Game verification
- `task2=true` when logs confirm original owner downgrade by attacker.

---

## Scenario 3: Hidden UI Action + IDOR-style Delete + FLAG

## Real logic (should be)
Dangerous member deletion actions should be consistent in UI and backend,
and critical members should remain protected by strict ownership checks.

## Broken logic (in lab)
After downgrade, UI still hides delete action for original owner row,
but backend action can still be triggered via direct request manipulation.

When attacker is owner and deletes downgraded original owner,
response returns hidden FLAG.

## How to apply (simple)
1. Complete Scenario 2 (original owner downgraded).
2. Notice delete button is still not shown for that row in UI.
3. Capture any delete-member request in Burp.
4. Change target member id to original owner id.
5. Send request manually.
6. Read flag from response.
7. Submit flag in challenge console.

## API related
- `POST /api/org/members/:id/delete`
- `POST /api/challenge/submit-flag`
- `GET /api/challenge/status`

## Evidence of success
- Delete response includes flag value.
- Flag submission succeeds.

## Game verification
- `task3=true` after correct flag submission.

---

## Lab 4 Scoring Logic

## Task points
- Task1: +120
- Task2: +120
- Task3: +160

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
- Finish appears only when tasks are `3/3`.
- Attempt cannot finish before all tasks are complete.

---

## Time, Hints, Reset

## Time
- 20 minutes from Start Attempt.
- Timer is persistent/live across navigation until timeout or finish.

## Hints
- Guidance-style hints only.
- Score penalty applies immediately.

## Reset behavior
- Manual reset button resets backend and local challenge state.
- Auto reset runs after successful finish.
- Session/token is cleared to force a clean new run.

---

## Quick Assessor Checklist
- [ ] Task1 solved (attacker role escalated to owner)
- [ ] Task2 solved (original owner downgraded by attacker)
- [ ] Task3 solved (flag retrieved from hidden delete path and submitted)
- [ ] Tasks are hidden before Start Attempt
- [ ] Timer remains live across page navigation
- [ ] Final score includes task bonus, hint deduction, and time bonus
