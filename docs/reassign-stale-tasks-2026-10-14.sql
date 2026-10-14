-- One-time data fix (2026-10-14): move stale TODO tasks to the client's current owner.
-- Context: clients were handed from Jakkrit P. to Sawinee T. before the reassignment feature
-- existed (2026-09-23), so their open TODO tasks stayed with the old owner.
-- Dry run on production found 104 tasks / 14 clients. Back up first:
--   docker compose exec -T postgres pg_dump -U mali mali_prod > .deploy-backups/pre_reassign_fix.sql
-- Run with: docker compose exec -T postgres psql -U mali -d mali_prod < this-file.sql
-- Intentionally excludes the 5 tasks of "บจก.ฮันนาห์ อีเว้นท์ส" (assigned to Jakkrit nesjk@, awaiting confirmation).

BEGIN;

UPDATE "Task" t
SET "assignedUserId" = (SELECT id FROM "User" WHERE email = 't.sawinee@hash-tax.com'),
    "updatedAt" = now()
FROM "Client" c, "TaxType" tt
WHERE t."clientId" = c.id AND t."taxTypeId" = tt.id
  AND t.status = 'TODO'
  AND t."assignedUserId" = (SELECT id FROM "User" WHERE email = 'p.jakkrit@hash-tax.com')
  AND COALESCE(tt."assignedStaffId", c."assignedStaffId") = (SELECT id FROM "User" WHERE email = 't.sawinee@hash-tax.com');
-- expect: UPDATE 104

COMMIT;

-- Verify: only the 5 Hannah tasks should remain mismatched
SELECT ua.name AS task_assignee, uo.name AS current_owner, COUNT(*) AS tasks
FROM "Task" t
JOIN "Client" c ON c.id = t."clientId"
JOIN "TaxType" tt ON tt.id = t."taxTypeId"
JOIN "User" ua ON ua.id = t."assignedUserId"
JOIN "User" uo ON uo.id = COALESCE(tt."assignedStaffId", c."assignedStaffId")
WHERE t.status = 'TODO' AND t."assignedUserId" <> COALESCE(tt."assignedStaffId", c."assignedStaffId")
GROUP BY 1, 2;
