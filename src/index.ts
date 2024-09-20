import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import urlParser from "url";
import randomUserAgent from "random-useragent";
import { userAgents } from "./user-agents";
import { baseUrl, keywords } from "./config";

const fileUrlsMatchedWithKeywords = {};
const crawlImages = false;

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
  keywords.map((keyword) => html.toLowerCase().includes(keyword.toLowerCase()));
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
