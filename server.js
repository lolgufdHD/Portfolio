const express = require("express");
const path = require("path");
const cron = require("node-cron");
const fs = require("fs");
const multer = require("multer");
const session = require("express-session");
const crypto = require("crypto");
require("dotenv").config();

const {
  initStructure,
  readGallery,
  getMonthFolder,
} = require("./gallery");

const app = express();
const BASE_DIR = path.join(__dirname, "timeline");

const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(64).toString("hex");

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  }),
);

app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use("/timeline", express.static(BASE_DIR));
app.use(express.static(path.join(__dirname, "public")));

initStructure();

// ---------- Auth ----------
function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  res.redirect("/admin/login");
}

// ---------- Routes ----------
app.get("/", (req, res) => {
  const data = readGallery();
  const aboutMeImage = getAboutMeImage();
  res.render("index", { gallery: data, getMonthFolder, aboutMeImage });
});

app.get("/admin/login", (req, res) =>
  res.render("admin-login", { error: null }),
);
app.post("/admin/login", (req, res) => {
  if (req.body.password === process.env.ADMIN_PASSWORD) {
    req.session.authenticated = true;
    return res.redirect("/admin");
  }
  res.render("admin-login", { error: "Falsches Passwort" });
});
app.get("/admin/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/admin/login");
});

app.get("/admin", requireAuth, (req, res) => {
  const gallery = readGallery();
  const structuredData = {};
  const allYears = Object.keys(gallery).sort((a, b) => Number(b) - Number(a));
  const aboutMeImage = getAboutMeImage();

  allYears.forEach((year) => {
    structuredData[year] = {};
    const months = Object.keys(gallery[year]).sort((a, b) => {
      const monate = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
      return monate.indexOf(a) - monate.indexOf(b);
    });

    months.forEach((month) => {
      structuredData[year][month] = [];
      Object.keys(gallery[year][month]).forEach((category) => {
        const catData = gallery[year][month][category];
        structuredData[year][month].push({
          year,
          month,
          category,
          assets: catData,
          path: `${year}/${getMonthFolder(month)}/${category}`,
          cover: catData.images[0] || (catData.video ? "video" : null),
          isEmpty: catData.images.length === 0 && !catData.video
        });
      });
    });
  });

  res.render("admin-dashboard", { structuredData, allYears, getMonthFolder, aboutMeImage });
});

// ---------- Upload ----------
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");
    if (isImage || isVideo) cb(null, true);
    else cb(new Error("Nur Bilder und Videos erlaubt!"), false);
  }
});

app.post("/admin/upload", requireAuth, upload.array("assets"), async (req, res) => {
  try {
    const { year, month, category } = req.body;
    const uploadPath = path.join(BASE_DIR, year.toString(), getMonthFolder(month), category);
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

    const existingFiles = fs.existsSync(uploadPath) ? fs.readdirSync(uploadPath) : [];
    const hasVideo = existingFiles.some(f => /\.(mp4|mov|avi|webm)$/i.test(f));

    const savedImages = [];
    let savedVideo = null;

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const isVideo = file.mimetype.startsWith("video/");
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filename = Date.now() + "_" + cleanName;

        if (isVideo) {
          if (hasVideo || savedVideo) continue;
          await fs.promises.writeFile(path.join(uploadPath, filename), file.buffer);
          savedVideo = { filename, title: file.originalname.replace(/\.[^/.]+$/, "") };
        } else {
          await fs.promises.writeFile(path.join(uploadPath, filename), file.buffer);
          savedImages.push(filename);
        }
      }
    }

    res.json({ success: true, images: savedImages, video: savedVideo, count: savedImages.length + (savedVideo ? 1 : 0) });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const aboutUpload = multer({ storage: multer.memoryStorage() });

app.post("/admin/upload-aboutme", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: "Keine Datei hochgeladen" });

    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
    if (!allowed.includes(ext)) return res.status(400).json({ success: false, error: "Format nicht erlaubt" });

    const mediaDir = path.join(__dirname, "public", "media");
    if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

    const existingFiles = fs.readdirSync(mediaDir);
    for (const f of existingFiles) {
      if (f.startsWith("aboutme")) fs.unlinkSync(path.join(mediaDir, f));
    }

    const filename = `aboutme${path.extname(req.file.originalname)}`;
    await fs.promises.writeFile(path.join(mediaDir, filename), file.buffer);
    res.json({ success: true, file: "/media/" + filename });
  } catch (err) {
    console.error("AboutMe Upload Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/admin/delete-video", requireAuth, (req, res) => {
  const { year, month, category, filename } = req.body;
  const filePath = path.join(BASE_DIR, year, getMonthFolder(month), category, filename);
  const metaPath = path.join(BASE_DIR, year, getMonthFolder(month), category, "video-meta.json");
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post("/admin/create-folder", requireAuth, (req, res) => {
  const { year, month, category } = req.body;
  if (!year || !month || !category) return res.status(400).json({ success: false, error: "Fehlende Daten" });

  const folderPath = path.join(BASE_DIR, year.toString(), getMonthFolder(month), category);
  try {
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
    res.json({ success: true, path: folderPath });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/admin/api/folder", requireAuth, (req, res) => {
  const { year, month, category } = req.query;
  const folderPath = path.join(BASE_DIR, year, getMonthFolder(month), category);
  try {
    const allFiles = fs.existsSync(folderPath) ? fs.readdirSync(folderPath) : [];
    const images = allFiles.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
    const videos = allFiles.filter(f => /\.(mp4|mov|avi|webm)$/i.test(f));

    let video = null;
    if (videos.length > 0) {
      const metaPath = path.join(folderPath, "video-meta.json");
      let title = "Video";
      if (fs.existsSync(metaPath)) {
        try { title = JSON.parse(fs.readFileSync(metaPath, "utf8")).title || "Video"; } catch(e) {}
      }
      video = { filename: videos[0], title };
    }

    res.json({ success: true, assets: { images, video }, path: `${year}/${getMonthFolder(month)}/${category}`, info: { year, month, category } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post("/admin/delete-image", requireAuth, (req, res) => {
  const { year, month, category, filename } = req.body;
  const filePath = path.join(BASE_DIR, year, getMonthFolder(month), category, filename);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post("/admin/delete-folder", requireAuth, (req, res) => {
  const { year, month, category } = req.body;
  const folderPath = path.join(BASE_DIR, year, getMonthFolder(month), category);
  try {
    if (fs.existsSync(folderPath)) fs.rmSync(folderPath, { recursive: true, force: true });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.get("/admin/api/aboutme", (req, res) => {
  const mediaDir = path.join(__dirname, "public", "media");
  if (!fs.existsSync(mediaDir)) return res.status(404).json({ error: "Media-Ordner nicht gefunden" });
  const files = fs.readdirSync(mediaDir);
  const aboutFile = files.find(f => f.toLowerCase().startsWith("aboutme"));
  if (!aboutFile) return res.status(404).json({ error: "Kein AboutMe-Bild gefunden" });
  res.json({ url: `/media/${aboutFile}` });
});

function getAboutMeImage() {
  const mediaDir = path.join(__dirname, "public", "media");
  if (!fs.existsSync(mediaDir)) return null;
  const files = fs.readdirSync(mediaDir);
  const about = files.find(f => f.startsWith("aboutme"));
  return about ? "/media/" + about : null;
}

app.listen(3000, () => console.log("Server läuft auf http://localhost:3000"));
