# Lab 1 - Practical Scenario Notes (Simple: Real Logic vs Broken Logic)

This file is written as an operator-friendly guide:
1. How the system should work.
2. How it is broken in the lab.
3. How to apply the attack in simple steps.
4. How the game verifies success.

---

## Overview
Lab 1 is a project-collaboration target plus a game page.
You solve scenarios in the target, then the game page tracks progress and score.

Test account:
- Username: attacker1
- Password: exploit123

---

## Scenario 1: 2FA Bypass

## Real logic (should be)
After login, only the server should decide whether 2FA was actually completed.
A browser-side flag alone must never grant protected access.

## Broken logic (in lab)
The flow relies too much on client-side auth state (cookie/storage style value).
If you edit that state in the browser, you can bypass the expected step.

## How to apply (simple)
1. Login normally.
2. Open DevTools (F12).
3. Go to Application/Storage.
4. Find a value like `_auth` or `is_auth`.
5. Change it to true.
6. Refresh and continue.

## API related
- `POST /api/login`
- `POST /api/verify-2fa`

## Evidence of success
- You can open pages/actions that were expected to require real 2FA completion.

---

## Scenario 2: Race Condition to Exceed Project Limit

## Real logic (should be)
Server must perform check plus write atomically.
If the limit is reached, every extra request should be rejected immediately.

## Broken logic (in lab)
Some endpoints do check, then delay, then write.
Parallel requests can pass before the limit value is updated.

## How to apply (simple)
1. Capture project creation request:
   - `POST /api/projects`
2. Send it to Burp Repeater/Intruder.
3. Fire a fast parallel burst.
4. Repeat idea with restore endpoint:
   - `POST /api/trash/:id/restore`
5. Observe total projects until it exceeds 10.

## API related
- `POST /api/projects`
- `POST /api/trash/:id/restore`
- `GET /api/verify-progress`

## Evidence of success
- `projectsCount > 10`.

## Game verification
Main automated check here relies on:
- `GET /api/verify-progress`
- If project count is over 10, verification is recorded once for this attempt.

---

## Scenario 3: Admin Escalation Without Payment

## Real logic (should be)
Upgrade to admin should require successful payment,
and server must verify payment state before accepting `admin` role.

## Broken logic (in lab)
Role-change endpoint verifies only that you are a member,
but does not strongly enforce the payment requirement for admin.

## How to apply (simple)
1. Capture role change request:
   - `POST /api/projects/:id/role`
2. Set body to:
   - `{ "new_role": "admin" }`
3. Send request.

## API related
- `POST /api/projects/:id/role`
- (expected normal path) `POST /api/projects/:id/pay`

## Evidence of success
- Your role becomes admin even though no valid payment was completed.

---

## Scenario 4: IDOR on Project Members

## Real logic (should be)
Adding members should be allowed only for real owner/admin of that project.
Normal user adding members to another project should return 403.

## Broken logic (in lab)
Member-add endpoint has weak/missing authorization check.
If you know a project id, you can add members without proper authority.

## How to apply (simple)
1. Capture request:
   - `POST /api/projects/:id/members`
2. Change `:id` to a sensitive target project id.
3. Example body:
   - `{ "userId": 4, "role": "viewer" }`
4. Send request.

## API related
- `POST /api/projects/:id/members`

## Evidence of success
- Target user appears as member in the target project.

---

## Scenario 5: Retrieve and Submit FLAG

## Real logic (should be)
FLAG should only be reachable after correct authorization and valid path.

## Broken/challenge logic
After chaining previous weaknesses, you reach the flag source and submit it.

## How to apply (simple)
1. Reach flag location (notes/files/target project path).
2. Copy exact flag value.
3. Open Submit FLAG in game page.
4. Submit flag.

## Evidence of success
- Game accepts flag and moves to final state.

---

## How Lab 1 Is Evaluated (checks and score)

## Strong checks in current build
Main automated checks are:
1. `projectsCount > 10`
2. Correct FLAG value

## Time system
- 30 minutes
- timer decreases each second
- at zero: game over

## Hint system
- Hint UI exists.
- `useHint()` is effectively disabled in current build (No hints message).
- Score formula still includes hint penalty term.

## Score model
- +50 per completed task
- +400 for correct flag
- +100 project bonus if project verification happened
- +time bonus = `floor(remainingMinutes * 10)`
- -hint penalty = `hintsUsed * 5`

## Double-count protection
- `finalized=true` prevents applying finalize bonuses/penalties multiple times.

---

## Quick Assessor Checklist
- [ ] 2FA bypass demonstrated
- [ ] Project-limit bypass demonstrated (`projectsCount > 10`)
- [ ] Admin escalation demonstrated
- [ ] IDOR member-add demonstrated
- [ ] Correct FLAG submitted
- [ ] Final score generated once (no duplicate finalize)
