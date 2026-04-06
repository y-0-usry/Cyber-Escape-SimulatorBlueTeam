# Lab 6 - Practical Scenario Notes (Simple: Real Logic vs Broken Logic)

This file follows the same practical style used in previous labs:
1. What real secure logic should be.
2. What is broken in the lab.
3. How to apply the attack flow in simple steps.
4. How challenge verification works.

---

## Overview
Lab 6 is an organization management platform with invites, projects, logs, and a secret admin shell endpoint.

Roles in this lab:
- admin = victim
- manager = attacker
- employee = helper

Challenge accounts:
- Attacker manager account:
  - Username: attacker1
  - Password: ManagerBreak2026!
- Victim admin account:
  - Username: victim.admin
  - Password: AdminRoot2026!
- Helper employee account:
  - Username: helper.employee
  - Password: EmployeeOnly2026!
- Attacker-controlled account:
  - Username: owned.manager
  - Password: Owned2026!
  - Email: owned.manager@orglab.local

Initial org setup:
- One org exists already.
- Victim is the original admin.
- Attacker starts as manager.
- Helper account starts as employee.
- The attacker-controlled account starts outside the org.

Challenge objectives:
- Task 1: Org takeover.
- Task 2: Find flag.

---

## Endpoint Map

Auth:
- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`

Org / Roles / Invites:
- `GET /api/org/current`
- `GET /api/org/members`
- `GET /api/org/invites`
- `POST /api/org/invites`
- `POST /api/org/invites/:id/accept`
- `POST /api/org/members/:id/role`
- `POST /api/org/members/:id/remove`

Projects:
- `GET /api/org/projects`
- `POST /api/org/projects`

Logs:
- `GET /api/logs`
- `GET /api/logs/view?log=...`

Backend source clue / secret chain:
- `GET /api/backend/snippet`
- `GET /api/secret?file=...`

Challenge / Reset:
- `GET /api/challenge/status`
- `POST /api/challenge/submit-flag`
- `POST /api/reset`

---

## Scenario 1: Invite Tampering for Org Takeover

## Real logic (should be)
Invite updates should be server-validated.
A manager should only be able to edit invites they created.
The invite target email and invite identity should be locked to the intended workflow.

## Broken logic (in lab)
The UI only exposes normal invite behavior.
If the attacker edits the request manually, the invite update endpoint trusts the submitted `invite_id`.
That lets the attacker retarget an invite and change the email to the attacker-controlled account.
Once the email is updated, the invite appears normally for that account and can be accepted from the UI.
After acceptance, the attacker can remove or downgrade the original admin.

## How to apply (simple)
1. Login as `attacker1`.
2. Open the Invites page.
3. Create or edit an invite request from the UI.
4. Capture the request in Burp or browser dev tools.
5. Change the invite target id in the request to the target invite object.
6. Change the email to `owned.manager@orglab.local`.
7. Send the request.
8. Login as `owned.manager`.
9. Open Invites again.
10. The invite should now appear in the UI.
11. Click Accept from the UI.
12. Remove or downgrade the original admin from the Members page.

## Evidence of success
- `owned.manager` becomes admin inside the org.
- Original admin loses admin status or is removed from the org.
- The org takeover becomes visible in the members list.

## Game verification
- `task1=true` when the attacker-controlled account is admin and the victim admin is no longer admin or no longer a member.

---

## Scenario 2: Logs Traversal + Command Injection + FLAG

## Real logic (should be)
Admin-only log navigation should not allow path traversal.
The backend should never build shell commands from raw user input.
File access should be allowlisted and separated from command execution.

## Broken logic (in lab)
Once the attacker is admin, the Logs page becomes available.
The `log` parameter behaves like a vulnerable path viewer and can simulate traversal-style browsing.
The `file` parameter on the secret endpoint behaves like a shell input and accepts command separators.
This allows the attacker to inspect the simulated filesystem and read the flag file.

## How to apply (simple)
1. Become admin in Scenario 1.
2. Open the Logs page.
3. Try traversal-style paths:
   - `/`
   - `../`
   - `../../`
4. The page should show folder-style listings.
5. Open the backend folder view.
6. Read the backend snippet.
7. Open the Admin page or use the secret endpoint UI.
8. Test the shell-like input with:
   - `ls;`
   - `cd+secret;ls;`
   - `cd+secret;cat+flag.txt;`
9. The simulated output should show `flag.txt` in the secret folder.
10. Read the flag from the response.
11. Submit the flag in the challenge console.

## Notes on payload variety
The shell simulation accepts command chaining and plus-sign spacing in the input.
Useful examples:
- `ls;`
- `ls -la;`
- `cd+secret;ls;`
- `cd+secret;cat+flag.txt;`
- `whoami;pwd;ls -la;cd secret;ls;cat flag.txt;`

## Evidence of success
- Traversal-like browsing returns folder listings.
- Backend folder and snippet are visible.
- `flag.txt` appears inside the secret folder.
- Reading `flag.txt` returns the challenge flag.
- Flag submission returns success.

## Game verification
- `task2=true` after the flag is submitted correctly.

---

## Lab 6 Scoring Logic

## Task points
- Task1 (org takeover): +120
- Task2 (find flag): +160

## Hint deduction
- 3 hints available
- each hint: -5

## Time bonus
- On finish:
  - `timeBonus = floor(remainingMinutes) * 10`

## Final formula
- `taskBonus = t1 + t2`
- `hintPenalty = usedHints * 5`
- `final = max(0, taskBonus - hintPenalty + timeBonus)`

## Finish gating
- Finish button appears only when tasks are `2/2`.
- Attempt cannot be finished before both tasks are complete.

---

## Time, Hints, Reset

## Time
- 20 minutes from Start Attempt.
- Timer is persistent across refresh and page reopen.
- The timer should continue counting down even if the lab page is closed and reopened.

## Hints
- Hints should be guidance-style only.
- They should point the player toward invite tampering, logs traversal, and the secret endpoint without giving the direct payload immediately.

## Reset behavior
- Manual reset resets backend and local challenge state.
- Auto reset runs after successful finish.
- Session token is cleared to force a clean replay.

## Lab UI behavior
- Tasks and provided accounts stay hidden until Start Attempt.
- A Check Progress button is available in the lab console.
- Progress can be refreshed without resetting the timer.

---

## Quick Assessor Checklist
- [ ] Task1 solved: attacker-controlled account becomes admin and victim admin loses admin status or is removed
- [ ] Task2 solved: traversal and backend snippet are discovered, then flag is retrieved and submitted
- [ ] Tasks are hidden before Start Attempt
- [ ] Provided accounts are hidden before Start Attempt
- [ ] Check Progress button updates task state from the backend
- [ ] Timer continues after refresh and page reopen
- [ ] Logs traversal shows folder listings
- [ ] `cd+secret;ls;` shows `flag.txt`
- [ ] `cd+secret;cat+flag.txt;` returns the flag
