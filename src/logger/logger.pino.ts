// import pino from "pino"

// const LOG_TYPE: string = process.env.LOG_TYPE || "normal"

// const CUSTOM_LEVELS = {
//   debug: 10,
//   trace: 20,
//   info: 30,
//   warn: 40,
//   error: 50,
//   fatal: 60,
// }

// const CUSTOM_COLORS = {
//   default: "white",
//   60: "bgRed",
//   50: "red",
//   40: "yellow",
//   30: "green",
//   20: "blue",
//   10: "gray",
//   message: "white",
//   greyMessage: "gray",
// }

// const PINO_TARGETS = {
//   file: {
//     target: "pino/file",
//     options: {
//       customLevels: CUSTOM_LEVELS,
//       destination: "./logs/app.log",
//       mkdir: true,
//       sync: true,
//     },
//   } as pino.TransportTargetOptions,
//   console: {
//     target: "pino-pretty",
//     options: {
//       customLevels: CUSTOM_LEVELS,
//       colorize: true,
//       messageKey: "message",
//       translateTime: "SYS:standard",
//       ignore: "pid,hostname,source,category,dataType,tags,priority,type,section", // --ignore
//       customColors: CUSTOM_COLORS,
//     },
//   } as pino.TransportTargetOptions,
// }

// function createBaseLogger() {
//   let baseLogger: pino.Logger<"debug" | "trace" | "info" | "warn" | "error" | "fatal">
//   switch (LOG_TYPE) {
//     case "normal":
//       baseLogger = pino(
//         {
//           level: "trace",
//           customLevels: CUSTOM_LEVELS,
//           timestamp: pino.stdTimeFunctions.isoTime, // or 'false' to disable
//           base: null, // remove pid and hostname from logs
//           messageKey: "message",
//         },
//         pino.transport({
//           targets: [
//             {
//               ...PINO_TARGETS.console,
//               level: "info",
//             },
//             { ...PINO_TARGETS.file, level: "trace" },
//           ],
//         }),
//       )
//       break
//     case "development":
//       baseLogger = pino(
//         {
//           customLevels: CUSTOM_LEVELS,
//           level: "debug", // 'debug', 'warn', 'error', etc.
//           timestamp: pino.stdTimeFunctions.isoTime, // or 'false' to disable
//           base: null, // remove pid and hostname from logs
//           messageKey: "message",
//         },
//         pino.transport({
//           targets: [PINO_TARGETS.console],
//         }),
//       )
//       break
//     case "container":
//     default:
//       baseLogger = pino({
//         customLevels: CUSTOM_LEVELS,
//         level: "debug",
//         timestamp: pino.stdTimeFunctions.isoTime,
//         base: null,
//         messageKey: "message",
//       })
//       break
//   }
//   return baseLogger
// }

// let logger: pino.Logger<"debug" | "trace" | "info" | "warn" | "error" | "fatal"> | undefined
// export const getLogger = (section?: string) => {
//   if (!logger) {
//     logger = createBaseLogger()
//   }
//   if (!section) {
//     return logger
//   }
//   return logger.child({
//     section,
//   })
// }
