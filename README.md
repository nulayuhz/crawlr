This is a simple web crawler for downloading documents from pages that match certain keywords

- install NVM https://github.com/coreybutler/nvm-windows
- after it is installed, in Powershell, run `nvm install 20.17.0`
- type `node -v` verify you have it installed, if you see "v20.17.0" that means it is good
- type `npm -v`, make sure you see npm installed as well
- run `npm install` to install all the dependencies

### start

before you run the crawler, go to `src/config.ts`, modify `baseUrl` to the site you want to crawl, and `keywords` for the list of keywords you want to look for

- run `npm start`
- after it is done, the files are downloaded to `/files/`
