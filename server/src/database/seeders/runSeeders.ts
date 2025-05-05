import { connectDatabase } from "../connection.js";
import { seedDefaultPlans } from "./planSeeder.js";
import logger from "@utils/logger.js";

const forceUpdate = process.argv.includes('--force');

(async () => {
  try {
    logger.info("Connecting to database...");
    await connectDatabase();
    
    logger.info("Running seeders...");
    await seedDefaultPlans(forceUpdate);
    
    logger.success("All seeders completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("Error running seeders:", error);
    process.exit(1);
  }
})();