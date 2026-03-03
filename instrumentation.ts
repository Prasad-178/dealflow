export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { NodeTracerProvider } = await import(
      "@opentelemetry/sdk-trace-node"
    );
    const { LangfuseSpanProcessor } = await import("@langfuse/otel");

    const provider = new NodeTracerProvider({
      spanProcessors: [
        new LangfuseSpanProcessor({
          secretKey: process.env.LANGFUSE_SECRET_KEY,
          publicKey: process.env.LANGFUSE_PUBLIC_KEY,
          baseUrl: process.env.LANGFUSE_BASEURL || "https://cloud.langfuse.com",
        }),
      ],
    });

    provider.register();
  }
}
