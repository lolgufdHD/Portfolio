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

function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  res.redirect("/admin/login");
}

app.get("/", (req, res) => {
  const data = readGallery();
  res.render("index", { gallery: data, getMonthFolder });
});

app.get("/admin/login", (req, res) =>
  res.render("admin-login", { error: null }),
);
app.post("/admin/login", (req, res) => {
  if (req.body.password === process.env.ADMIN_PASSWORD) {
    req.session.authenticated = true;
    return res.redirect("/admin");
  }
  res.render("admin-login", { error: "Falsches Passwort!" });
});
app.get("/admin/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/admin/login");
});

app.get("/admin", requireAuth, (req, res) => {
  const gallery = readGallery();
  const structuredData = {};
  const allYears = Object.keys(gallery).sort((a, b) => Number(b) - Number(a));

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
          cover: catData.images[0] || (catData.video ? 'video' : null),
          isEmpty: catData.images.length === 0 && !catData.video
        });
      });
    });
  });

  res.render("admin-dashboard", { structuredData, allYears, getMonthFolder });
});


const storage = multer.memoryStorage();


const upload = multer({
  storage: storage,
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
          savedVideo = {
            filename: filename,
            title: file.originalname.replace(/\.[^/.]+$/, '') 
          };
        } else {
          await fs.promises.writeFile(path.join(uploadPath, filename), file.buffer);
          savedImages.push(filename);
        }
      }
    }

    res.json({
      success: true,
      images: savedImages,
      video: savedVideo,
      count: savedImages.length + (savedVideo ? 1 : 0)
    });
    
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/admin/update-video-title", requireAuth, async (req, res) => {
  const { year, month, category, title } = req.body;
  const catPath = path.join(BASE_DIR, year, getMonthFolder(month), category);
  const metaPath = path.join(catPath, 'video-meta.json');
  try {
    await fs.promises.writeFile(metaPath, JSON.stringify({ title })); 
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/admin/delete-video", requireAuth, (req, res) => {
  const { year, month, category, filename } = req.body;
  const filePath = path.join(BASE_DIR, year, getMonthFolder(month), category, filename);
  const metaPath = path.join(BASE_DIR, year, getMonthFolder(month), category, 'video-meta.json');
  
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

  if (!year || !month || !category) {
    return res.status(400).json({ success: false, error: "Fehlende Daten" });
  }

  const folderPath = path.join(
    BASE_DIR,
    year.toString(),
    getMonthFolder(month),
    category,
  );

  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
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
      const metaPath = path.join(folderPath, 'video-meta.json');
      let title = 'Video';
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          title = meta.title || 'Video';
        } catch(e) {}
      }
      video = { filename: videos[0], title };
    }

    res.json({
      success: true,
      assets: { images, video },
      path: `${year}/${getMonthFolder(month)}/${category}`,
      info: { year, month, category }
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post("/admin/delete-image", requireAuth, (req, res) => {
  const { year, month, category, filename } = req.body;
  const filePath = path.join(
    BASE_DIR,
    year,
    getMonthFolder(month),
    category,
    filename,
  );
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
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
    }
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

async function createNewFolder(e) {
  e.preventDefault();

  const form = document.getElementById("newFolderForm");
  const year = form.year.value;
  const month = form.month.value;
  const category = form.category.value;
  const fileInput = document.getElementById("newFolderFiles");
  const files = fileInput.files;

  if (!year || !month || !category) {
    showToast("Bitte alle Felder ausfüllen", "warning");
    return;
  }

  const progress = document.getElementById("uploadProgress");
  const progressFill = document.getElementById("progressFill");
  const uploadText = document.getElementById("uploadText");

  progress.classList.add("active");
  progressFill.style.width = "0%";

  try {
    uploadText.textContent = "Erstelle Ordner...";

    const createRes = await fetch("/admin/create-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month, category }),
    });

    const createData = await createRes.json();

    if (!createData.success) {
      throw new Error(
        createData.error || "Ordner konnte nicht erstellt werden",
      );
    }

    if (files.length > 0) {
      uploadText.textContent = `Lade ${files.length} Datein hoch...`;

      const uploadFormData = new FormData();
      Array.from(files).forEach((f) => uploadFormData.append("images", f));
      uploadFormData.append("year", year);
      uploadFormData.append("month", month);
      uploadFormData.append("category", category);

      const uploadRes = await fetch("/admin/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        console.warn("Upload fehlgeschlagen:", uploadData.error);
      }
    }

    uploadText.textContent = "✅ Fertig!";
    progressFill.style.width = "100%";

    setTimeout(() => {
      hideNewFolderModal();
      progress.classList.remove("active");
      location.reload();
    }, 800);
  } catch (err) {
    console.error("Error:", err);
    uploadText.textContent = "❌ Fehler: " + err.message;
    setTimeout(() => progress.classList.remove("active"), 3000);
  }
}

app.listen(3000, () => console.log("Server läuft auf http://localhost:3000"));
