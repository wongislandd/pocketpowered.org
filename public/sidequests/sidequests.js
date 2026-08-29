const iosLink = document.querySelector("[data-ios-link]");
const iosStatus = document.querySelector("[data-ios-status]");
const iosMessage = document.querySelector("[data-ios-message]");
const androidGroupLink = document.querySelector("[data-android-group-link]");
const androidPlayLink = document.querySelector("[data-android-play-link]");
const androidStatus = document.querySelector("[data-android-status]");
const androidMessage = document.querySelector("[data-android-message]");
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
