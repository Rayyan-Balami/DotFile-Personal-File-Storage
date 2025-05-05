import Plan from "@api/plan/plan.model.js";
import logger from "@utils/logger.js";

// Function to seed default plans if they don't exist or force update
export const seedDefaultPlans = async (forceUpdate = false): Promise<void> => {
  try {
    // Check if plans already exist
    const plansCount = await Plan.countDocuments();
    
    if (plansCount === 0 || forceUpdate) {
      if (forceUpdate && plansCount > 0) {
        logger.info("Force updating plans...");
        await Plan.deleteMany({});
      } else {
        logger.info("Seeding default plans...");
      }
      
      // Create default plans
      const defaultPlans = [
        {
          name: "Chill",
          storageLimit: 15 * 1024 * 1024, // 15MB in bytes
          price: 0,
          description: "The perfect starting place for your files. Free forever.",
          features: [
            "15MB storage", 
            "AES encryption", 
            "Huffman coding data compression", 
            "Basic Support",
            "Basic RBAC (Role-Based Access Control)",
            "Basic ABAC (Attribute-Based Access Control)",
            "File versioning (3 days)",
            "Web access only",
            "Standard transfer speed",
            "1 user account",
            "Email support (48h response time)"
          ],
          isDefault: true
        },
        {
          name: "Vibe",
          storageLimit: 75 * 1024 * 1024, // 75MB in bytes
          price: 9.99,
          description: "Great for personal use and small teams.",
          features: [
            "75MB storage", 
            "AES encryption", 
            "Huffman coding data compression", 
            "Advanced Support",
            "Advanced RBAC (Role-Based Access Control)",
            "Basic ABAC (Attribute-Based Access Control)",
            "File versioning (30 days)",
            "Web and mobile access",
            "Priority transfer speed",
            "Up to 5 user accounts",
            "Email and chat support (24h response time)",
            "API access with basic rate limits",
            "Shared folders and collaboration",
            "Deleted file recovery (15 days)"
          ],
          isDefault: false
        },
        {
          name: "Flex+",
          storageLimit: 125 * 1024 * 1024, // 125MB in bytes
          price: 19.99,
          description: "For power users and larger teams.",
          features: [
            "125MB storage", 
            "AES encryption", 
            "Huffman coding data compression", 
            "Priority Support", 
            "Premium transfer speed",
            "Enterprise-grade RBAC (Role-Based Access Control)",
            "Advanced ABAC (Attribute-Based Access Control)",
            "Custom permission policies",
            "File versioning (90 days)",
            "Web, mobile, and desktop access",
            "Unlimited user accounts",
            "Priority email, chat, and phone support (4h response time)",
            "Unlimited API access",
            "Advanced sharing controls",
            "Deleted file recovery (30 days)",
            "Audit logs and activity tracking",
            "Custom branding options",
            "SSO integration",
            "Advanced analytics dashboard",
            "Scheduled backups"
          ],
          isDefault: false
        }
      ];
      
      await Plan.insertMany(defaultPlans);
      logger.success("Default plans seeded successfully");
    } else {
      logger.error("Plans already exist, skipping seeding");
    }
  } catch (error) {
    logger.error("Error seeding default plans:", error as Error);
  }
};