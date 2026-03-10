const fs = require("fs");
const path = require("path");

const BASE_DIR = path.join(__dirname, "bilder");
const TEMPLATE_ROOT = path.join(BASE_DIR, "TEMPLATE");

const monate = [
  "Januar","Februar","März","April","Mai","Juni",
  "Juli","August","September","Oktober","November","Dezember"
];

function getMonthFolder(monthName) {
  const index = monate.indexOf(monthName);
  const num = (index + 1).toString().padStart(2,"0");
  return `${num}_${monthName}`;
}

function initStructure() {
  if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR);

  if (!fs.existsSync(TEMPLATE_ROOT)) fs.mkdirSync(TEMPLATE_ROOT);

  const currentYear = new Date().getFullYear().toString();
  createYearFolders(currentYear);
}

function createYearFolders(year) {
  const yearPath = path.join(BASE_DIR, year);
  if (!fs.existsSync(yearPath)) fs.mkdirSync(yearPath);

  monate.forEach(monat => {
    const monthPath = path.join(yearPath, getMonthFolder(monat));
    if (!fs.existsSync(monthPath)) fs.mkdirSync(monthPath);
  });
}

function readGallery() {
  initStructure();
  const result = {};

  const years = fs.readdirSync(BASE_DIR)
    .filter(f => fs.lstatSync(path.join(BASE_DIR,f)).isDirectory() && f !== "TEMPLATE")
    .sort((a,b) => Number(b) - Number(a));

  years.forEach(year => {
    const yearPath = path.join(BASE_DIR, year);
    const monthsRaw = fs.readdirSync(yearPath);
    const monthsSorted = monate.filter(m => monthsRaw.includes(getMonthFolder(m)));

    const yearData = {};

    monthsSorted.forEach(month => {
      const monthFolder = getMonthFolder(month);
      const monthPath = path.join(yearPath, monthFolder);

      let categories = [];
      if (fs.existsSync(monthPath)) {
        categories = fs.readdirSync(monthPath)
          .filter(f => fs.lstatSync(path.join(monthPath,f)).isDirectory());
      }

      const monthData = {};

    categories.forEach(cat => {
      const catPath = path.join(monthPath, cat);
      const images = fs.existsSync(catPath)
        ? fs.readdirSync(catPath).filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f))
        : [];
        monthData[cat] = images;
    });

      if (Object.keys(monthData).length > 0) yearData[month] = monthData;
    });

    if (Object.keys(yearData).length > 0) result[year] = yearData;
  });

  return result;
}


module.exports = { readGallery, getMonthFolder, initStructure, createYearFolders };
