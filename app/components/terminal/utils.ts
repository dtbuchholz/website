// Helper function to format text for display
export function formatText(text: string) {
  return text
    .split("\n")
    .map((para) => para.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join("\r\n\r\n");
}
