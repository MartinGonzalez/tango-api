/**
 * Built-in fallback syntax highlighter for the diff renderer.
 * Uses regex-based token detection for common language constructs.
 * For richer highlighting, consumers can pass a Prism-based highlighter via the prop.
 */

const LANGUAGE_MAP: Record<string, string> = {
  js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
  ts: "typescript", tsx: "typescript", mts: "typescript",
  c: "c", h: "c",
  cc: "cpp", cxx: "cpp", cpp: "cpp", hpp: "cpp",
  cs: "csharp",
  java: "java", kt: "kotlin", scala: "scala",
  go: "go", rs: "rust", swift: "swift", dart: "dart",
  py: "python", rb: "ruby", php: "php", lua: "lua",
  sh: "bash", bash: "bash", zsh: "bash",
  json: "json", yml: "yaml", yaml: "yaml", toml: "toml",
  md: "markdown", mdx: "markdown",
  css: "css", scss: "css", less: "css",
  sql: "sql",
  html: "html", htm: "html", xml: "xml", svg: "xml",
};

export function languageFromFilePath(filePath: string): string | null {
  const fileName = filePath.split("/").pop() ?? filePath;
  const ext = fileName.includes(".")
    ? fileName.split(".").pop()!.toLowerCase()
    : "";
  return LANGUAGE_MAP[ext] ?? null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const KEYWORD_REGEX = /\b(import|from|export|default|class|interface|type|enum|public|private|protected|function|const|let|var|return|if|else|for|while|switch|case|break|continue|new|async|await|try|catch|finally|throw|extends|implements|static|readonly|true|false|null|undefined|using|namespace|void|string|number|int|bool|boolean|this|base|super|of|in|do|yield|typeof|instanceof|delete)\b/g;
const NUMBER_REGEX = /\b\d+(?:\.\d+)?\b/g;
const STRING_REGEX = /`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g;
const COMMENT_REGEX = /\/\/.*$/g;

/**
 * Regex-based syntax highlighter. Handles keywords, strings, comments, and numbers
 * across most C-family and scripting languages. Returns an HTML string with
 * <span class="token ..."> wrappers.
 */
export function fallbackHighlight(content: string, _filePath: string): string {
  if (content.length > 8000) return escapeHtml(content);

  let html = escapeHtml(content);
  const tokens: string[] = [];

  const stash = (value: string, className: string): string => {
    const idx = tokens.push(`<span class="token ${className}">${value}</span>`) - 1;
    return `\x00TK${idx}\x00`;
  };

  // Order matters: strings and comments first (they can contain keywords/numbers)
  html = html.replace(STRING_REGEX, (m) => stash(m, "string"));
  html = html.replace(COMMENT_REGEX, (m) => stash(m, "comment"));
  html = html.replace(KEYWORD_REGEX, '<span class="token keyword">$1</span>');
  html = html.replace(NUMBER_REGEX, '<span class="token number">$&</span>');

  // Restore stashed tokens
  return html.replace(/\x00TK(\d+)\x00/g, (_, idx) => tokens[Number(idx)] ?? "");
}
