const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const navItems = document.querySelectorAll(".nav-links a");
const sections = document.querySelectorAll("main section");
const revealItems = document.querySelectorAll(".section, .card, .timeline .item, .tags span, .skill-card");
const filterButtons = document.querySelectorAll(".skill-filter");
const skills = document.querySelectorAll(".skill-card");
const cursorDot = document.querySelector(".cursor-dot");
const cursorGlow = document.querySelector(".cursor-glow");
const scrollProgress = document.querySelector(".scroll-progress span");
const backTop = document.querySelector(".back-top");
const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const logoutButton = document.querySelector("#logout-button");
const docsDashboard = document.querySelector("#docs-dashboard");
const authSection = document.querySelector("#auth-section");
const userStatus = document.querySelector("#user-status");
const profileButton = document.querySelector("#profile-button");
const profilePanel = document.querySelector("#profile-panel");
const profileAvatar = document.querySelector("#profile-avatar");
const profileName = document.querySelector("#profile-name");
const profileRole = document.querySelector("#profile-role");
const profileDetailName = document.querySelector("#profile-detail-name");
const profileDetailEmail = document.querySelector("#profile-detail-email");
const profileDetailRole = document.querySelector("#profile-detail-role");
const docForm = document.querySelector("#doc-form");
const docList = document.querySelector("#doc-list");
const docSearch = document.querySelector("#doc-search");
const docCategory = document.querySelector("#doc-category");
const docCount = document.querySelector("#doc-count");
const pdfCount = document.querySelector("#pdf-count");
const categoryCount = document.querySelector("#category-count");
const formMessage = document.querySelector("#form-message");
const themeButtons = document.querySelectorAll("[data-theme-choice]");
const animationLab = document.querySelector("[data-animation-mode]");
const animationButton = document.querySelector("[data-animation-button]");
const animationName = document.querySelector("[data-animation-name]");
const animationDescription = document.querySelector("[data-animation-description]");
const resumeOpenButton = document.querySelector("[data-resume-open]");
const resumeModal = document.querySelector("[data-resume-modal]");
const resumeCloseButtons = document.querySelectorAll("[data-resume-close]");
const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
let allDocs = [];
const isFileProtocol = window.location.protocol === "file:";
const localServerUrl = "http://localhost:3000/docs.html";
const animationModes = [
  {
    id: "pulse",
    name: "Pulse Flow",
    description: "Soft scaling motion for highlighting active sections."
  },
  {
    id: "orbit",
    name: "Orbit Loop",
    description: "Circular motion for showing connected services and routing."
  },
  {
    id: "wave",
    name: "Wave Sync",
    description: "Sequential movement for skill tags, cards, and section reveals."
  },
  {
    id: "stack",
    name: "Stack Shift",
    description: "Layered motion that feels like containers rolling into place."
  }
];
let animationIndex = 0;

const getStoredTheme = () => localStorage.getItem("portfolio-theme") || "system";

const applyTheme = (theme) => {
  const resolvedTheme = theme === "system" ? (systemTheme.matches ? "light" : "dark") : theme;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themeChoice = theme;
  themeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.themeChoice === theme);
  });
};

applyTheme(getStoredTheme());

themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const theme = button.dataset.themeChoice;
    localStorage.setItem("portfolio-theme", theme);
    applyTheme(theme);
  });
});

systemTheme.addEventListener("change", () => {
  if (getStoredTheme() === "system") {
    applyTheme("system");
  }
});

if (cursorDot && cursorGlow && window.matchMedia("(pointer: fine)").matches) {
  let mouseX = 0;
  let mouseY = 0;
  let glowX = 0;
  let glowY = 0;
  let hasMoved = false;

  const moveCursor = () => {
    glowX += (mouseX - glowX) * 0.42;
    glowY += (mouseY - glowY) * 0.42;

    cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
    cursorGlow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0) translate(-50%, -50%)`;

    requestAnimationFrame(moveCursor);
  };

  window.addEventListener("mousemove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    if (!hasMoved) {
      glowX = mouseX;
      glowY = mouseY;
      hasMoved = true;
    }
    document.body.classList.add("cursor-ready");
  });

  document.addEventListener("mouseleave", () => {
    document.body.classList.remove("cursor-ready");
  });

  document.querySelectorAll("a, button, .card, .tags span").forEach((item) => {
    item.addEventListener("mouseenter", () => document.body.classList.add("cursor-hover"));
    item.addEventListener("mouseleave", () => document.body.classList.remove("cursor-hover"));
  });

  moveCursor();
}

const updateScrollTools = () => {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  if (scrollProgress) {
    scrollProgress.style.transform = `scaleX(${progress})`;
  }
  backTop?.classList.toggle("show", window.scrollY > 520);
};

window.addEventListener("scroll", updateScrollTools, { passive: true });
window.addEventListener("resize", updateScrollTools);
updateScrollTools();

backTop?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

menuToggle?.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  document.body.classList.toggle("menu-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
});

navItems.forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    document.body.classList.remove("menu-open");
    menuToggle?.setAttribute("aria-expanded", "false");
    menuToggle?.setAttribute("aria-label", "Open navigation");
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

revealItems.forEach((item) => revealObserver.observe(item));

const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      navItems.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  },
  { rootMargin: "-42% 0px -50% 0px" }
);

sections.forEach((section) => navObserver.observe(section));

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    skills.forEach((skill) => {
      const shouldShow = filter === "all" || skill.dataset.category === filter;
      skill.classList.toggle("is-hidden", !shouldShow);
    });
  });
});

const updateAnimationMode = (index) => {
  const mode = animationModes[index];
  if (!mode || !animationLab) {
    return;
  }

  animationLab.dataset.animationMode = mode.id;
  if (animationName) {
    animationName.textContent = mode.name;
  }
  if (animationDescription) {
    animationDescription.textContent = mode.description;
  }
};

animationButton?.addEventListener("click", () => {
  animationIndex = (animationIndex + 1) % animationModes.length;
  updateAnimationMode(animationIndex);
});

const openResumeModal = () => {
  if (!resumeModal) {
    return;
  }

  resumeModal.classList.add("is-open");
  resumeModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("resume-open");
  resumeModal.querySelector("[data-resume-close]")?.focus();
};

const closeResumeModal = () => {
  if (!resumeModal) {
    return;
  }

  resumeModal.classList.remove("is-open");
  resumeModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("resume-open");
  resumeOpenButton?.focus();
};

resumeOpenButton?.addEventListener("click", openResumeModal);

resumeCloseButtons.forEach((button) => {
  button.addEventListener("click", closeResumeModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && resumeModal?.classList.contains("is-open")) {
    closeResumeModal();
  }
});

const apiRequest = async (path, options = {}) => {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
};

const setMessage = (message) => {
  if (formMessage) {
    formMessage.textContent = message;
  }
};

const getInitials = (name) =>
  String(name || "User")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

const getNetworkMessage = (error) => {
  if (isFileProtocol) {
    return `Login/register needs the Node server. Open ${localServerUrl} instead of this file path.`;
  }
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return "Could not connect to the server. Start it with npm start, then open http://localhost:3000/docs.html.";
  }
  return error.message;
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));

const clearFormErrors = (form) => {
  form?.querySelectorAll(".field-error").forEach((error) => error.remove());
  form?.querySelectorAll(".invalid").forEach((field) => field.classList.remove("invalid"));
};

const showFieldError = (field, message) => {
  field.classList.add("invalid");
  const error = document.createElement("span");
  error.className = "field-error";
  error.textContent = message;
  field.closest("label")?.append(error);
};

const validateAuthForm = (form, mode) => {
  clearFormErrors(form);
  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const errors = [];

  if (mode === "register" && !name) {
    errors.push(["name", "Name field is empty."]);
  }
  if (!email) {
    errors.push(["email", "Email field is empty."]);
  } else if (!isValidEmail(email)) {
    errors.push(["email", "Please enter a valid email address."]);
  }
  if (!password) {
    errors.push(["password", "Password field is empty."]);
  } else if (mode === "register" && password.length < 8) {
    errors.push(["password", "Password must be at least 8 characters."]);
  }

  errors.forEach(([nameAttr, message]) => {
    const field = form.querySelector(`[name="${nameAttr}"]`);
    if (field) {
      showFieldError(field, message);
    }
  });

  if (errors.length) {
    const firstError = errors[0][1];
    setMessage(firstError);
    form.querySelector(".invalid")?.focus();
    return null;
  }

  return { name, email, password };
};

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));

const readingTime = (content) => {
  const words = String(content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const readPdfFile = (file) =>
  new Promise((resolve, reject) => {
    if (!file || !file.name) {
      resolve(null);
      return;
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      reject(new Error("Only PDF files are allowed."));
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () =>
      resolve({
        fileName: file.name,
        fileData: reader.result
      })
    );
    reader.addEventListener("error", () => reject(new Error("Could not read the PDF file.")));
    reader.readAsDataURL(file);
  });

const renderDocs = (docs) => {
  if (!docList) {
    return;
  }

  if (!docs.length) {
    docList.innerHTML = '<article class="doc-item"><p>No matching task documentation found.</p></article>';
    return;
  }

  docList.innerHTML = docs
    .map(
      (doc) => {
        const pdfLink = doc.pdf
          ? `
            <div class="doc-actions">
              <a class="pdf-link" href="${escapeHtml(doc.pdf.url)}" target="_blank" rel="noreferrer">Open PDF</a>
              <button class="copy-link" type="button" data-copy-url="${escapeHtml(doc.pdf.url)}">Copy PDF link</button>
            </div>
          `
          : "";
        return `
        <article class="doc-item">
          <header>
            <div>
              <span>${escapeHtml(doc.category)}</span>
              <h3>${escapeHtml(doc.title)}</h3>
            </div>
            <time datetime="${doc.createdAt}">${formatDate(doc.createdAt)}</time>
          </header>
          <div class="doc-meta">
            <span>${readingTime(doc.content)} min read</span>
            <span>${doc.pdf ? "PDF attached" : "Notes only"}</span>
          </div>
          <pre>${escapeHtml(doc.content)}</pre>
          ${pdfLink}
        </article>
      `;
      }
    )
    .join("");

  document.querySelectorAll("[data-copy-url]").forEach((button) => {
    button.addEventListener("click", async () => {
      const url = new URL(button.dataset.copyUrl, window.location.origin).href;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        button.textContent = "Copied";
      } else {
        button.textContent = "Copy unavailable";
      }
      setTimeout(() => {
        button.textContent = "Copy PDF link";
      }, 1400);
    });
  });
};

const updateDocStats = (docs) => {
  const categories = new Set(docs.map((doc) => doc.category || "General"));
  if (docCount) {
    docCount.textContent = String(docs.length);
  }
  if (pdfCount) {
    pdfCount.textContent = String(docs.filter((doc) => doc.pdf).length);
  }
  if (categoryCount) {
    categoryCount.textContent = String(categories.size);
  }
};

const updateCategoryOptions = (docs) => {
  if (!docCategory) {
    return;
  }

  const selected = docCategory.value;
  const categories = [...new Set(docs.map((doc) => doc.category || "General"))].sort();
  docCategory.innerHTML = '<option value="all">All categories</option>';
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    docCategory.append(option);
  });
  docCategory.value = categories.includes(selected) ? selected : "all";
};

const applyDocFilters = () => {
  const query = (docSearch?.value || "").trim().toLowerCase();
  const category = docCategory?.value || "all";
  const filtered = allDocs.filter((doc) => {
    const searchable = `${doc.title} ${doc.category} ${doc.content}`.toLowerCase();
    const matchesSearch = !query || searchable.includes(query);
    const matchesCategory = category === "all" || doc.category === category;
    return matchesSearch && matchesCategory;
  });
  renderDocs(filtered);
};

const loadDocs = async () => {
  const { docs } = await apiRequest("/api/docs");
  allDocs = docs;
  updateDocStats(docs);
  updateCategoryOptions(docs);
  applyDocFilters();
};

docSearch?.addEventListener("input", applyDocFilters);
docCategory?.addEventListener("change", applyDocFilters);

const showSession = async (user) => {
  if (!authSection || !docsDashboard || !userStatus || !docForm) {
    return;
  }

  if (!user) {
    authSection.classList.remove("is-hidden");
    docsDashboard.classList.add("is-hidden");
    docForm.classList.add("is-hidden");
    profilePanel?.classList.add("is-hidden");
    return;
  }

  authSection.classList.add("is-hidden");
  docsDashboard.classList.remove("is-hidden");
  userStatus.textContent = `Logged in as ${user.name}`;
  if (profileAvatar) {
    profileAvatar.textContent = getInitials(user.name);
  }
  if (profileName) {
    profileName.textContent = user.name;
  }
  if (profileRole) {
    profileRole.textContent = user.role === "admin" ? "Admin access" : "Reader access";
  }
  if (profileDetailName) {
    profileDetailName.textContent = user.name;
  }
  if (profileDetailEmail) {
    profileDetailEmail.textContent = user.email;
  }
  if (profileDetailRole) {
    profileDetailRole.textContent = user.role === "admin" ? "Admin - can upload documents" : "User - can view documents";
  }
  docForm.classList.toggle("is-hidden", user.role !== "admin");
  await loadDocs();
};

profileButton?.addEventListener("click", () => {
  const isOpen = profilePanel?.classList.toggle("is-hidden") === false;
  profileButton.setAttribute("aria-expanded", String(isOpen));
});

const initDocsPage = async () => {
  if (!loginForm && !registerForm) {
    return;
  }

  if (isFileProtocol) {
    setMessage(`You opened this as a file. Start the server and open ${localServerUrl} for login/register.`);
    return;
  }

  try {
    const { user } = await apiRequest("/api/me");
    await showSession(user);
  } catch (error) {
    setMessage(getNetworkMessage(error));
  }
};

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = validateAuthForm(loginForm, "login");
  if (!payload) {
    return;
  }
  if (isFileProtocol) {
    setMessage(`Login needs the server. Open ${localServerUrl}.`);
    return;
  }

  try {
    const { user } = await apiRequest("/api/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setMessage("Login successful.");
    clearFormErrors(loginForm);
    await showSession(user);
  } catch (error) {
    setMessage(getNetworkMessage(error));
  }
});

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = validateAuthForm(registerForm, "register");
  if (!payload) {
    return;
  }
  if (isFileProtocol) {
    setMessage(`Register needs the server. Open ${localServerUrl}.`);
    return;
  }

  try {
    const { user } = await apiRequest("/api/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setMessage("Registration successful.");
    clearFormErrors(registerForm);
    await showSession(user);
  } catch (error) {
    setMessage(getNetworkMessage(error));
  }
});

logoutButton?.addEventListener("click", async () => {
  await apiRequest("/api/logout", { method: "POST", body: "{}" });
  setMessage("Logged out.");
  await showSession(null);
});

docForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(docForm);
  try {
    const pdf = await readPdfFile(formData.get("pdf"));
    const payload = {
      title: formData.get("title"),
      category: formData.get("category"),
      content: formData.get("content"),
      ...(pdf || {})
    };

    await apiRequest("/api/docs", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    docForm.reset();
    setMessage("Task documentation published.");
    await loadDocs();
  } catch (error) {
    setMessage(error.message);
  }
});

initDocsPage();
