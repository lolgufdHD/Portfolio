const express = require("express");
const path = require("path");
const cron = require("node-cron");
const { initStructure, createYearFolders, readGallery, getMonthFolder } = require("./gallery");

const app = express();

initStructure();

cron.schedule("5 0 1 1 *", () => {
  const year = new Date().getFullYear().toString();
  console.log("Erstelle Jahresordner:", year);
  createYearFolders(year);
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/bilder", express.static(path.join(__dirname, "bilder")));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
const data = readGallery();
  res.render("index", { 
    gallery: data,
    getMonthFolder: getMonthFolder
  });
});

app.listen(3000, () => console.log("Server läuft auf http://localhost:3000"));