const iosLink = document.querySelector("[data-ios-link]");
const iosStatus = document.querySelector("[data-ios-status]");
const iosMessage = document.querySelector("[data-ios-message]");
const androidGroupLink = document.querySelector("[data-android-group-link]");
const androidPlayLink = document.querySelector("[data-android-play-link]");
const androidStatus = document.querySelector("[data-android-status]");
const androidMessage = document.querySelector("[data-android-message]");
const smartCta = document.querySelector("[data-smart-cta]");
const walkthrough = document.querySelector("[data-walkthrough]");

function initializeWalkthrough(root) {
  if (!(root instanceof HTMLElement)) return;

  const images = [...root.querySelectorAll("[data-walkthrough-image]")];
  const steps = [...root.querySelectorAll("[data-walkthrough-step]")];
  const title = root.querySelector("[data-walkthrough-title]");
  const description = root.querySelector("[data-walkthrough-description]");
  const number = root.querySelector("[data-walkthrough-number]");
  const previous = root.querySelector("[data-walkthrough-previous]");
  const next = root.querySelector("[data-walkthrough-next]");
  const toggle = root.querySelector("[data-walkthrough-toggle]");
  const phone = root.querySelector(".walkthrough-phone");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!images.length || images.length !== steps.length) return;

  let activeIndex = 0;
  let timerId;
  let inView = false;
  let paused = reducedMotion.matches;
  let pointerStartX = null;
  let pointerStartY = null;

  function updateToggle() {
    if (!(toggle instanceof HTMLButtonElement)) return;
    toggle.textContent = paused ? "Play" : "Pause";
    toggle.setAttribute("aria-label", paused ? "Play walkthrough" : "Pause walkthrough");
    toggle.setAttribute("aria-pressed", String(paused));
  }

  function scheduleAdvance() {
    window.clearTimeout(timerId);
    if (paused || !inView || document.hidden) return;
    timerId = window.setTimeout(() => showStep(activeIndex + 1), 4400);
  }

  function showStep(requestedIndex) {
    activeIndex = (requestedIndex + steps.length) % steps.length;

    images.forEach((image, index) => {
      const isActive = index === activeIndex;
      image.classList.toggle("is-active", isActive);
      image.setAttribute("aria-hidden", String(!isActive));
    });

    steps.forEach((step, index) => {
      const isActive = index === activeIndex;
      step.classList.toggle("is-active", isActive);
      step.setAttribute("aria-pressed", String(isActive));
    });

    const activeStep = steps[activeIndex];
    if (title) title.textContent = activeStep.dataset.title || "";
    if (description) description.textContent = activeStep.dataset.description || "";
    if (number) number.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")}`;
    scheduleAdvance();
  }

  function showPrevious() {
    showStep(activeIndex - 1);
  }

  function showNext() {
    showStep(activeIndex + 1);
  }

  steps.forEach((step, index) => step.addEventListener("click", () => showStep(index)));
  previous?.addEventListener("click", showPrevious);
  next?.addEventListener("click", showNext);
  toggle?.addEventListener("click", () => {
    paused = !paused;
    updateToggle();
    scheduleAdvance();
  });

  if (phone instanceof HTMLElement) {
    phone.tabIndex = 0;
    phone.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        showNext();
      }
    });
    phone.addEventListener("pointerdown", (event) => {
      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      phone.setPointerCapture?.(event.pointerId);
    });
    phone.addEventListener("pointerup", (event) => {
      if (pointerStartX === null || pointerStartY === null) return;
      const distanceX = event.clientX - pointerStartX;
      const distanceY = event.clientY - pointerStartY;
      pointerStartX = null;
      pointerStartY = null;
      if (Math.abs(distanceX) < 42 || Math.abs(distanceX) <= Math.abs(distanceY)) return;
      if (distanceX < 0) showNext();
      else showPrevious();
    });
    phone.addEventListener("pointercancel", () => {
      pointerStartX = null;
      pointerStartY = null;
    });
  }

  document.addEventListener("visibilitychange", scheduleAdvance);
  reducedMotion.addEventListener?.("change", (event) => {
    if (event.matches) paused = true;
    updateToggle();
    scheduleAdvance();
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.35);
        scheduleAdvance();
      },
      { threshold: [0, 0.35, 0.7] }
    );
    observer.observe(root);
  } else {
    inView = true;
  }

  updateToggle();
  showStep(0);
}

initializeWalkthrough(walkthrough);

function isIPhone() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function enableIosAccess(url) {
  if (!(iosLink instanceof HTMLAnchorElement) || !url) return;
  iosLink.href = url;
  iosLink.textContent = "Open in TestFlight";
  iosLink.classList.remove("is-disabled");
  iosLink.classList.add("button--purple");
  iosLink.removeAttribute("aria-disabled");

  if (iosStatus) {
    iosStatus.textContent = "OPEN NOW";
    iosStatus.classList.add("status-badge--live");
  }

  if (iosMessage) {
    iosMessage.textContent = "No email invitation is needed. Install TestFlight, open the public link, and accept the beta.";
  }
}

function enableAndroidAccess(groupUrl, playUrl) {
  if (!(androidGroupLink instanceof HTMLAnchorElement) || !(androidPlayLink instanceof HTMLAnchorElement)) return;

  androidGroupLink.href = groupUrl;
  androidGroupLink.target = "_blank";
  androidGroupLink.rel = "noopener";
  androidGroupLink.textContent = "Join Google Group";
  androidGroupLink.classList.remove("is-disabled");
  androidGroupLink.removeAttribute("aria-disabled");

  androidPlayLink.href = playUrl;
  androidPlayLink.target = "_blank";
  androidPlayLink.rel = "noopener";
  androidPlayLink.textContent = "Open Google Play";
  androidPlayLink.classList.remove("is-disabled");
  androidPlayLink.removeAttribute("aria-disabled");

  if (androidStatus) {
    androidStatus.textContent = "OPEN NOW";
    androidStatus.classList.add("status-badge--live");
  }

  if (androidMessage) {
    androidMessage.textContent = "Use the same Google account for both steps. The group is self-join; no manual invitation is needed.";
  }
}

fetch("/sidequests/config.json", { headers: { accept: "application/json" } })
  .then((response) => {
    if (!response.ok) throw new Error(`Config request failed: ${response.status}`);
    return response.json();
  })
  .then((config) => {
    if (config?.android?.status === "open" && config?.android?.groupUrl && config?.android?.playUrl) {
      enableAndroidAccess(config.android.groupUrl, config.android.playUrl);
    }

    if (config?.ios?.status === "open" && config?.ios?.testFlightUrl) {
      enableIosAccess(config.ios.testFlightUrl);
    }

    if (smartCta instanceof HTMLAnchorElement) {
      if (isAndroid() && config?.android?.status === "open" && config?.android?.groupUrl) {
        smartCta.href = config.android.groupUrl;
        smartCta.textContent = "Join on Android";
      } else if (isIPhone() && config?.ios?.status === "open" && config?.ios?.testFlightUrl) {
        smartCta.href = config.ios.testFlightUrl;
        smartCta.textContent = "Join on iPhone";
      }
    }
  })
  .catch(() => {
    // The page remains fully usable with its server-rendered fallback state.
  });

if (iosLink instanceof HTMLAnchorElement) {
  iosLink.addEventListener("click", (event) => {
    if (iosLink.getAttribute("aria-disabled") === "true") {
      event.preventDefault();
    }
  });
}

for (const link of [androidGroupLink, androidPlayLink]) {
  if (link instanceof HTMLAnchorElement) {
    link.addEventListener("click", (event) => {
      if (link.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
      }
    });
  }
}
