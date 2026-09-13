"use strict";

// Add each new release here. Set photo to the supplied cat portrait URL; the
// circular center label crops it automatically. Never invent unreleased tracks.
const tracks = [
  {
    id: "chmunk-biscuit-business",
    title: "Biscuit Business",
    practice: "practice.html?song=chmunk",
    artist: "Chmunk",
    duration: "2:00",
    audio: "original.mp3",
    vinyl: "vinyl.png",
    photo: "chmunk-vintage-label.png",
    monogram: "C",
    analysis: "analysis.html",
    lyrics: "lyrics.txt"
  },
  {
    id: "chmeezus-sacred-spoon",
    title: "Sacred Spoon",
    practice: "practice.html?song=chmeeze",
    artist: "Chmeeze",
    duration: "2:00",
    audio: "sacred-spoon-first-person.mp3",
    vinyl: "vinyl.png",
    photo: "chmeeze-vintage-label.png",
    monogram: "C",
    lyrics: "chmeezus-lyrics.txt"
  },
  {
    id: "chmit-mr-inconvenient",
    title: "Mr. Inconvenient",
    practice: "practice.html?song=chmit",
    artist: "Chmit",
    duration: "2:00",
    audio: "mr-inconvenient-first-person.mp3",
    vinyl: "vinyl.png",
    photo: "chmit-vintage-label.png",
    monogram: "C",
    lyrics: "chmit-lyrics.txt"
  },
  {
    id: "bean-breakfast-was-due",
    title: "Breakfast Was Due",
    practice: "practice.html?song=bean",
    artist: "Bean",
    duration: "2:30",
    audio: "breakfast-was-due-sunlit-pop.mp3",
    vinyl: "vinyl.png",
    photo: "bean-vintage-label.png",
    monogram: "B",
    lyrics: "bean-lyrics.txt"
  }
];

// BEGIN CLASSICS
tracks.push(...[
  {
    "id": "dream-a-little-dream-of-me",
    "title": "Dream a Little Dream of Me",
    "practice": "practice.html?song=dream-a-little-dream-of-me",
    "artist": "Resonance Sessions",
    "duration": "2:00",
    "audio": "classics/dream-a-little-dream-of-me/source.mp3",
    "vinyl": "vinyl.png",
    "photo": "classic-labels/dream-a-little-dream-of-me.svg",
    "monogram": "DD",
    "lyrics": "classics/dream-a-little-dream-of-me/lyrics.txt",
    "territory": "US",
    "edition": "New rendition \u00b7 U.S. listening"
  },
  {
    "id": "georgia-on-my-mind",
    "title": "Georgia on My Mind",
    "practice": "practice.html?song=georgia-on-my-mind",
    "artist": "Resonance Sessions",
    "duration": "2:00",
    "audio": "classics/georgia-on-my-mind/source.mp3",
    "vinyl": "vinyl.png",
    "photo": "classic-labels/georgia-on-my-mind.svg",
    "monogram": "GM",
    "lyrics": "classics/georgia-on-my-mind/lyrics.txt",
    "territory": "US",
    "edition": "New rendition \u00b7 U.S. listening"
  },
  {
    "id": "on-the-sunny-side-of-the-street",
    "title": "On the Sunny Side of the Street",
    "practice": "practice.html?song=on-the-sunny-side-of-the-street",
    "artist": "Resonance Sessions",
    "duration": "2:00",
    "audio": "classics/on-the-sunny-side-of-the-street/source.mp3",
    "vinyl": "vinyl.png",
    "photo": "classic-labels/on-the-sunny-side-of-the-street.svg",
    "monogram": "SS",
    "lyrics": "classics/on-the-sunny-side-of-the-street/lyrics.txt",
    "territory": "US",
    "edition": "New rendition \u00b7 U.S. listening"
  },
  {
    "id": "i-got-rhythm",
    "title": "I Got Rhythm",
    "practice": "practice.html?song=i-got-rhythm",
    "artist": "Resonance Sessions",
    "duration": "2:00",
    "audio": "classics/i-got-rhythm/source.mp3",
    "vinyl": "vinyl.png",
    "photo": "classic-labels/i-got-rhythm.svg",
    "monogram": "IR",
    "lyrics": "classics/i-got-rhythm/lyrics.txt",
    "territory": "US",
    "edition": "New rendition \u00b7 U.S. listening"
  },
  {
    "id": "singin-in-the-rain",
    "title": "Singin' in the Rain",
    "practice": "practice.html?song=singin-in-the-rain",
    "artist": "Resonance Sessions",
    "duration": "2:00",
    "audio": "classics/singin-in-the-rain/source.mp3",
    "vinyl": "vinyl.png",
    "photo": "classic-labels/singin-in-the-rain.svg",
    "monogram": "SR",
    "lyrics": "classics/singin-in-the-rain/lyrics.txt",
    "territory": "US",
    "edition": "New rendition \u00b7 U.S. listening"
  },
  {
    "id": "aint-misbehavin",
    "title": "Ain't Misbehavin'",
    "practice": "practice.html?song=aint-misbehavin",
    "artist": "Resonance Sessions",
    "duration": "2:00",
    "audio": "classics/aint-misbehavin/source.mp3",
    "vinyl": "vinyl.png",
    "photo": "classic-labels/aint-misbehavin.svg",
    "monogram": "AM",
    "lyrics": "classics/aint-misbehavin/lyrics.txt",
    "territory": "US",
    "edition": "New rendition \u00b7 U.S. listening"
  }
]);
// END CLASSICS

const player = document.querySelector("#preview-player");
const collection = document.querySelector("#records");
const status = document.querySelector("#player-status");
const cards = new Map();
let activeTrack = null;
let requestNumber = 0;

const playIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5a.7.7 0 0 1 1.05-.6l8 5.5a.7.7 0 0 1 0 1.2l-8 5.5A.7.7 0 0 1 4 13.5Z"/></svg>';
const pauseIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" rx=".7"/><rect x="9.5" y="2" width="3.5" height="12" rx=".7"/></svg>';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

for (const [index, track] of tracks.entries()) {
  const card = element("article", "record");
  card.setAttribute("aria-labelledby", `${track.id}-title`);
  const artButton = element("button", "record-art");
  artButton.type = "button";
  artButton.setAttribute("aria-label", `Play ${track.title}`);
  artButton.setAttribute("aria-pressed", "false");
  const disc = element("span", "record-disc");
  disc.setAttribute("aria-hidden", "true");
  const vinyl = element("img", "vinyl");
  vinyl.src = track.vinyl;
  vinyl.alt = "";
  vinyl.width = 600;
  vinyl.height = 600;
  vinyl.draggable = false;
  const label = element("span", "center-label");
  if (track.photo) {
    const photo = element("img");
    photo.src = track.photo;
    photo.alt = "";
    photo.draggable = false;
    label.append(photo);
  } else {
    label.append(element("span", "label-monogram", track.monogram));
  }
  disc.append(vinyl, label);
  artButton.append(disc);
  const title = element(index === 0 ? "h1" : "h2", "", track.title);
  title.id = `${track.id}-title`;
  const row = element("div", "preview-row");
  const toggle = element("button", "preview-button");
  toggle.type = "button";
  const time = element("span", "duration", track.duration);
  row.append(toggle, time);
  const singLink = element("a", "sing-link", "Sing along");
  singLink.href = track.practice;
  singLink.setAttribute("aria-label", `Sing along — ${track.title}`);
  const error = element("p", "record-error");
  error.setAttribute("role", "alert");
  card.append(artButton, title, element("p", "artist", track.artist), row, singLink, error);
  if (track.edition) card.insertBefore(element("p", "edition", track.edition), row);
  collection.append(card);
  cards.set(track.id, { card, toggle, artButton, time, error });
  toggle.addEventListener("click", () => toggleTrack(track));
  artButton.addEventListener("click", () => toggleTrack(track));
}

document.querySelector("#record-count").textContent = `${String(tracks.length).padStart(2, "0")} ${tracks.length === 1 ? "record" : "records"}`;

function updateControls() {
  for (const track of tracks) {
    const { card, toggle, artButton } = cards.get(track.id);
    const playing = activeTrack?.id === track.id && !player.paused && !player.ended;
    card.classList.toggle("is-playing", playing);
    toggle.innerHTML = `${playing ? pauseIcon : playIcon}<span>${playing ? "Pause" : "Preview"}</span>`;
    for (const button of [toggle, artButton]) {
      button.setAttribute("aria-label", `${playing ? "Pause" : "Play"} ${track.title}`);
      button.setAttribute("aria-pressed", String(playing));
    }
  }
}

async function toggleTrack(track) {
  const request = ++requestNumber;
  const view = cards.get(track.id);
  view.error.textContent = "";
  if (activeTrack?.id === track.id && !player.paused) {
    player.pause();
    return;
  }
  if (activeTrack?.id !== track.id) {
    player.pause();
    activeTrack = track;
    player.src = track.audio;
  }
  if (player.ended) player.currentTime = 0;
  try {
    await player.play();
    if (request !== requestNumber) return;
    status.textContent = `Playing ${track.title} by ${track.artist}.`;
  } catch (error) {
    if (request !== requestNumber || error.name === "AbortError") return;
    view.error.textContent = track.territory === "US" ? "This rendition is available in the United States. If you’re in the U.S., try again." : "Couldn’t play this record. Please try again.";
    updateControls();
  }
}

player.addEventListener("play", updateControls);
player.addEventListener("pause", () => {
  updateControls();
  if (activeTrack) status.textContent = `Paused ${activeTrack.title}.`;
});
player.addEventListener("ended", () => {
  updateControls();
  if (activeTrack) {
    cards.get(activeTrack.id).time.textContent = activeTrack.duration;
    status.textContent = `${activeTrack.title} finished.`;
  }
});
player.addEventListener("error", () => {
  player.pause();
  if (!activeTrack) return;
  cards.get(activeTrack.id).error.textContent = activeTrack.territory === "US" ? "This rendition is available in the United States. If you’re in the U.S., try again." : "Couldn’t load this record. Please try again.";
  updateControls();
});
player.addEventListener("timeupdate", () => {
  if (!activeTrack || player.ended) return;
  const seconds = Math.floor(player.currentTime);
  cards.get(activeTrack.id).time.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} / ${activeTrack.duration}`;
});
updateControls();
