import { NextFunction, Request, Response } from "express";

// Extended Request interface to include log collection
declare module "express-serve-static-core" {
  interface Request {
    logEntries?: {
      timestamp: string;
      component: string;
      level: "INFO" | "DEBUG" | "ERROR" | "WARN";
      message: string;
    }[];
    
    // Helper method to add logs
    addLog?: (
      component: string, 
      level: "INFO" | "DEBUG" | "ERROR" | "WARN", 
      message: string
    ) => void;
  }
}

/**
 * Middleware: Initialize request logging collection
 * Adds logEntries array and addLog method to request object
 */
export const initRequestLogger = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  // Initialize empty log collection
  req.logEntries = [];
  
  // Add helper method to add logs
  req.addLog = (component, level, message) => {
    if (!req.logEntries) req.logEntries = [];
    
    // More aggressive limits to prevent memory issues
    const MAX_LOG_ENTRIES = 250; // Reduce from 1000 to 250 logs per request
    const MAX_MESSAGE_LENGTH = 1000; // Reduce from 5000 to 1000 chars
    const MAX_TOTAL_LOG_SIZE = 100 * 1024; // 100KB limit for all logs combined
    
    // Calculate current total log size (approximate)
    const estimateLogSize = () => {
      return req.logEntries ? req.logEntries.reduce((total, log) => {
        // Rough estimation of JSON size for a log entry
        return total + JSON.stringify(log).length;
      }, 0) : 0;
    };
    
    // If we're already at total log size limit, drop all new logs except errors
    if (estimateLogSize() > MAX_TOTAL_LOG_SIZE) {
      if (level !== "ERROR") return;
      
      // Add a warning if this is the first time we're hitting the size limit
      if (!req.logEntries.some(log => 
        log.component === "RequestLogger" && 
        log.message.includes("Log size limit")
      )) {
        req.logEntries.push({
          timestamp: new Date().toISOString(),
          component: "RequestLogger",
          level: "WARN",
          message: `Log size limit reached (${MAX_TOTAL_LOG_SIZE / 1024}KB). Additional non-error logs will be dropped.`
        });
      }
    }
    
    // If we reach the count limit, drop non-critical logs
    if (req.logEntries.length >= MAX_LOG_ENTRIES) {
      // Only allow ERROR level logs after the limit
      if (level !== "ERROR") return;
      
      // Add a warning if this is the first time we're hitting the limit
      if (!req.logEntries.some(log => 
        log.component === "RequestLogger" && 
        log.message.includes("Log count limit")
      )) {
        req.logEntries.push({
          timestamp: new Date().toISOString(),
          component: "RequestLogger",
          level: "WARN",
          message: `Log count limit reached (${MAX_LOG_ENTRIES}). Additional DEBUG and INFO logs will be dropped.`
        });
      }
    }
    
    // For DEBUG level logs, if we're approaching limits, start sampling (keep only 1 in 3)
    if (level === "DEBUG" && req.logEntries.length > MAX_LOG_ENTRIES * 0.7) {
      // Use simple random sampling
      if (Math.random() > 0.3) return;
    }
    
    // Truncate long messages to prevent memory issues
    const truncatedMessage = typeof message === 'string' && message.length > MAX_MESSAGE_LENGTH 
      ? message.substring(0, MAX_MESSAGE_LENGTH) + '... (truncated)'
      : message;
    
    req.logEntries.push({
      timestamp: new Date().toISOString(),
      component,
      level,
      message: truncatedMessage
    });
  };
  
  // Add initial request log
  req.addLog("RequestLogger", "INFO", `Started ${req.method} ${req.originalUrl}`);
  
  next();
};

/**
 * Middleware: Add response logging and send logs with response
 * This should be used as error handling middleware or attached to the response
 */
export const attachLogsToResponse = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Store the original send method
  const originalSend = res.send;
  
  // Override the send method
  res.send = function(body) {
    // If body is an object and we have logs, add them to the response
    if (typeof body === 'string') {
      try {
        const bodyObj = JSON.parse(body);
        if (typeof bodyObj === 'object' && req.logEntries && req.logEntries.length > 0) {
          bodyObj.logs = req.logEntries;
          return originalSend.call(this, JSON.stringify(bodyObj));
        }
      } catch (e) {
        // Not JSON, continue as normal
      }
    } else if (body && typeof body === 'object' && req.logEntries && req.logEntries.length > 0) {
      body.logs = req.logEntries;
    }
    
    // Call the original send
    return originalSend.call(this, body);
  };
  
  next();
};

// Export both middlewares for different use cases
export default { initRequestLogger, attachLogsToResponse };
