import { readdir, writeFile } from "fs/promises";
import path from "path";

const BASE_URL = "https://kubegraf.io";

export async function generateSitemap() {
  const projectRoot = process.cwd();
  const docsDir = path.join(projectRoot, "docs");

  const urls: { loc: string; changefreq: string; priority: string }[] = [];

  // Homepage
  urls.push({
    loc: `${BASE_URL}/`,
    changefreq: "weekly",
    priority: "1.0",
  });

  // Brand explainer page
  urls.push({
    loc: `${BASE_URL}/kubegraf/`,
    changefreq: "weekly",
    priority: "0.9",
  });

  // Docs index + individual docs HTML files
  try {
    const entries = await readdir(docsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".html")) continue;

      if (entry.name === "index.html") {
        urls.push({
          loc: `${BASE_URL}/docs/`,
          changefreq: "weekly",
          priority: "0.9",
        });
      } else {
        urls.push({
          loc: `${BASE_URL}/docs/${entry.name}`,
          changefreq: "monthly",
          priority: "0.8",
        });
      }
    }
  } catch (err) {
    console.warn("[sitemap] Unable to read docs directory, skipping docs URLs", err);
  }

  const lastmod = new Date().toISOString().slice(0, 10);

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map(
        (url) =>
          `  <url>\n` +
          `    <loc>${url.loc}</loc>\n` +
          `    <lastmod>${lastmod}</lastmod>\n` +
          `    <changefreq>${url.changefreq}</changefreq>\n` +
          `    <priority>${url.priority}</priority>\n` +
          `  </url>`
      )
      .join("\n") +
    "\n</urlset>\n";

  const outPath = path.join(projectRoot, "sitemap.xml");
  await writeFile(outPath, xml, "utf8");
  console.log("[sitemap] sitemap.xml generated at", outPath);
}








