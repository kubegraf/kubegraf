import { readdir, readFile, writeFile, mkdir, stat } from "fs/promises";
import path from "path";

type SidebarGroup = {
  id: string;
  label: string;
  items: { id: string; label: string; href: string }[];
};

type SidebarConfig = {
  groups: SidebarGroup[];
};

type Frontmatter = {
  title?: string;
  sidebar_label?: string;
};

async function findMarkdownFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      files.push(...(await findMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseFrontmatter(markdown: string): { frontmatter: Frontmatter; body: string } {
  if (!markdown.startsWith("---")) {
    return { frontmatter: {}, body: markdown };
  }

  const end = markdown.indexOf("\n---", 3);
  if (end === -1) {
    return { frontmatter: {}, body: markdown };
  }

  const raw = markdown.slice(3, end).trim();
  const body = markdown.slice(end + 4);
  const fm: Frontmatter = {};

  for (const line of raw.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
    if (key === "title") fm.title = value;
    if (key === "sidebar_label") fm.sidebar_label = value;
  }

  return { frontmatter: fm, body };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];

  let inCode = false;
  let codeLang = "";
  let listBuffer: string[] = [];
  let blockquoteBuffer: string[] = [];

  const flushList = () => {
    if (!listBuffer.length) return;
    out.push("<ul>");
    for (const item of listBuffer) {
      out.push(`<li>${item}</li>`);
    }
    out.push("</ul>");
    listBuffer = [];
  };

  const flushBlockquote = () => {
    if (!blockquoteBuffer.length) return;
    out.push('<div class="callout">');
    for (const line of blockquoteBuffer) {
      out.push(`<p>${line}</p>`);
    }
    out.push("</div>");
    blockquoteBuffer = [];
  };

  const flushParagraph = (buf: string[]) => {
    if (!buf.length) return;
    const text = buf.join(" ").trim();
    if (text.length === 0) return;
    out.push(`<p>${text}</p>`);
    buf.length = 0;
  };

  let paragraphBuffer: string[] = [];

  const processInline = (text: string): string => {
    // inline code `code`
    return escapeHtml(text).replace(/`([^`]+)`/g, "<code>$1</code>");
  };

  for (let raw of lines) {
    const line = raw;

    if (line.startsWith("```")) {
      if (inCode) {
        // end code
        out.push("</code></pre>");
        inCode = false;
        codeLang = "";
      } else {
        flushParagraph(paragraphBuffer);
        flushList();
        flushBlockquote();
        inCode = true;
        codeLang = line.slice(3).trim();
        const langClass = codeLang ? ` class="language-${escapeHtml(codeLang)}"` : "";
        out.push(`<pre><code${langClass}>`);
      }
      continue;
    }

    if (inCode) {
      out.push(escapeHtml(line) + "\n");
      continue;
    }

    if (line.trim() === "") {
      flushParagraph(paragraphBuffer);
      flushList();
      flushBlockquote();
      continue;
    }

    // headings
    if (line.startsWith("### ")) {
      flushParagraph(paragraphBuffer);
      flushList();
      flushBlockquote();
      out.push(`<h3>${processInline(line.slice(4).trim())}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph(paragraphBuffer);
      flushList();
      flushBlockquote();
      out.push(`<h2>${processInline(line.slice(3).trim())}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      flushParagraph(paragraphBuffer);
      flushList();
      flushBlockquote();
      out.push(`<h1>${processInline(line.slice(2).trim())}</h1>`);
      continue;
    }

    // blockquote / callout
    if (line.startsWith(">")) {
      flushParagraph(paragraphBuffer);
      flushList();
      const text = line.replace(/^>\s?/, "");
      blockquoteBuffer.push(processInline(text));
      continue;
    } else {
      flushBlockquote();
    }

    // unordered list
    if (line.trim().startsWith("- ")) {
      flushParagraph(paragraphBuffer);
      const itemText = line.trim().replace(/^-+\s*/, "");
      listBuffer.push(processInline(itemText));
      continue;
    }

    // default paragraph text
    paragraphBuffer.push(processInline(line.trim()));
  }

  flushParagraph(paragraphBuffer);
  flushList();
  flushBlockquote();

  return out.join("\n");
}

function renderSidebar(config: SidebarConfig, currentHref: string): string {
  const groupsHtml: string[] = [];

  for (const group of config.groups) {
    const items = group.items
      .map((item) => {
        const active = item.href === currentHref ? " class=\"active\"" : "";
        return `<li><a href="${item.href}"${active}>${escapeHtml(item.label)}</a></li>`;
      })
      .join("");

    groupsHtml.push(
      `<div class="sidebar-section"><h3>${escapeHtml(group.label)}</h3><ul>${items}</ul></div>`
    );
  }

  return `<aside class="sidebar">
  <a href="/" class="sidebar-logo">
    <img src="/assets/logo/kubegraf_color_icon.png" alt="KubeGraf logo" class="sidebar-logo-icon">
    KubeGraf
  </a>
  ${groupsHtml.join("\n  ")}
</aside>`;
}

function renderDocPage(opts: {
  title: string;
  sidebarHtml: string;
  contentHtml: string;
}): string {
  const { title, sidebarHtml, contentHtml } = opts;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - KubeGraf Documentation</title>
  <meta name="description" content="${escapeHtml(
    "KubeGraf documentation - Learn how to install, configure, and operate the AI-native Kubernetes control plane."
  )}">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png">
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon.png">
  <link rel="shortcut icon" href="/favicon.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #06b6d4;
      --primary-dark: #0f172a;
      --secondary: #4c1d95;
      --accent: #8b5cf6;
      --text: #f9fafb;
      --text-muted: #9ca3af;
      --bg: #09090b;
      --bg-secondary: #020617;
      --bg-tertiary: #111827;
      --border: rgba(148, 163, 184, 0.25);
      --border-hover: rgba(56, 189, 248, 0.55);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Outfit', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.7;
    }

    .docs-layout {
      display: flex;
      min-height: 100vh;
    }

    .sidebar {
      width: 280px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
      padding: 1.5rem;
      position: fixed;
      height: 100vh;
      overflow-y: auto;
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      text-decoration: none;
      color: var(--text);
      font-weight: 600;
      letter-spacing: -0.03em;
    }

    .sidebar-logo-icon {
      width: 28px;
      height: 28px;
      border-radius: 8px;
    }

    .sidebar-section {
      margin-bottom: 1.5rem;
    }

    .sidebar-section h3 {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
    }

    .sidebar-section ul { list-style: none; }

    .sidebar-section a {
      display: block;
      padding: 0.45rem 0.75rem;
      color: var(--text-muted);
      border-radius: 6px;
      font-size: 0.9rem;
      text-decoration: none;
      transition: all 0.2s;
    }

    .sidebar-section a:hover {
      background: var(--bg-tertiary);
      color: var(--text);
    }

    .sidebar-section a.active {
      background: rgba(50, 108, 229, 0.15);
      color: var(--primary);
    }

    .docs-content {
      flex: 1;
      margin-left: 280px;
      padding: 3rem 3rem;
      max-width: 960px;
    }

    .prose h1 {
      font-size: 2.1rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
      font-family: 'Space Grotesk', system-ui, sans-serif;
      letter-spacing: -0.03em;
    }

    .prose h2 {
      font-size: 1.4rem;
      font-weight: 600;
      margin: 2rem 0 0.75rem;
      padding-bottom: 0.35rem;
      border-bottom: 1px solid var(--border);
      font-family: 'Space Grotesk', system-ui, sans-serif;
    }

    .prose h3 {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 1.5rem 0 0.5rem;
    }

    .prose p {
      color: var(--text-muted);
      margin-bottom: 0.9rem;
    }

    .prose ul {
      color: var(--text-muted);
      margin: 0.75rem 0 0.9rem 1.5rem;
    }

    .prose li { margin-bottom: 0.4rem; }

    .prose code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      background: var(--bg-tertiary);
      padding: 0.15rem 0.35rem;
      border-radius: 4px;
      color: var(--accent);
    }

    .prose pre {
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      overflow-x: auto;
      margin: 1rem 0 1.25rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
    }

    .callout {
      border-radius: 0.75rem;
      border: 1px solid rgba(148, 163, 184, 0.35);
      padding: 0.9rem 1rem;
      background: rgba(15, 23, 42, 0.9);
      margin: 1.25rem 0;
    }

    @media (max-width: 900px) {
      .sidebar { display: none; }
      .docs-content { margin-left: 0; padding: 2rem 1.5rem; }
    }
  </style>
</head>
<body>
  <div class="docs-layout">
    ${sidebarHtml}
    <main class="docs-content">
      <article class="prose">
${contentHtml}
      </article>
    </main>
  </div>
</body>
</html>`;
}

export async function generateDocs() {
  const projectRoot = process.cwd();
  const docsRoot = path.join(projectRoot, "docs");

  // sidebar config is optional; if missing, just skip sidebar generation
  let sidebarConfig: SidebarConfig | null = null;
  const sidebarPath = path.join(docsRoot, "sidebar.json");
  try {
    const raw = await readFile(sidebarPath, "utf8");
    sidebarConfig = JSON.parse(raw) as SidebarConfig;
  } catch {
    sidebarConfig = null;
  }

  const mdFiles = await findMarkdownFiles(docsRoot);
  if (mdFiles.length === 0) {
    console.log("[docs] no markdown docs found, skipping generation");
    return;
  }

  console.log("[docs] generating HTML docs from markdown...");

  for (const file of mdFiles) {
    const rel = path.relative(docsRoot, file).replace(/\\/g, "/");
    const urlPath = rel.replace(/\.md$/, "");
    const href = `/docs/${urlPath}`;
    const raw = await readFile(file, "utf8");
    const { frontmatter, body } = parseFrontmatter(raw);
    const htmlBody = markdownToHtml(body);
    const title = frontmatter.title || urlPath.split("/").pop() || "KubeGraf docs";

    const sidebarHtml =
      sidebarConfig !== null ? renderSidebar(sidebarConfig, href) : "<aside class=\"sidebar\"></aside>";

    const fullHtml = renderDocPage({
      title,
      sidebarHtml,
      contentHtml: htmlBody,
    });

    const outPath = path.join(docsRoot, `${urlPath}.html`);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, fullHtml, "utf8");
    console.log("[docs] wrote", path.relative(projectRoot, outPath));
  }
}





