const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canUseCustomCursor = window.matchMedia("(hover: hover)").matches && !prefersReducedMotion;
const heroVideo = document.querySelector(".hero-reel");
const heroReelWrap = document.querySelector(".hero-reel-wrap");
const heroReelFrame = document.querySelector(".hero-reel-frame");
const projectVideos = [...document.querySelectorAll(".project-video video")];
const inlineVideos = [heroVideo, ...projectVideos].filter(Boolean);
const cursorDot = document.querySelector(".cursor-dot");
const cursorRing = document.querySelector(".cursor-ring");
const cursorLabel = document.querySelector(".cursor-label");
let pointerX = window.innerWidth / 2;
let pointerY = window.innerHeight / 2;
let ringX = pointerX;
let ringY = pointerY;
let showreelExpanded = false;
let showreelClosing = false;
let showreelOriginBounds = null;

if (canUseCustomCursor) {
  function moveCursor(event) {
    pointerX = event.clientX;
    pointerY = event.clientY;
    cursorDot.style.left = `${pointerX}px`;
    cursorDot.style.top = `${pointerY}px`;
    cursorDot.style.opacity = "1";
    cursorRing.style.opacity = "1";
  }

  function animateCursor() {
    ringX += (pointerX - ringX) * 0.16;
    ringY += (pointerY - ringY) * 0.16;
    cursorRing.style.left = `${ringX}px`;
    cursorRing.style.top = `${ringY}px`;
    requestAnimationFrame(animateCursor);
  }

  window.addEventListener("pointermove", moveCursor, { passive: true });
  window.addEventListener("pointerleave", () => {
    cursorDot.style.opacity = "0";
    cursorRing.style.opacity = "0";
  });

  document.querySelectorAll("[data-cursor]").forEach((element) => {
    element.addEventListener("mouseenter", () => {
      document.body.classList.add("cursor-hover");
      cursorLabel.textContent = element.dataset.cursor;
    });
    element.addEventListener("mouseleave", () => document.body.classList.remove("cursor-hover"));
  });

  animateCursor();
}

const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");

function closeMenu() {
  menuToggle.setAttribute("aria-expanded", "false");
  mobileNav.classList.remove("is-open");
}

menuToggle.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!open));
  mobileNav.classList.toggle("is-open", !open);
});

mobileNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

function getVideoFrame(video) {
  return video.closest(".project-video, .hero-reel-frame");
}

function getSoundIndicator(video) {
  return getVideoFrame(video)?.querySelector(".video-sound-indicator");
}

function setLoading(video, isLoading) {
  if (!isLoading && video.readyState >= 2) {
    getVideoFrame(video)?.classList.remove("is-loading");
    return;
  }
  getVideoFrame(video)?.classList.toggle("is-loading", isLoading);
}

function showFallback(video) {
  const frame = getVideoFrame(video);
  const fallback = frame?.querySelector(".video-fallback");
  if (fallback) fallback.hidden = false;
  frame?.classList.add("has-error");
  frame?.classList.remove("is-video-ready", "is-loading");
  video.classList.remove("is-ready");
}

function showVideo(video) {
  const frame = getVideoFrame(video);
  const fallback = frame?.querySelector(".video-fallback");
  if (fallback) fallback.hidden = true;
  frame?.classList.add("is-video-ready");
  frame?.classList.remove("has-error", "is-loading");
  video.classList.add("is-ready");
}

function updateSoundIndicator(video) {
  const frame = getVideoFrame(video);
  const indicator = getSoundIndicator(video);
  const muted = video.muted;
  frame?.classList.toggle("is-unmuted", !muted);
  indicator?.setAttribute("aria-label", muted ? "Muted" : "Sound on");
  frame?.setAttribute("aria-label", muted ? "Toggle video sound on" : "Toggle video sound off");
}

function loadProjectVideo(video) {
  const source = video.dataset.videoSrc;
  if (!source || video.dataset.loaded === "true") return;

  video.dataset.loaded = "true";
  video.src = source;
  video.load();
}

function playMuted(video) {
  if (video.dataset.videoSrc) loadProjectVideo(video);
  video.muted = true;
  video.dataset.autoplayRequested = "true";
  updateSoundIndicator(video);
  setLoading(video, true);
  video.play().catch(() => {});
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
  if (video.dataset.videoSrc) loadProjectVideo(video);
  muteOtherVideos(video);
  video.muted = !video.muted;
  video.dataset.autoplayRequested = "true";
  updateSoundIndicator(video);
  video.play().catch(() => {});
}

function handleVideoInteraction(video) {
  if (showreelExpanded && video === heroVideo) return;
  toggleVideoSound(video);
}

function bindVideoInteraction(video) {
  const frame = getVideoFrame(video);
  if (!frame) return;

  if (video !== heroVideo) {
    frame.addEventListener("click", () => handleVideoInteraction(video));
    frame.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      handleVideoInteraction(video);
    });
  }

  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  updateSoundIndicator(video);
  video.addEventListener("loadeddata", () => showVideo(video));
  video.addEventListener("canplay", () => {
    showVideo(video);
    if (video.dataset.autoplayRequested === "true" && video.paused && !showreelExpanded) {
      video.play().catch(() => {});
    }
  });
  video.addEventListener("playing", () => showVideo(video));
  video.addEventListener("waiting", () => setLoading(video, true));
  video.addEventListener("canplaythrough", () => setLoading(video, false));
  video.addEventListener("volumechange", () => updateSoundIndicator(video));
  video.addEventListener("error", () => showFallback(video));

  if (video.readyState >= 2) showVideo(video);
}

inlineVideos.forEach(bindVideoInteraction);

const playbackObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const video = entry.target;
    if (video === heroVideo && showreelExpanded) return;

    if (entry.isIntersecting) {
      playMuted(video);
    } else {
      video.pause();
      video.muted = true;
      updateSoundIndicator(video);
    }
  });
}, { threshold: 0.2 });

inlineVideos.forEach((video) => playbackObserver.observe(video));

function openShowreel() {
  if (!heroVideo || showreelExpanded || showreelClosing) return;
  showreelOriginBounds = heroReelWrap.getBoundingClientRect();
  setShowreelBounds(showreelOriginBounds);
  showreelExpanded = true;
  heroReelWrap.classList.add("is-expanded");
  document.body.classList.add("showreel-open");
  muteOtherVideos(heroVideo);
  heroVideo.muted = false;
  heroVideo.dataset.autoplayRequested = "true";
  updateSoundIndicator(heroVideo);
  heroVideo.play().catch(() => {});
  heroReelWrap.querySelector(".showreel-close")?.focus();

  requestAnimationFrame(() => {
    if (!showreelExpanded) return;
    const expandedBounds = getExpandedShowreelBounds();
    heroReelWrap.offsetWidth;
    setShowreelBounds(expandedBounds);
  });
}

function closeShowreel() {
  if (!showreelExpanded || showreelClosing) return;
  showreelClosing = true;
  if (showreelOriginBounds) setShowreelBounds(showreelOriginBounds);
  window.setTimeout(() => {
    showreelExpanded = false;
    showreelClosing = false;
    heroReelWrap.classList.remove("is-expanded");
    heroReelWrap.removeAttribute("style");
    document.body.classList.remove("showreel-open");
    heroVideo.muted = true;
    updateSoundIndicator(heroVideo);
    heroVideo.play().catch(() => {});
  }, 440);
}

function getExpandedShowreelBounds() {
  const ratio = heroVideo.videoWidth && heroVideo.videoHeight
    ? heroVideo.videoWidth / heroVideo.videoHeight
    : 16 / 9;
  const maxWidth = Math.min(window.innerWidth * 0.86, 1280);
  const maxHeight = Math.min(window.innerHeight * 0.74, 760);
  let width = maxWidth;
  let height = width / ratio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }

  return {
    top: (window.innerHeight - height) / 2,
    left: (window.innerWidth - width) / 2,
    width,
    height,
  };
}

function setShowreelBounds(bounds) {
  heroReelWrap.style.top = `${bounds.top}px`;
  heroReelWrap.style.left = `${bounds.left}px`;
  heroReelWrap.style.width = `${bounds.width}px`;
  heroReelWrap.style.height = `${bounds.height}px`;
}

heroReelFrame.addEventListener("click", (event) => {
  if (event.target.closest(".showreel-close")) return;
  if (showreelClosing) return;
  if (!showreelExpanded) {
    openShowreel();
    return;
  }
  toggleVideoSound(heroVideo);
});

heroReelFrame.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  if (event.target.closest(".showreel-close")) return;
  if (showreelClosing) return;
  event.preventDefault();
  if (!showreelExpanded) openShowreel();
  else toggleVideoSound(heroVideo);
});

document.querySelector(".showreel-close")?.addEventListener("click", (event) => {
  event.stopPropagation();
  closeShowreel();
});

window.addEventListener("resize", () => {
  if (showreelExpanded && !showreelClosing) {
    setShowreelBounds(getExpandedShowreelBounds());
  }
  updateMarqueeDistances();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeShowreel();
    closeMenu();
  }
});

function revealElement(element) {
  element.classList.add("is-visible");
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      revealElement(entry.target);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((element, index) => {
  if (prefersReducedMotion) {
    revealElement(element);
  } else {
    element.style.animationDelay = `${Math.min(index * 45, 260)}ms`;
    revealObserver.observe(element);
  }
});

function updateMarqueeDistances() {
  document.querySelectorAll(".tool-track").forEach((track) => {
    const firstGroup = track.querySelector(".tool-group");
    if (!firstGroup) return;

    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    const distance = firstGroup.getBoundingClientRect().width + gap;
    track.style.setProperty("--marquee-shift", `-${distance}px`);
  });
}

updateMarqueeDistances();

let scrollTarget = window.scrollY;
let scrollCurrent = window.scrollY;

function updateScrollMotion() {
  scrollCurrent += (scrollTarget - scrollCurrent) * 0.1;
  const ghostName = document.querySelector(".ghost-name");
  const hero = document.querySelector(".hero");

  if (ghostName && hero) {
    const heroProgress = Math.min(Math.max(scrollCurrent / hero.offsetHeight, 0), 1);
    ghostName.style.setProperty("--ghost-shift", `${heroProgress * -110}px`);
  }

  document.querySelectorAll(".project-video").forEach((videoFrame) => {
    const bounds = videoFrame.getBoundingClientRect();
    const distanceFromCenter = (bounds.top + bounds.height / 2 - window.innerHeight / 2) / window.innerHeight;
    const scale = Math.max(0.965, Math.min(1.025, 1.015 - Math.abs(distanceFromCenter) * 0.035));
    const shift = Math.max(-12, Math.min(12, distanceFromCenter * -14));
    videoFrame.style.setProperty("--project-scale", scale.toFixed(3));
    videoFrame.style.setProperty("--project-shift", `${shift.toFixed(1)}px`);
  });

  document.querySelectorAll(".project-pair").forEach((pair, index) => {
    const bounds = pair.getBoundingClientRect();
    const distanceFromCenter = (bounds.top + bounds.height / 2 - window.innerHeight / 2) / window.innerHeight;
    const direction = index % 2 === 0 ? 1 : -1;
    const pairShift = Math.max(-22, Math.min(22, distanceFromCenter * direction * 12));
    pair.style.setProperty("--pair-shift", `${pairShift.toFixed(1)}px`);
  });

  requestAnimationFrame(updateScrollMotion);
}

if (!prefersReducedMotion) {
  window.addEventListener("scroll", () => {
    scrollTarget = window.scrollY;
  }, { passive: true });
  updateScrollMotion();
}
