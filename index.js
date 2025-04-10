const axios = require("axios");
const fs = require("fs");
const path = require("path");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const cheerio = require("cheerio");

const keywords = [
  "frontend",
  "front end",
  "backend",
  "back end",
  "fullstack",
  "full stack",
  "full-stack",
  "python",
  "nodejs",
  "node js",
  "qa",
  ".net",
  "c#",
  "react",
  "vue",
  "angular",
  "php",
  "laravel",
  "ui",
  "ui/ux",
  "ux",
  "java",
  "typescript",
  "javascript",
  "quality assurance",
  "qa engineer",
  "qa tester",
  "qa automation",
  "qa analyst",
  "django",
  "flask",
  "express",
  "spring",
  "spring boot",
  "nextjs",
  "nuxtjs",
  "data science",
  "data analysis",
  "data visualization",
  "data mining",
  "machine learning",
  "artificial intelligence",
  "ai",
  "deep learning",
  "computer vision",
  "natural language processing",
  "nlp",
  "big data",
  "data warehousing",
  "etl",
  "business intelligence",
  "bi",
  "data lake",
  "data pipeline",
  "data modeling",
  "data governance",
  "data quality",
  "data architecture",
  "data strategy",
  "data management",
  "data security",
  "data privacy",
  "data compliance",
  "data ethics",
  "data storytelling",
  "data journalism",
  "data visualization tools",
  "ui design",
  "ux design",
  "ux research",
  "ux writing",
  "ux strategy",
  "ux testing",
  "ux prototyping",
  "ux wireframing",
  "ux usability testing",
  "ux information architecture",
  "ux interaction design",
  "ux visual design",
  "ux content strategy",
  "ux accessibility",
  "ux user experience",
  "ux user interface",
  "svelte",
  "tailwind",
  "bootstrap",
  "sass",
  "less",
  "symfony",
  "zend",
  "ruby",
  "rails",
  "go",
  "golang",
  "rust",
  "kotlin",
  "swift",
  "objective-c",
  "flutter",
  "dart",
  "android",
  "ios",
  "react native",
  "xamarin",
  "wordpress",
  "drupal",
  "joomla",
  "shopify",
  "magento",
  "woocommerce",
  "prestashop",
  "bigcommerce",
  "opencart",
  "strapi",
  "graphql",
  "rest api",
  "soap",
  "mysql",
  "postgresql",
  "mongodb",
  "firebase",
  "redis",
  "elasticsearch",
  "aws",
  "azure",
  "gcp",
  "docker",
  "kubernetes",
  "ci/cd",
  "jenkins",
  "gitlab",
  "bitbucket",
  "jira",
  "confluence",
  "agile",
  "scrum",
  "kanban",
  "clickup",
  "notion",
  "sap",
  "odoo",
  "oracle",
  "salesforce",
  "power bi",
  "tableau",
  "looker",
  "data analyst",
  "data scientist",
  "data engineer",
  "pandas",
  "numpy",
  "scikit-learn",
  "tensorflow",
  "pytorch",
  "matplotlib",
  "airflow",
  "dbt",
  "devops",
  "sre",
  "terraform",
  "ansible",
  "prometheus",
  "grafana",
  "new relic",
  "datadog",
  "dynamics",
  "netsuite",
  "zoho",
];

const outputJson = path.join(__dirname, "freelancermap_data.json");
const outputCsv = path.join(__dirname, "freelancermap_data.csv");

const seenSlugs = new Set();
let isFirstJsonEntry = true;

const slugToTitle = (slug) =>
  slug
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\w|\s\w/g, (m) => m.toUpperCase());

fs.writeFileSync(outputJson, "[\n");

const csvWriter = createCsvWriter({
  path: outputCsv,
  header: [
    { id: "title", title: "Title" },
    { id: "location", title: "Location" },
    { id: "description", title: "Description" },
    { id: "slug", title: "Slug" },
    { id: "company", title: "Company" },
    { id: "dateScraped", title: "DateScraped" },
  ],
  append: false,
});
csvWriter.writeRecords([]);

const appendToJSON = (data) => {
  const jsonString = JSON.stringify(data, null, 2);
  const comma = isFirstJsonEntry ? "" : ",\n";
  fs.appendFileSync(outputJson, `${comma}${jsonString}`);
  isFirstJsonEntry = false;
};

const appendToCSV = async (data) => {
  const writer = createCsvWriter({
    path: outputCsv,
    header: [
      { id: "title", title: "Title" },
      { id: "location", title: "Location" },
      { id: "description", title: "Description" },
      { id: "slug", title: "Slug" },
      { id: "company", title: "Company" },
      { id: "dateScraped", title: "DateScraped" },
    ],
    append: true,
  });
  await writer.writeRecords([data]);
};

const fetchDescriptionFromHtml = async (slug) => {
  const url = `https://www.freelancermap.com/project/${slug}`;
  try {
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);
    const desc = $(".description").text().trim();
    return desc || "[NO DESCRIPTION FOUND]";
  } catch (err) {
    console.error(
      `❌ Failed to fetch description for slug "${slug}": ${err.message}`
    );
    return "";
  }
};

const fetchPageOne = async (keyword) => {
  const url = `https://www.freelancermap.com/project/search/ajax?excludeDachProjects=true&query=${encodeURIComponent(
    keyword
  )}&sort=2&pagenr=1`;

  try {
    const res = await axios.get(url, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    const projects = res.data.projects || [];
    console.log(`🔍 Keyword: "${keyword}" => ${projects.length} projects`);

    for (const project of projects) {
      const slug = project.slug;
      console.log(`🔗 Slug: "${slug}"`);

      if (slug === null) {
        console.warn(
          `⚠️ Skipping project with empty or invalid slug. Keyword: "${keyword}"`
        );
        continue;
      }

      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);

      const description = await fetchDescriptionFromHtml(slug);

      const record = {
        title: slugToTitle(slug),
        location: `${project.locations[0].name}, ${project.country.nameEn}` || "",
        description,
        slug,
        company: project.company || "",
        dateScraped: new Date().toISOString(),
      };

      appendToJSON(record);
      await appendToCSV(record);
    }
  } catch (err) {
    console.error(`💀 Keyword "${keyword}" blew up: ${err.message}`);
  }
};

const main = async () => {
  for (const keyword of keywords) {
    await fetchPageOne(keyword);
  }

  fs.appendFileSync(outputJson, "\n]\n");
  console.log(`\n🍺 DONE. Your JSON & CSV are now extra juicy.`);
};

main();
