import { PrismaClient } from "./generated/prisma/index.js"; // o tu ruta custom

const prisma = new PrismaClient();

async function test() {
    try {
        console.log("Intentando conectar a Neon...");
        const result = await prisma.$queryRaw`SELECT 1+1 as result`;
        console.log("✅ Conexión exitosa:", result);
    } catch (e) {
        console.error("❌ Error de conexión:");
        console.error(e.message);
    } finally {
        await prisma.$disconnect();
    }
}

test();