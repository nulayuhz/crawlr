import { unlinkSync } from "fs";

try {
  unlinkSync("/tmp/hello");
  console.log("successfully deleted /tmp/hello");
} catch (err) {
  // handle the error
}

export const removeLog = () => {
  try {
    unlinkSync("./error.log");
    unlinkSync("./report.log");
    console.log("successfully deleted previous log files");
  } catch (err) {
    // handle the error
  }
};

export const delay = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const isExternalLink = (link, baseUrl) => {
  // domain extraction regex : https://regex101.com/r/jN6kU2/1
  const regex = /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/\n]+)/;
  const domain = link.match(regex);
  const baseUrlDomain = baseUrl.match(regex);
  return link.includes("http") && !domain[1].includes(baseUrlDomain[1]);
};
