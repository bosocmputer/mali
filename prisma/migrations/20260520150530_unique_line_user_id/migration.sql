-- Ensure one LINE account maps to at most one MALI user.
CREATE UNIQUE INDEX "User_lineUserId_key" ON "User"("lineUserId");
