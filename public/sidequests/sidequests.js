const iosLink = document.querySelector("[data-ios-link]");
const iosStatus = document.querySelector("[data-ios-status]");
const iosMessage = document.querySelector("[data-ios-message]");
const androidGroupLink = document.querySelector("[data-android-group-link]");
const androidPlayLink = document.querySelector("[data-android-play-link]");
const androidStatus = document.querySelector("[data-android-status]");
const androidMessage = document.querySelector("[data-android-message]");
const smartCta = document.querySelector("[data-smart-cta]");
const productShowcase = document.querySelector("[data-product-showcase]");
const productStepper = document.querySelector("[data-product-stepper]");
const previousProductStep = document.querySelector("[data-product-step-previous]");
const nextProductStep = document.querySelector("[data-product-step-next]");
const currentProductStep = document.querySelector("[data-product-step-current]");
const totalProductSteps = document.querySelector("[data-product-step-total]");
const interestForm = document.querySelector("[data-interest-form]");
const interestSubmit = document.querySelector("[data-interest-submit]");
const interestStatus = document.querySelector("[data-interest-status]");
let interestEndpoint = interestForm instanceof HTMLFormElement ? interestForm.dataset.interestEndpoint ?? "" : "";

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

    if (config?.interest?.status === "open" && config?.interest?.endpoint) {
      interestEndpoint = config.interest.endpoint;
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

if (
  interestForm instanceof HTMLFormElement &&
  interestSubmit instanceof HTMLButtonElement &&
  interestStatus instanceof HTMLElement
) {
  interestForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!interestForm.reportValidity()) return;

    const formData = new FormData(interestForm);
    const email = String(formData.get("email") ?? "").trim();
    const companyWebsite = String(formData.get("company_website") ?? "");
    const originalButtonText = interestSubmit.textContent;

    interestSubmit.disabled = true;
    interestSubmit.textContent = "Joining…";
    interestStatus.textContent = "";
    interestStatus.classList.remove("is-success", "is-error");

    try {
      if (!interestEndpoint) throw new Error("endpoint_unavailable");
      const response = await fetch(interestEndpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({ email, companyWebsite }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.code ?? "signup_failed");
      }

      interestForm.reset();
      interestStatus.textContent = "You’re on the list. We’ll keep you posted.";
      interestStatus.classList.add("is-success");
    } catch (error) {
      interestStatus.textContent = error instanceof Error && error.message === "invalid_email"
        ? "Enter a valid email address and try again."
        : "We couldn’t add you right now. Please try again.";
      interestStatus.classList.add("is-error");
    } finally {
      interestSubmit.disabled = false;
      interestSubmit.textContent = originalButtonText;
    }
  });
}

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

if (
  productShowcase instanceof HTMLElement &&
  productStepper instanceof HTMLElement &&
  previousProductStep instanceof HTMLButtonElement &&
  nextProductStep instanceof HTMLButtonElement &&
  currentProductStep instanceof HTMLElement &&
  totalProductSteps instanceof HTMLElement
) {
  const productSteps = Array.from(productShowcase.querySelectorAll(".product-showcase__step"));
  let activeProductStep = 0;
  let productScrollFrame = 0;

  function formatProductStep(value) {
    return String(value).padStart(2, "0");
  }

  function updateProductStepper(index) {
    activeProductStep = Math.max(0, Math.min(index, productSteps.length - 1));
    currentProductStep.textContent = formatProductStep(activeProductStep + 1);
    totalProductSteps.textContent = formatProductStep(productSteps.length);
    previousProductStep.disabled = activeProductStep === 0;
    nextProductStep.disabled = activeProductStep === productSteps.length - 1;
  }

  function productStepFromScroll() {
    const maximumScroll = productShowcase.scrollWidth - productShowcase.clientWidth;
    if (maximumScroll <= 0 || productSteps.length <= 1) return 0;
    return Math.round((productShowcase.scrollLeft / maximumScroll) * (productSteps.length - 1));
  }

  function goToProductStep(index) {
    const nextIndex = Math.max(0, Math.min(index, productSteps.length - 1));
    const maximumScroll = productShowcase.scrollWidth - productShowcase.clientWidth;
    const nextScroll = productSteps.length <= 1 ? 0 : maximumScroll * (nextIndex / (productSteps.length - 1));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    updateProductStepper(nextIndex);
    productShowcase.scrollTo({ left: nextScroll, behavior: reduceMotion ? "auto" : "smooth" });
  }

  previousProductStep.addEventListener("click", () => goToProductStep(activeProductStep - 1));
  nextProductStep.addEventListener("click", () => goToProductStep(activeProductStep + 1));

  productShowcase.addEventListener(
    "scroll",
    () => {
      window.cancelAnimationFrame(productScrollFrame);
      productScrollFrame = window.requestAnimationFrame(() => updateProductStepper(productStepFromScroll()));
    },
    { passive: true }
  );

  window.addEventListener("resize", () => updateProductStepper(productStepFromScroll()));
  updateProductStepper(0);
}
