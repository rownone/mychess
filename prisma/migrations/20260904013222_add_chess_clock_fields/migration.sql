-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "blackTimeMs" INTEGER,
ADD COLUMN     "clockStartedAt" TIMESTAMP(3),
ADD COLUMN     "timeControlMs" INTEGER,
ADD COLUMN     "timedOutBy" "PieceColor",
ADD COLUMN     "whiteTimeMs" INTEGER;
