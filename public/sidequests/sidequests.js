const iosLink = document.querySelector("[data-ios-link]");
const iosStatus = document.querySelector("[data-ios-status]");
const iosMessage = document.querySelector("[data-ios-message]");
const smartCta = document.querySelector("[data-smart-cta]");

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

fetch("/sidequests/config.json", { headers: { accept: "application/json" } })
  .then((response) => {
    if (!response.ok) throw new Error(`Config request failed: ${response.status}`);
    return response.json();
  })
  .then((config) => {
    if (config?.ios?.status === "open" && config?.ios?.testFlightUrl) {
      enableIosAccess(config.ios.testFlightUrl);
    }

    if (smartCta instanceof HTMLAnchorElement) {
      if (isAndroid()) {
        smartCta.href = "/sidequests/go/android-group";
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
