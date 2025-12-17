import { build as viteBuild } from "vite";
import { rm } from "fs/promises";
import { generateSitemap } from "./generate-sitemap";
import { generateDocs } from "./generate-docs";

async function buildAll() {
  // Clean previous build artifacts
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();
  console.log("client build complete!");

  console.log("generating HTML docs from markdown...");
  await generateDocs();
  console.log("docs generation complete.");

  console.log("generating sitemap.xml...");
  await generateSitemap();
  console.log("sitemap.xml generated.");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { build as viteBuild } from "vite";
import { rm } from "fs/promises";
import { generateSitemap } from "./generate-sitemap";

async function buildAll() {
  // Clean previous build artifacts
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();
  console.log("client build complete!");

  console.log("generating sitemap.xml...");
  await generateSitemap();
  console.log("sitemap.xml generated.");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});


