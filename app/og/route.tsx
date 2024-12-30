import { ImageResponse } from "next/og";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = url.searchParams.get("title") || "danbuchholz.com";
  const description =
    url.searchParams.get("description") || "Thoughts & learnings from Dan Buchholz";

  try {
    const font = await fetch(new URL("/fonts/JetBrainsMono-Regular.ttf", url.origin)).then((res) =>
      res.arrayBuffer()
    );

    return new ImageResponse(
      (
        <div
          tw="flex flex-col w-full h-full items-center justify-center"
          style={{ backgroundColor: "#0d1b2a" }}
        >
          <div tw="flex flex-col md:flex-row w-full px-4 md:items-center justify-center p-8">
            <h2
              tw="flex flex-col text-7xl font-bold tracking-tight text-center"
              style={{ color: "#e0e1dd" }}
            >
              {title}
            </h2>
          </div>
          <div tw="flex flex-col md:flex-row w-full px-4 md:items-center justify-center p-8">
            <p tw="text-4xl text-center" style={{ color: " #778da9" }}>
              {"> "} {description}
            </p>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "JetBrains Mono",
            data: font,
            style: "normal",
            weight: 400,
          },
        ],
      }
    );
  } catch (error) {
    console.error("OG Image Error:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
