// import fetch from "node-fetch";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import urlParser from "url";
import randomUserAgent from "random-useragent";
import { userAgents } from "./user-agents";
import { baseUrl, crawlRate, keywords } from "./config";
import util from "util";
import { delay, isExternalLink, removeLog } from "./util";

const fileUrlsMatchedWithKeywords = {};
const crawlImages = false;

const visited = new Set();
const downloadedFile = new Set();
const queue: any[] = [];
const maxDepth = 3;

const report_file = fs.createWriteStream("./report.log", {
  flags: "w",
});
const error_file = fs.createWriteStream("./error.log", {
  flags: "w",
});
const headers = {
  // "User-Agent": randomUserAgent.getRandom(userAgents),
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "en-US,en;q=0.9",
};

const options = {
  method: "GET",
  headers,
};

const getUrl = (link: string) => {
  if (link.startsWith("http")) {
    if (isExternalLink(link, baseUrl)) {
      report_file.write("****************** external link" + link + "\n");
    }
    return link;
  } else if (link.startsWith("//")) {
    // console.log("****************** FILE", link);
    report_file.write("****************** file//:" + link + "\n");
    return link;
  } else if (link.startsWith("/")) {
    return link === "/" ? baseUrl : baseUrl + link;
  } else {
    // report_file.write(
    //   "****************** DEFAULT:" + link + "\n"
    // );
    console.log("****************** DEFAULT", link);
    return baseUrl;
  }
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

const crawl = async ({ url }) => {
  console.log("crawling...", url);
  queue.push({ url: baseUrl, depth: 0 });

  while (queue.length > 0) {
    const { url, depth } = queue.shift();

    if (visited.has(url)) {
      // console.log(url, "already seen");
      continue;
    }

    if (depth > maxDepth) {
      continue;
    }

    visited.add(url);

    report_file.write(util.format(url) + "\n");
    let response;
    try {
      // response = await fetch(url, options);
      response = await axios.get(url, options);
      console.log(response);
    } catch (e) {
      error_file.write(util.format(e) + "\n");
      error_file.write(util.format(url) + "\n");
      continue;
    }

    const html = response.data;
    const $ = cheerio.load(html);
    const links = $("a")
      .map((i, link) => link.attribs.href)
      .get();

    // if (crawlImages) {
    //   const imageUrls = $("img")
    //     .map((i, link) => link.attribs.src)
    //     .get();

    //   imageUrls.forEach((imageUrl) => {
    //     console.log("image url:", imageUrl);
    //     fetch(getUrl(imageUrl), options).then((response) => {
    //       const filename = path.basename(imageUrl);
    //       const dest = fs.createWriteStream(`images/${filename}`);
    //       response.body.pipe(dest);
    //       console.log(response.body);
    //     });
    //   });
    // }

    const { host } = urlParser.parse(url);
    console.log("Host:", host);
    console.log(links);
    report_file.write(util.format(links.join(",")) + "\n");
    links.forEach((link) => {
      if (isExternalLink(link, baseUrl) && !isUrlFile(link)) {
        console.log(
          "******************************",
          "isExternalLink",
          link,
          baseUrl
        );
        return false;
      }

      const completeUrl = getUrl(link);

      if (!visited.has(completeUrl)) {
        queue.push({ url: completeUrl, depth: depth + 1 });
      }
      if (isUrlFile(link) && doesPageContainKeyword(html)) {
        if (!fileUrlsMatchedWithKeywords[completeUrl]) {
          fileUrlsMatchedWithKeywords[completeUrl] = [];
        }
        fileUrlsMatchedWithKeywords[completeUrl].push(link);
      }
    });
    await delay(1000 / crawlRate);
  }
};

removeLog();
await crawl({ url: baseUrl });
console.log("Crawling completed");
report_file.write("Crawling completed\n\n");
report_file.write("Found files:\n\n");
for (const url in fileUrlsMatchedWithKeywords) {
  // console.log(fileUrlsMatchedWithKeywords);
  // report_file.write(fileUrlsMatchedWithKeywords + "\n");
  fileUrlsMatchedWithKeywords[url].forEach((link) => {
    if (downloadedFile.has(url)) {
      return;
    }
    console.log("downloading file...", url, link);
    report_file.write("downloading file... " + url + "\n");
    try {
      let formattedLink = link;

      // fetch(url, options)
      axios.get(url, options).then((response) => {
        const filename = path.basename(formattedLink);
        const dest = fs.createWriteStream(`files/${filename}`);
        response.data.pipe(dest);
        downloadedFile.add(url);
      });
    } catch (e) {
      console.log(e);
      error_file.write(util.format(e) + "\n");
    }
  });
}
