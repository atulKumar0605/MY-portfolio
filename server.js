const crypto = require("crypto");
const fs = require("fs/promises");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const DOCS_FILE = path.join(DATA_DIR, "task-docs.json");
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 20 * 1024 * 1024);
const sessions = new Map();

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

async function ensureData() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await ensureJsonFile(USERS_FILE, []);
  await ensureJsonFile(DOCS_FILE, []);

  const users = await readJson(USERS_FILE);
  if (!users.some((user) => user.role === "admin")) {
    const email = process.env.ADMIN_EMAIL || "admin@portfolio.local";
    const password = process.env.ADMIN_PASSWORD || "admin12345";
    users.push(createUser(email, password, "Atul Kumar", "admin"));
    await writeJson(USERS_FILE, users);
    console.log(`Admin account ready: ${email}`);
  }
}

async function ensureJsonFile(filePath, fallback) {
  try {
    await fs.access(filePath);
  } catch {
    await writeJson(filePath, fallback);
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

function createUser(email, password, name, role = "user") {
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  return {
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    name,
    role,
    salt,
    passwordHash,
    createdAt: new Date().toISOString()
  };
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
}

function verifyPassword(password, user) {
  const attempted = hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(attempted, "hex"), Buffer.from(user.passwordHash, "hex"));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)])
  );
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, {
    userId: user.id,
    expiresAt: Date.now() + SESSION_TTL_MS
  });
  return token;
}

async function getSessionUser(req) {
  const token = parseCookies(req).portfolio_session;
  const session = token ? sessions.get(token) : null;
  if (!session || session.expiresAt < Date.now()) {
    if (token) {
      sessions.delete(token);
    }
    return null;
  }

  const users = await readJson(USERS_FILE);
  return users.find((user) => user.id === session.userId) || null;
}

async function parseBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("Request body is too large.");
    }
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function publicUser(user) {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };
}

function sanitizeFileName(fileName) {
  return String(fileName || "task-document.pdf")
    .replace(/[^a-z0-9_.-]/gi, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function decodePdfData(fileData) {
  if (!fileData) {
    return null;
  }

  const data = String(fileData);
  const base64 = data.includes(",") ? data.split(",").pop() : data;
  const buffer = Buffer.from(base64, "base64");
  const isPdf = buffer.subarray(0, 4).toString("utf8") === "%PDF";
  if (!isPdf) {
    throw new Error("Only valid PDF files are allowed.");
  }
  return buffer;
}

async function sendProtectedPdf(req, res, docId) {
  const user = await getSessionUser(req);
  if (!user) {
    return sendError(res, 401, "Please log in to access this PDF.");
  }

  const docs = await readJson(DOCS_FILE);
  const doc = docs.find((item) => item.id === docId);
  if (!doc?.pdf?.storedName) {
    return sendError(res, 404, "PDF not found.");
  }

  const filePath = path.join(UPLOAD_DIR, doc.pdf.storedName);
  const data = await fs.readFile(filePath);
  const fileName = sanitizeFileName(doc.pdf.originalName);
  res.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${fileName}"`,
    "Content-Length": data.length
  });
  return res.end(data);
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `portfolio_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${secure}`
  );
}

function clearSessionCookie(req, res) {
  const token = parseCookies(req).portfolio_session;
  if (token) {
    sessions.delete(token);
  }
  res.setHeader("Set-Cookie", "portfolio_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
}

async function handleApi(req, res, pathname) {
  const pdfMatch = pathname.match(/^\/api\/docs\/([a-f0-9-]+)\/file$/i);
  if (pdfMatch && req.method === "GET") {
    return sendProtectedPdf(req, res, pdfMatch[1]);
  }

  if (pathname === "/api/register" && req.method === "POST") {
    const body = await parseBody(req);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!name) {
      return sendError(res, 400, "Name field is empty.");
    }
    if (!email) {
      return sendError(res, 400, "Email field is empty.");
    }
    if (!isValidEmail(email)) {
      return sendError(res, 400, "Please enter a valid email address.");
    }
    if (!password) {
      return sendError(res, 400, "Password field is empty.");
    }
    if (password.length < 8) {
      return sendError(res, 400, "Password must be at least 8 characters.");
    }

    const users = await readJson(USERS_FILE);
    if (users.some((user) => user.email === email)) {
      return sendError(res, 409, "This email is already registered.");
    }

    const user = createUser(email, password, name);
    users.push(user);
    await writeJson(USERS_FILE, users);
    setSessionCookie(res, createSession(user));
    return sendJson(res, 201, { user: publicUser(user) });
  }

  if (pathname === "/api/login" && req.method === "POST") {
    const body = await parseBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email) {
      return sendError(res, 400, "Email field is empty.");
    }
    if (!isValidEmail(email)) {
      return sendError(res, 400, "Please enter a valid email address.");
    }
    if (!password) {
      return sendError(res, 400, "Password field is empty.");
    }

    const users = await readJson(USERS_FILE);
    const user = users.find((item) => item.email === email);
    if (!user) {
      return sendError(res, 401, "No account found with this email.");
    }
    if (!verifyPassword(password, user)) {
      return sendError(res, 401, "Wrong password. Please try again.");
    }

    setSessionCookie(res, createSession(user));
    return sendJson(res, 200, { user: publicUser(user) });
  }

  if (pathname === "/api/logout" && req.method === "POST") {
    clearSessionCookie(req, res);
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === "/api/me" && req.method === "GET") {
    return sendJson(res, 200, { user: publicUser(await getSessionUser(req)) });
  }

  if (pathname === "/api/docs" && req.method === "GET") {
    const user = await getSessionUser(req);
    if (!user) {
      return sendError(res, 401, "Please log in to access task documentation.");
    }
    const docs = await readJson(DOCS_FILE);
    return sendJson(res, 200, { docs: docs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  }

  if (pathname === "/api/docs" && req.method === "POST") {
    const user = await getSessionUser(req);
    if (!user) {
      return sendError(res, 401, "Please log in first.");
    }
    if (user.role !== "admin") {
      return sendError(res, 403, "Only Atul can upload task documentation.");
    }

    const { title, category, content, fileName, fileData } = await parseBody(req);
    if (!title || (!content && !fileData)) {
      return sendError(res, 400, "Title and documentation text or a PDF file is required.");
    }

    const docs = await readJson(DOCS_FILE);
    const id = crypto.randomUUID();
    let pdf = null;
    if (fileData) {
      const pdfBuffer = decodePdfData(fileData);
      const originalName = sanitizeFileName(fileName);
      const storedName = `${id}.pdf`;
      await fs.writeFile(path.join(UPLOAD_DIR, storedName), pdfBuffer);
      pdf = {
        originalName,
        storedName,
        size: pdfBuffer.length,
        url: `/api/docs/${id}/file`
      };
    }

    docs.push({
      id,
      title: String(title).trim(),
      category: String(category || "General").trim(),
      content: String(content || "").trim(),
      pdf,
      author: user.name,
      createdAt: new Date().toISOString()
    });
    await writeJson(DOCS_FILE, docs);
    return sendJson(res, 201, { ok: true });
  }

  return sendError(res, 404, "API route not found.");
}

async function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(__dirname, safePath));
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  try {
    const ext = path.extname(filePath);
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname);
      return;
    }
    await serveStatic(req, res, pathname);
  } catch (error) {
    console.error(error);
    sendError(res, 500, "Something went wrong.");
  }
});

ensureData().then(() => {
  server.listen(PORT, () => {
    console.log(`Portfolio server running at http://localhost:${PORT}`);
  });
});
