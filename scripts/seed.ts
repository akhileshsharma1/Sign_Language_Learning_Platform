const { PrismaClient } = require('@prisma/client');

const database = new PrismaClient();

async function main() {
    try {
        await database.category.createMany({
            data: [
                { name: "Regional/National Sign Languages" },
                { name: "International Sign Languages" },
                { name: "Village or Indigenous Sign Languages" },
                { name: "Manually Coded Languages" },
                { name: "Tactile Sign Languages" },
            ],
        });
        console.log("Seeding finished.");

    } catch (error) {
        console.log("Error seeding the database categories", error);
    } finally {
        await database.$disconnect();
    }
}

main();