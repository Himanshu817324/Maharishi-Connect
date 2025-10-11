// Performance-optimized logger that can be disabled in production
const isDevelopment = __DEV__;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

// Performance monitoring utilities
export const performanceMonitor = {
  startTime: (label: string) => {
    if (isDevelopment) {
      console.time(label);
    }
  },
  
  endTime: (label: string) => {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  },
  
  mark: (label: string) => {
    if (isDevelopment) {
      console.timeStamp(label);
    }
  }
};

export default logger;