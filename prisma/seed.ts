import { UserRole, TenantType, Wing, MailType, MailStatus, ReturnReason } from "../src/generated/prisma/client";
import { faker } from "@faker-js/faker";
import { prisma } from "../src/lib/prisma";


async function main() {
    await prisma.mailStatusHistory.deleteMany();
    await prisma.mailrecord.deleteMany();
    await prisma.subsidiary.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
    await prisma.mailbox.deleteMany();

    // Users
    const users = [];
    for (let i = 1; i <= 100; i++) {
        const user = await prisma.user.create({
            data: {
                userName: `user${i}`,
                fullName: faker.person.fullName(),
                password: "1234",
                role: i % 5 === 0 ? UserRole.ADMIN : UserRole.STAFF,
            },
        });
        users.push(user);
    }

    // Mailboxes
    const mailboxes = [];
    for (let i = 1; i <= 100; i++) {
        const mailbox = await prisma.mailbox.create({
            data: {
                number: `MB${String(i).padStart(3, "0")}`,
            },
        });
        mailboxes.push(mailbox);
    }

    // Tenants
    const tenants = [];
    for (let i = 1; i <= 100; i++) {
        const tenant = await prisma.tenant.create({
            data: {
                name: faker.company.name(),
                typeTenant: i % 2 ? TenantType.OFFICE : TenantType.SHOP,
                wing: i % 2 ? Wing.NORTH : Wing.SOUTH,
                floor: `${(i % 10) + 1}`,
                roomNumber: `${100 + i}`,
                mailboxId: mailboxes[i - 1].id,
                contactPerson: faker.person.fullName(),
                logoUrl: faker.image.url(),
            },
        });

        tenants.push(tenant);
    }

    // Subsidiaries
    const subsidiaries = [];
    for (let i = 0; i < 100; i++) {
        const sub = await prisma.subsidiary.create({
            data: {
                name: faker.company.name(),
                tenantId: tenants[i].id,
            },
        });

        subsidiaries.push(sub);
    }

    // Mailrecords
    const mailrecords = [];

    for (let i = 1; i <= 100; i++) {
        const tenant = tenants[(i - 1) % tenants.length];

        const mail = await prisma.mailrecord.create({
            data: {
                trackingNumber: `TRK${String(i).padStart(6, "0")}`,
                tenantId: tenant.id,
                subsidiaryId: i % 2 === 0 ? subsidiaries[(i - 1) % subsidiaries.length].id : null,
                mailType: [MailType.LETTER, MailType.PACKAGE, MailType.DOCUMENTS][i % 3],
                sequenceNumber: i,
                currentStatus: [
                    MailStatus.SORTED,
                    MailStatus.READY,
                    MailStatus.PICKED_UP,
                    MailStatus.RETURNED,
                ][i % 4],
            },
        });

        mailrecords.push(mail);
    }

    // Mail Status Histories
    for (let i = 0; i < 100; i++) {
        const current = mailrecords[i];

        await prisma.mailStatusHistory.create({
            data: {
                mailrecordId: current.id,
                oldStatus: MailStatus.SORTED,
                newStatus: current.currentStatus,
                changedByUserId: users[i % users.length].id,
                pickedUpByName:
                    current.currentStatus === MailStatus.PICKED_UP
                        ? faker.person.fullName()
                        : null,
                returnReason:
                    current.currentStatus === MailStatus.RETURNED
                        ? ReturnReason.UNCLAIMED
                        : null,
                note: faker.lorem.sentence(),
            },
        });
    }

    console.log("✅ Seed completed");
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });