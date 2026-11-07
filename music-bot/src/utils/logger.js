/**
 * Advanced Console Logger for Pulse Music Bot
 */
const chalk = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
};

function timestamp() {
  const now = new Date();
  return `${chalk.gray}[${now.toLocaleTimeString("en-GB")}]${chalk.reset}`;
}

const logger = {
  info: (...args) => {
    console.log(`${timestamp()} ${chalk.cyan}ℹ INFO${chalk.reset} `, ...args);
  },
  success: (...args) => {
    console.log(`${timestamp()} ${chalk.green}✔ READY${chalk.reset}`, ...args);
  },
  warn: (...args) => {
    console.warn(`${timestamp()} ${chalk.yellow}⚠ WARN${chalk.reset} `, ...args);
  },
  error: (...args) => {
    console.error(`${timestamp()} ${chalk.red}✖ ERROR${chalk.reset}`, ...args);
  },
  lavalink: (...args) => {
    console.log(`${timestamp()} ${chalk.magenta}🎧 LAVALINK${chalk.reset}`, ...args);
  },
  debug: (...args) => {
    if (process.env.DEBUG === "true") {
      console.log(`${timestamp()} ${chalk.gray}⚙ DEBUG${chalk.reset}`, ...args);
    }
  },
};

module.exports = logger;
