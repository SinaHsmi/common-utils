import winston from "winston"
// env
export type LoggerType = "console" | "consoleFile" | "jsonConsole" | "file" | "silent" | string
export type LoggerLevel = "debug" | "info" | "verbose" | "warn" | "error" | string | undefined

// configure colors
const colorizer = winston.format.colorize()
winston.addColors({
  silly: "grey",
  debug: "grey",
  verbose: "cyan",
  info: "green",
  http: "blue",
  warn: "yellow",
  error: "red",
})

function stringifyWithTabs(obj: any) {
  if (Object.keys(obj.data || {}).length === 0) {
    return ""
  }
  let jsonString = JSON.stringify(obj.data, null, 2) // pretty print with 2 spaces
  return `\n${jsonString
    .split("\n")
    .map((line) => `    ${line}`) // add a tab at beginning of each line
    .join("\n")}`
}

const FORMATS = {
  json: winston.format.combine(
    winston.format.timestamp({
      alias: "time",
    }),
    winston.format.json(),
  ),
  console: winston.format.combine(
    winston.format.timestamp({
      alias: "time",
    }),
    winston.format.printf(
      (msg) =>
        `${
          colorizer.colorize(
            msg.level,
            // format time to add time zone for example +03:00
            `[${new Date((msg as any).time).toLocaleString("en-US", {
              hour12: false,
              timeZoneName: "short",
            })}]-[${msg.section || ""}]: `,
          ) + msg.message
        }${stringifyWithTabs(msg)}`,
    ),
  ),
}

const loggerOptions = {
  file: {
    format: FORMATS.json,
    handleExceptions: false,
    filename: "./logs/app.log",
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true,
  },
  console: {
    handleExceptions: false,
    format: FORMATS.console,
  },
  json: {
    format: FORMATS.json,
    handleExceptions: false,
  },
}

const createLoggerAndTransports = (
  logType: LoggerType = process.env.LOGGER_TYPE as LoggerType,
  level?: LoggerLevel,
) => {
  const logger = winston.createLogger({
    transports: [],
    exitOnError: false, // do not exit on handled exceptions
  })

  switch (logType) {
    case "console": {
      logger.add(
        new winston.transports.Console({ ...loggerOptions.console, level: level || "debug" }),
      )
      break
    }
    case "file": {
      logger.add(new winston.transports.File({ ...loggerOptions.file, level: level || "info" }))
      break
    }
    case "consoleFile": {
      logger.add(
        new winston.transports.File({
          ...loggerOptions.file,
          level: "info",
        }),
      )
      logger.add(
        new winston.transports.Console({ ...loggerOptions.console, level: level || "verbose" }),
      )
      break
    }
    case "silent": {
      break
    }
    case "jsonConsole":
    default: {
      logger.add(new winston.transports.Console({ ...loggerOptions.json, level: level || "info" }))
      break
    }
  }

  return logger
}

let logger: winston.Logger | undefined
function getLogger(section?: string, logType?: LoggerType, level?: LoggerLevel) {
  if (!logger) {
    logger = createLoggerAndTransports(logType, level)
  }
  if (!section) {
    return logger
  }
  return logger.child({ section })
}

export { getLogger }
