// Display-only cleanup: source titles, slugs, and Markdown stay intact.
export function displayHeading(text: string): string {
  return text.replace(/[。．.]+\s*$/u, "");
}
