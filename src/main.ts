import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import { initI18n, setLang, getLang, onLangChange, applyTranslations, t } from "./i18n";
import { initTheme, toggleTheme, getTheme, onThemeChange } from "./theme";
import { projects } from "./data/projects";
import { infraServices } from "./data/infra";
import { contacts } from "./data/contacts";
import { fetchInfraSnapshot, type InfraSnapshot } from "./komari";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <nav class="nav">
    <div class="container nav__inner">
      <span class="nav__mark">HZ</span>
      <div class="nav__links">
        <a class="nav__link" href="#about" data-i18n="nav.about"></a>
        <a class="nav__link" href="#infra" data-i18n="nav.infra"></a>
        <a class="nav__link" href="#projects" data-i18n="nav.projects"></a>
        <a class="nav__link" href="#contact" data-i18n="nav.contact"></a>
      </div>
      <div class="nav__controls">
        <button id="theme-toggle" class="icon-btn" type="button" data-i18n-attr="aria-label:nav.themeToggle"></button>
        <button id="lang-toggle" class="icon-btn lang-btn" type="button" data-i18n-attr="aria-label:nav.langToggle"></button>
      </div>
    </div>
  </nav>

  <main>
    <section class="hero">
      <div class="container hero__grid">
        <div>
          <span class="hero__eyebrow" data-i18n="hero.eyebrow"></span>
          <h1 class="hero__name" data-i18n="hero.name"></h1>
          <p class="hero__tagline" data-i18n="hero.tagline"></p>
          <div class="hero__actions">
            <a class="btn btn--primary" href="#projects"><span data-i18n="hero.cta"></span><i class="ph ph-arrow-down-right"></i></a>
            <a class="btn btn--text" href="#about"><span data-i18n="hero.more"></span><i class="ph ph-arrow-right"></i></a>
          </div>
          <p class="hero__support"><i class="ph ph-terminal-window"></i><span data-i18n="hero.note"></span></p>
          <div class="hero__stats">
            <div class="hero__stat">
              <span class="hero__stat-value" id="hero-stat-servers">--</span>
              <span class="hero__stat-label" data-i18n="hero.stat.servers"></span>
            </div>
            <div class="hero__stat">
              <span class="hero__stat-value" id="hero-stat-regions">--</span>
              <span class="hero__stat-label" data-i18n="hero.stat.regions"></span>
            </div>
            <div class="hero__stat">
              <span class="hero__stat-value">${projects.length}</span>
              <span class="hero__stat-label" data-i18n="hero.stat.projects"></span>
            </div>
          </div>
          <div class="hero__focus">
            <span class="hero__focus-label" data-i18n="hero.focusLabel"></span>
            <div class="hero__focus-list">
              <span data-i18n="hero.focus1"></span><span data-i18n="hero.focus2"></span><span data-i18n="hero.focus3"></span>
            </div>
          </div>
        </div>
        <svg class="hero__mark" viewBox="0 0 200 200" fill="none" aria-hidden="true">
          <circle cx="100" cy="100" r="92" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 6"/>
          <circle cx="100" cy="100" r="60" stroke="var(--accent)" stroke-width="1.5"/>
          <path d="M100 40 L100 160 M40 100 L160 100" stroke="var(--border)" stroke-width="1"/>
          <circle cx="100" cy="100" r="5" fill="var(--accent)"/>
          <g class="hero__orbit">
            <circle cx="100" cy="8" r="3.5" fill="var(--accent)"/>
          </g>
        </svg>
      </div>
    </section>

    <section id="about" class="section reveal">
      <div class="container about__grid">
        <div class="about__bio">
          <span class="section__index">01</span>
          <h2 class="section__title" data-i18n="about.title"></h2>
          <span class="about__identity" data-i18n="about.identity"></span>
          <p data-i18n="about.bio1"></p>
          <p data-i18n="about.bio2"></p>
        </div>
        <div>
          <h3 class="section__lead" data-i18n="about.skillsTitle" style="margin-bottom:16px;color:var(--text);font-weight:600;font-size:1rem;"></h3>
          <div class="skills" id="skills-list"></div>
          <h3 class="section__lead" data-i18n="about.timelineTitle" style="margin-top:32px;margin-bottom:0;color:var(--text);font-weight:600;font-size:1rem;"></h3>
          <div class="timeline">
            <div class="timeline__item">
              <span class="timeline__year">2025</span>
              <span class="timeline__label" data-i18n="about.timeline.2025"></span>
            </div>
            <div class="timeline__item">
              <span class="timeline__year">2026</span>
              <span class="timeline__label" data-i18n="about.timeline.2026"></span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="infra" class="infra section reveal">
      <div class="container">
        <div class="section__head">
          <span class="section__index">02</span>
          <h2 class="section__title" data-i18n="infra.title"></h2>
          <p class="section__lead" data-i18n="infra.lead"></p>
        </div>
        <div class="infra__grid">
          <div>
            <div class="infra__stats">
              <div>
                <div class="stat__value" id="stat-servers">--</div>
                <div class="stat__label" data-i18n="infra.statServers"></div>
              </div>
              <div>
                <div class="stat__value" id="stat-regions">--</div>
                <div class="stat__label" data-i18n="infra.statRegions"></div>
              </div>
            </div>
            <div class="infra__globe" id="infra-globe">
              <div class="infra__globe-fallback" id="region-chips"></div>
              <span class="infra__globe-hint">
                <i class="ph ph-arrows-out-cardinal"></i>
                <span data-i18n="infra.globeHint"></span>
              </span>
            </div>
          </div>
          <div class="infra__services" id="infra-services"></div>
        </div>
      </div>
    </section>

    <section id="projects" class="section reveal">
      <div class="container">
        <div class="section__head">
          <span class="section__index">03</span>
          <h2 class="section__title" data-i18n="projects.title"></h2>
          <p class="section__lead" data-i18n="projects.lead"></p>
        </div>
        <div id="project-featured-slot"></div>
        <div class="project-grid" id="project-grid"></div>
      </div>
    </section>

    <section id="contact" class="section contact reveal">
      <div class="container">
        <div class="section__head" style="margin-left:auto;margin-right:auto;text-align:center;">
          <span class="section__index">04</span>
          <h2 class="section__title" data-i18n="contact.title"></h2>
          <p class="section__lead" data-i18n="contact.lead"></p>
        </div>
        <div class="contact__links" id="contact-links"></div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="container" data-i18n="footer.text"></div>
  </footer>

  <div class="modal-overlay" id="modal-overlay">
    <div class="modal" role="dialog" aria-modal="true" id="modal">
      <button class="icon-btn modal__close" id="modal-close" type="button" aria-label="Close">
        <i class="ph ph-x"></i>
      </button>
      <div id="modal-body"></div>
    </div>
  </div>

`;

const SKILLS: Array<{ icon: string; label: string }> = [
  { icon: "ph-code", label: "TypeScript" },
  { icon: "ph-brackets-curly", label: "Go" },
  { icon: "ph-terminal-window", label: "Linux" },
  { icon: "ph-cloud", label: "Self-hosting" },
  { icon: "ph-git-branch", label: "Git" },
  { icon: "ph-brain", label: "AI / ML basics" },
];

function renderSkills(): void {
  const el = document.getElementById("skills-list")!;
  el.innerHTML = SKILLS.map(
    (s) => `<div class="skill-tag"><i class="ph ${s.icon}"></i><span>${s.label}</span></div>`
  ).join("");
}

function renderInfraServices(): void {
  const el = document.getElementById("infra-services")!;
  el.innerHTML = infraServices
    .map(
      (s) => `
      <div class="service-row">
        <i class="ph ${s.icon}"></i>
        <div>
          <div class="service-row__name" data-i18n="${s.nameKey}"></div>
          <div class="service-row__desc" data-i18n="${s.descKey}"></div>
        </div>
      </div>`
    )
    .join("");
}

function renderContacts(): void {
  const el = document.getElementById("contact-links")!;
  el.innerHTML = contacts
    .map(
      (c) => `
      <a class="contact-link" href="${c.href}"${c.external ? ` target="_blank" rel="noopener"` : ""}>
        <i class="ph ${c.icon}"></i>
        <span data-i18n="${c.labelKey}"></span>
      </a>`
    )
    .join("");
}

const infraSnapshotPromise = fetchInfraSnapshot();
let infraSnapshotCache: InfraSnapshot | null = null;

function paintRegionChips(): void {
  if (!infraSnapshotCache) return;
  const chips = document.getElementById("region-chips")!;
  if (infraSnapshotCache.live && infraSnapshotCache.regions.length) {
    chips.innerHTML = infraSnapshotCache.regions
      .map((r) => `<span class="region-chip">${r}</span>`)
      .join("");
  } else {
    const label = t("infra.regionsFallback").replace("{count}", String(infraSnapshotCache.regionCount));
    chips.innerHTML = `<span class="region-chip">${label}</span>`;
  }
}

async function renderInfraStats(): Promise<void> {
  infraSnapshotCache = await infraSnapshotPromise;
  document.getElementById("stat-servers")!.textContent = String(infraSnapshotCache.serverCount);
  document.getElementById("stat-regions")!.textContent = String(infraSnapshotCache.regionCount);
  document.getElementById("hero-stat-servers")!.textContent = String(infraSnapshotCache.serverCount);
  document.getElementById("hero-stat-regions")!.textContent = String(infraSnapshotCache.regionCount);
  paintRegionChips();
}

function setupInfraGlobe(): void {
  const container = document.getElementById("infra-globe")!;
  const canvasMount = document.createElement("div");
  canvasMount.className = "infra__globe-canvas";
  container.prepend(canvasMount);

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        mountGlobeWhenReady(container, canvasMount);
      }
    },
    { threshold: 0.2 }
  );
  observer.observe(container);
}

async function mountGlobeWhenReady(container: HTMLElement, canvasMount: HTMLElement): Promise<void> {
  const snapshot = await infraSnapshotPromise;
  if (!snapshot.regionBreakdown.length) return;
  const { mountGlobe } = await import("./globe");
  container.classList.add("has-live");
  mountGlobe(canvasMount, snapshot);
}

function openModal(html: string): void {
  const overlay = document.getElementById("modal-overlay")!;
  document.getElementById("modal-body")!.innerHTML = html;
  overlay.classList.add("is-open");
}

function closeModal(): void {
  document.getElementById("modal-overlay")!.classList.remove("is-open");
}

function renderProjects(): void {
  const featuredSlot = document.getElementById("project-featured-slot")!;
  const grid = document.getElementById("project-grid")!;
  const featured = projects.filter((p) => p.featured);
  const rest = projects.filter((p) => !p.featured);

  featuredSlot.innerHTML = featured
    .map(
      (p) => `
      <article class="project-featured" data-project="${p.id}">
        ${
          p.image
            ? `<img class="project-featured__media" src="${p.image}" alt="" loading="lazy" />`
            : `<div class="project-featured__media" data-i18n="projects.media.placeholder"></div>`
        }
        <div>
          <span class="project-featured__tag" data-i18n="${p.id === "authrouter" ? "projects.authrouter.tag" : ""}"></span>
          <h3 class="project-featured__title" data-i18n="${p.titleKey}"></h3>
          <p class="project-featured__desc" data-i18n="${p.descKey}"></p>
        </div>
      </article>`
    )
    .join("");

  grid.innerHTML =
    rest
      .map(
        (p) => `
      <article class="project-card" data-project="${p.id}">
        <h3 class="project-card__title" data-i18n="${p.titleKey}"></h3>
        <p class="project-card__desc" data-i18n="${p.descKey}"></p>
      </article>`
      )
      .join("") +
    (rest.length === 0
      ? `<div class="project-empty" data-i18n="projects.emptyNote"></div>`
      : "");

  document.querySelectorAll<HTMLElement>("[data-project]").forEach((card) => {
    card.addEventListener("click", () => {
      const project = projects.find((p) => p.id === card.dataset.project);
      if (!project) return;
      openModal(`
        <span class="modal__tag" data-i18n="${project.id === "authrouter" ? "projects.authrouter.tag" : ""}"></span>
        <h3 class="modal__title" data-i18n="${project.titleKey}"></h3>
        ${
          project.image
            ? `<img class="modal__media" src="${project.image}" alt="" loading="lazy" />`
            : `<div class="modal__media" data-i18n="projects.media.placeholder"></div>`
        }
        <p class="modal__desc" data-i18n="${project.detailKey ?? project.descKey}"></p>
        <div class="modal__stack">
          ${project.stack.map((s) => `<span class="stack-chip">${s}</span>`).join("")}
        </div>
        <a class="btn btn--primary" href="${project.repoUrl}" target="_blank" rel="noopener" data-i18n="projects.viewOnGithub"></a>
      `);
      applyTranslations();
    });
  });
}

function setupThemeToggle(): void {
  const btn = document.getElementById("theme-toggle")!;
  const paint = () => {
    btn.innerHTML = getTheme() === "dark" ? `<i class="ph ph-sun"></i>` : `<i class="ph ph-moon"></i>`;
  };
  paint();
  onThemeChange(paint);
  btn.addEventListener("click", toggleTheme);
}

function setupLangToggle(): void {
  const btn = document.getElementById("lang-toggle")!;
  const paint = () => {
    btn.textContent = getLang() === "zh" ? "EN" : "中文";
  };
  paint();
  onLangChange(() => {
    paint();
    paintRegionChips();
  });
  btn.addEventListener("click", () => setLang(getLang() === "zh" ? "en" : "zh"));
}

function setupModal(): void {
  document.getElementById("modal-close")!.addEventListener("click", closeModal);
  document.getElementById("modal-overlay")!.addEventListener("click", (e) => {
    if (e.target === document.getElementById("modal-overlay")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

function setupScrollReveal(): void {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = document.querySelectorAll<HTMLElement>(".reveal");
  if (reduceMotion) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  targets.forEach((el) => observer.observe(el));
}

initTheme();
initI18n();
renderSkills();
renderInfraServices();
renderProjects();
renderContacts();
setupThemeToggle();
setupLangToggle();
setupModal();
setupScrollReveal();
setupInfraGlobe();
applyTranslations();
renderInfraStats();

// Ensure the empty i18n keys used as placeholders (e.g. tag on non-featured items) don't render "undefined"
document.querySelectorAll<HTMLElement>('[data-i18n=""]').forEach((el) => el.remove());

