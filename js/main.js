const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canUseCustomCursor = window.matchMedia("(hover: hover)").matches && !prefersReducedMotion;
const cursorDot = document.querySelector(".cursor-dot");
const cursorRing = document.querySelector(".cursor-ring");
const cursorLabel = document.querySelector(".cursor-label");
const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");
const shortFormGrid = document.querySelector("#short-form-grid");
const playbackObserver = new IntersectionObserver(handlePlayback, { threshold: 0.2 });
let inlineVideos = [];
let pointerX = window.innerWidth / 2;
let pointerY = window.innerHeight / 2;
let ringX = pointerX;
let ringY = pointerY;

if (canUseCustomCursor) {
  document.body.classList.add("custom-cursor");

  window.addEventListener("pointermove", (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    cursorDot.style.left = `${pointerX}px`;
    cursorDot.style.top = `${pointerY}px`;
    cursorDot.style.opacity = "1";
    cursorRing.style.opacity = "1";
  }, { passive: true });

  window.addEventListener("pointerleave", () => {
    cursorDot.style.opacity = "0";
    cursorRing.style.opacity = "0";
  });

  document.addEventListener("pointerover", (event) => {
    const target = event.target.closest("[data-cursor]");
    if (!target) return;
    document.body.classList.add("cursor-hover");
    cursorLabel.textContent = target.dataset.cursor;
  });

  document.addEventListener("pointerout", (event) => {
    const target = event.target.closest("[data-cursor]");
    if (!target || target.contains(event.relatedTarget)) return;
    document.body.classList.remove("cursor-hover");
  });

  function animateCursor() {
    ringX += (pointerX - ringX) * 0.16;
    ringY += (pointerY - ringY) * 0.16;
    cursorRing.style.left = `${ringX}px`;
    cursorRing.style.top = `${ringY}px`;
    requestAnimationFrame(animateCursor);
  }

  animateCursor();
}

function closeMenu() {
  menuToggle?.setAttribute("aria-expanded", "false");
  mobileNav?.classList.remove("is-open");
}

menuToggle?.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!open));
  mobileNav.classList.toggle("is-open", !open);
});

mobileNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

function getVideoFrame(video) {
  return video.closest(".project-video");
}

function updateSoundIndicator(video) {
  const frame = getVideoFrame(video);
  const muted = video.muted;
  frame?.classList.toggle("is-unmuted", !muted);
  frame?.setAttribute("aria-label", muted ? "Toggle video sound on" : "Toggle video sound off");
}

function showVideo(video) {
  const frame = getVideoFrame(video);
  frame?.querySelector(".video-fallback")?.setAttribute("hidden", "");
  frame?.classList.add("is-video-ready");
  frame?.classList.remove("has-error", "is-loading");
  video.classList.add("is-ready");
}

function showFallback(video) {
  const frame = getVideoFrame(video);
  frame?.querySelector(".video-fallback")?.removeAttribute("hidden");
  frame?.classList.add("has-error");
  frame?.classList.remove("is-video-ready", "is-loading");
  video.classList.remove("is-ready");
}

function setLoading(video, isLoading) {
  const frame = getVideoFrame(video);
  if (!isLoading && video.readyState >= 2) {
    frame?.classList.remove("is-loading");
    return;
  }
  frame?.classList.toggle("is-loading", isLoading);
}

function loadVideo(video) {
  const source = video.dataset.videoSrc;
  if (!source || video.dataset.loaded === "true") return;
  video.dataset.loaded = "true";
  video.src = source;
  video.load();
}

function muteOtherVideos(currentVideo) {
  inlineVideos.forEach((video) => {
    if (video !== currentVideo && !video.muted) {
      video.muted = true;
      updateSoundIndicator(video);
    }
  });
}

function toggleVideoSound(video) {
  loadVideo(video);
  muteOtherVideos(video);
  video.muted = !video.muted;
  video.dataset.autoplayRequested = "true";
  updateSoundIndicator(video);
  video.play().catch(() => {});
}

function bindVideo(video) {
  const frame = getVideoFrame(video);
  if (!frame || video.dataset.bound === "true") return;
  video.dataset.bound = "true";
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  updateSoundIndicator(video);

  frame.addEventListener("click", () => toggleVideoSound(video));
  frame.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleVideoSound(video);
  });

  video.addEventListener("loadeddata", () => showVideo(video));
  video.addEventListener("canplay", () => {
    showVideo(video);
    if (video.dataset.autoplayRequested === "true" && video.paused) video.play().catch(() => {});
  });
  video.addEventListener("playing", () => showVideo(video));
  video.addEventListener("waiting", () => setLoading(video, true));
  video.addEventListener("canplaythrough", () => setLoading(video, false));
  video.addEventListener("volumechange", () => updateSoundIndicator(video));
  video.addEventListener("error", () => showFallback(video));

  if (video.readyState >= 2) showVideo(video);
  inlineVideos.push(video);
  playbackObserver.observe(video);
}

function handlePlayback(entries) {
  entries.forEach((entry) => {
    const video = entry.target;
    if (entry.isIntersecting) {
      loadVideo(video);
      video.muted = true;
      video.dataset.autoplayRequested = "true";
      updateSoundIndicator(video);
      setLoading(video, true);
      video.play().catch(() => {});
      return;
    }
    video.pause();
    video.muted = true;
    updateSoundIndicator(video);
  });
}

function soundIcon() {
  return `<span class="video-sound-indicator" aria-hidden="true"><svg class="sound-icon" viewBox="0 0 24 24" focusable="false"><path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor"></path><path class="sound-wave" d="M16 9.5c1.8 1.3 1.8 3.7 0 5"></path><path class="sound-wave sound-wave-wide" d="M18.5 7c3.1 2.6 3.1 7.4 0 10"></path><path class="sound-slash" d="m4 4 16 16"></path></svg></span>`;
}

function createShortFormCard(source, index) {
  const card = document.createElement("article");
  card.className = "short-form-card reveal is-visible";
  const projectNumber = String(index).padStart(2, "0");
  card.innerHTML = `<div class="short-form-meta"><span>${projectNumber}</span><span>SHORT-FORM EDIT</span></div><div class="project-video" role="button" tabindex="0" aria-label="Toggle short-form video ${projectNumber} sound" data-cursor="SOUND"><video autoplay muted loop playsinline preload="none" data-video-src="${source}"></video><span class="video-skeleton" aria-hidden="true"></span>${soundIcon()}</div>`;
  return card;
}

function updateProjectNumbers(shortFormCount = 0) {
  document.querySelectorAll(".project").forEach((project, index) => {
    const number = project.querySelector(".project-meta span:first-child");
    if (number) number.textContent = String(shortFormCount + index + 1).padStart(2, "0");
  });
}

async function fileExists(source) {
  try {
    const response = await fetch(source, { method: "HEAD", cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

async function loadShortFormVideos() {
  if (!shortFormGrid) return;
  const sources = Array.from({ length: 6 }, (_, index) => `assets/short-${String(index + 1).padStart(2, "0")}.mp4`);
  const availableSources = (await Promise.all(sources.map(async (source) => (await fileExists(source) ? source : null)))).filter(Boolean);

  availableSources.forEach((source, index) => shortFormGrid.append(createShortFormCard(source, index + 1)));
  shortFormGrid.querySelectorAll("video").forEach(bindVideo);
  updateProjectNumbers(availableSources.length);
}

document.querySelectorAll(".project-video video").forEach(bindVideo);
loadShortFormVideos();

document.querySelector(".discord-copy")?.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const username = button.dataset.discordUsername;
  const status = button.querySelector(".discord-copy-status");
  try {
    await navigator.clipboard.writeText(username);
    status.textContent = "COPIED";
  } catch {
    status.textContent = "COPY FAILED";
  }
  window.setTimeout(() => { status.textContent = "COPY"; }, 1800);
});

function revealElement(element) {
  element.classList.add("is-visible");
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    revealElement(entry.target);
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((element, index) => {
  if (prefersReducedMotion) {
    revealElement(element);
    return;
  }
  element.style.animationDelay = `${Math.min(index * 45, 260)}ms`;
  revealObserver.observe(element);
});

function updateMarqueeDistances() {
  document.querySelectorAll(".tool-track").forEach((track) => {
    const firstGroup = track.querySelector(".tool-group");
    if (!firstGroup) return;
    track.style.setProperty("--marquee-shift", `-${firstGroup.getBoundingClientRect().width}px`);
  });
}

updateMarqueeDistances();

window.addEventListener("resize", updateMarqueeDistances);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

let scrollTarget = window.scrollY;
let scrollCurrent = window.scrollY;

function updateScrollMotion() {
  scrollCurrent += (scrollTarget - scrollCurrent) * 0.1;
  const ghostName = document.querySelector(".ghost-name");
  const hero = document.querySelector(".hero");
  if (ghostName && hero) {
    const progress = Math.min(Math.max(scrollCurrent / hero.offsetHeight, 0), 1);
    ghostName.style.setProperty("--ghost-shift", `${progress * -110}px`);
  }
  document.querySelectorAll(".project-video").forEach((frame) => {
    const bounds = frame.getBoundingClientRect();
    const distance = (bounds.top + bounds.height / 2 - window.innerHeight / 2) / window.innerHeight;
    const scale = Math.max(0.965, Math.min(1.025, 1.015 - Math.abs(distance) * 0.035));
    frame.style.setProperty("--project-scale", scale.toFixed(3));
    frame.style.setProperty("--project-shift", `${Math.max(-12, Math.min(12, distance * -14)).toFixed(1)}px`);
  });
  requestAnimationFrame(updateScrollMotion);
}

if (!prefersReducedMotion) {
  window.addEventListener("scroll", () => { scrollTarget = window.scrollY; }, { passive: true });
  updateScrollMotion();
}
