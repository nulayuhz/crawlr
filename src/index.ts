import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import urlParser from "url";
import randomUserAgent from "random-useragent";

const baseUrl = "https://insulet.com"; // modify this
const desiredKeywords: string[] = ["Sec filings", "financial", "report"]; // modify this

const fileUrlsMatchedWithKeywords = {};
const crawlImages = false;

// https://www.useragents.me/
const userAgents = [
  {
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.3",
    pct: 33.33,
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.3",
    pct: 24.67,
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.3",
    pct: 15.75,
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.",
    pct: 7.87,
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.",
    pct: 5.77,
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.3",
    pct: 2.1,
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.",
    pct: 1.57,
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 OPR/112.0.0.",
    pct: 1.57,
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.",
    pct: 1.05,
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.",
    pct: 1.05,
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.",
    pct: 0.52,
  },
  {
    ua: "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/113.",
    pct: 0.52,
  },
  {
    ua: "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.",
    pct: 0.52,
  },
  {
    ua: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.3",
    pct: 0.52,
  },
  {
    ua: "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.",
    pct: 0.52,
  },
  {
    ua: "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 Edg/109.0.1518.14",
    pct: 0.52,
  },
  {
    ua: "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 Edg/109.0.1518.10",
    pct: 0.52,
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.",
    pct: 0.52,
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.",
    pct: 0.52,
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.3",
    pct: 0.52,
  },
].map((item) => item.ua);

const headers = {
  "User-Agent": randomUserAgent.getRandom(userAgents),
};

const options = {
  method: "GET",
  headers,
};

const getUrl = (link: string) => {
  return link.includes("http")
    ? link
    : baseUrl + (link.startsWith("/") ? link : `/${link}`);
};

const doesPageContainKeyword = (html: string) =>
  desiredKeywords.map((keyword) =>
    html.toLowerCase().includes(keyword.toLowerCase())
  );
const isUrlFile = (link: string) => {
  return (
    link.startsWith("//") ||
    link.endsWith(".pdf") ||
    link.endsWith(".doc") ||
    link.endsWith(".docx")
  );
};
const seenUrls = {};

const crawl = async ({ url }) => {
  console.log("crawling...", url);
  if (seenUrls[url]) return;

  const response = await fetch(url, options);
  seenUrls[url] = true;
  const html = await response.text();

  const $ = cheerio.load(html);
  const links = $("a")
    .map((i, link) => link.attribs.href)
    .get();

  if (crawlImages) {
    const imageUrls = $("img")
      .map((i, link) => link.attribs.src)
      .get();

    imageUrls.forEach((imageUrl) => {
      console.log("image url:", imageUrl);
      fetch(getUrl(imageUrl), options).then((response) => {
        const filename = path.basename(imageUrl);
        const dest = fs.createWriteStream(`images/${filename}`);
        response.body.pipe(dest);
        console.log(response.body);
      });
    });
  }

  const { host } = urlParser.parse(url);
  console.log("Host:", host);
  console.log(links);
  links.forEach((link) => {
    if (isUrlFile(link) && doesPageContainKeyword(html)) {
      const key = getUrl(url);
      if (!fileUrlsMatchedWithKeywords[key]) {
        fileUrlsMatchedWithKeywords[key] = [];
      }
      fileUrlsMatchedWithKeywords[key].push(link);
    }
    if (host && link.includes(host)) {
      console.log("crawling child page...", link);
      try {
        crawl({
          url: getUrl(link),
        });
      } catch (e) {
        console.log("ERROR:", e);
      }
    }
  });
};

await crawl({ url: baseUrl });
console.log("Crawling completed");
for (const url in fileUrlsMatchedWithKeywords) {
  fileUrlsMatchedWithKeywords[url].forEach((link) => {
    console.log("downloading file...", url, link);
    try {
      let formattedLink = link;
      if (link.startsWith("/") && !link.startsWith("//")) {
        formattedLink = url.trim() + link;
      }
      console.log(formattedLink);
      fetch(formattedLink, options).then((response) => {
        const filename = path.basename(formattedLink);
        const dest = fs.createWriteStream(`files/${filename}`);
        response.body.pipe(dest);
      });
    } catch (e) {
      console.log(e);
    }
  });
}
