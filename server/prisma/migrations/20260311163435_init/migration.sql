-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "project" TEXT NOT NULL,
    "Energy_kwh" DOUBLE PRECISION NOT NULL,
    "Price" DOUBLE PRECISION NOT NULL,
    "Nro_panels" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
