/**
 * Next.js instrumentation - runs once when the server starts.
 * Use to capture and log unhandled errors for debugging 500s.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("uncaughtException", (err) => {
      console.error("[instrumentation] uncaughtException:", err?.message);
      console.error(err?.stack);
    });
    process.on("unhandledRejection", (reason, promise) => {
      console.error("[instrumentation] unhandledRejection:", reason);
    });
  }
}
