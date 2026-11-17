import "dotenv/config";
import { expireReservations } from "../src/lib/order-lifecycle";
import { prisma } from "../src/lib/prisma";

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
try {
  do {
    try {
      if (process.argv.includes("--dry-run")) {
        const count = await prisma.order.count({
          where: { status: "PENDING", reservedUntil: { lte: new Date() } },
        });
        console.log(
          `Read-only reservation check: ${count} expired; no changes made`,
        );
      } else {
        const count = await expireReservations();
        if (count) console.log(`Expired reservations: ${count}`);
      }
    } catch {
      console.error("Reservation cleanup failed; retrying in one minute");
      if (process.argv.includes("--once")) process.exitCode = 1;
    }
    if (process.argv.includes("--once")) break;
    for (let second = 0; second < 60 && !stopping; second++)
      await new Promise((resolve) => setTimeout(resolve, 1000));
  } while (!stopping);
} finally {
  await prisma.$disconnect();
}
