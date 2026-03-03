export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { NodeTracerProvider } = await import(
      "@opentelemetry/sdk-trace-node"
    );
    const { SimpleSpanProcessor } = await import(
      "@opentelemetry/sdk-trace-node"
    );
    const { LangfuseExporter } = await import("@langfuse/otel");

    const langfuseExporter = new LangfuseExporter({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASEURL || "https://cloud.langfuse.com",
    });

    const provider = new NodeTracerProvider();
    provider.addSpanProcessor(new SimpleSpanProcessor(langfuseExporter));
    provider.register();
  }
}
