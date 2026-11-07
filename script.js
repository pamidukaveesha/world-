// Photo filenames in the exact order used by the gallery.
// The supplied folder contains 1.jpeg through 69.jpeg plus 8.5.jpeg (70 photos total).
const photoFiles = [
  '1.jpeg',
  '2.jpeg',
  '3.jpeg',
  '4.jpeg',
  '5.jpeg',
  '6.jpeg',
  '7.jpeg',
  '8.jpeg',
  '8.5.jpeg',
  '9.jpeg',
  '10.jpeg',
  '11.jpeg',
  '12.jpeg',
  '13.jpeg',
  '14.jpeg',
  '15.jpeg',
  '16.jpeg',
  '17.jpeg',
  '18.jpeg',
  '19.jpeg',
  '20.jpeg',
  '21.jpeg',
  '22.jpeg',
  '23.jpeg',
  '24.jpeg',
  '25.jpeg',
  '26.jpeg',
  '27.jpeg',
  '28.jpeg',
  '29.jpeg',
  '30.jpeg',
  '31.jpeg',
  '32.jpeg',
  '33.jpeg',
  '34.jpeg',
  '35.jpeg',
  '36.jpeg',
  '37.jpeg',
  '38.jpeg',
  '39.jpeg',
  '40.jpeg',
  '41.jpeg',
  '42.jpeg',
  '43.jpeg',
  '44.jpeg',
  '45.jpeg',
  '46.jpeg',
  '47.jpeg',
  '48.jpeg',
  '49.jpeg',
  '50.jpeg',
  '51.jpeg',
  '52.jpeg',
  '53.jpeg',
  '54.jpeg',
  '55.jpeg',
  '56.jpeg',
  '57.jpeg',
  '58.jpeg',
  '59.jpeg',
  '60.jpeg',
  '61.jpeg',
  '62.jpeg',
  '63.jpeg',
  '64.jpeg',
  '65.jpeg',
  '66.jpeg',
  '67.jpeg',
  '68.jpeg',
  '69.jpeg'
];

const gallery = document.getElementById("memory-grid");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxCaption = document.getElementById("lightbox-caption");
const lightboxCount = document.getElementById("lightbox-count");
const closeButton = document.querySelector(".lightbox-close");
const previousButton = document.querySelector(".lightbox-prev");
const nextButton = document.querySelector(".lightbox-next");

let currentPhotoIndex = 0;
let lastFocusedElement = null;
let touchStartX = 0;

// Create cards from the real filenames, so every image path matches the folder.
photoFiles.forEach((filename, index) => {
  const number = index + 1;
  const card = document.createElement("figure");
  card.className = "memory-card";

  const button = document.createElement("button");
  button.className = "photo-button";
  button.type = "button";
  button.setAttribute("aria-label", `Open memory ${number}`);
  button.dataset.index = String(index);

  const image = document.createElement("img");
  image.src = `images/${encodeURIComponent(filename)}`;
  image.alt = `Memory ${number}`;
  image.loading = index < 6 ? "eager" : "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    button.classList.add("image-unavailable");
    button.setAttribute("aria-label", `Memory ${number} could not be loaded`);
    image.alt = `Memory ${number} could not be loaded`;
  }, { once: true });

  button.append(image);
  const caption = document.createElement("figcaption");
  const date = document.createElement("span");
  date.className = "memory-date";
  date.textContent = `MEMORY ${String(number).padStart(2, "0")}`;
  const text = document.createElement("span");
  text.className = "memory-caption";
  const captionText = (window.memoryCaptions || [])[index] || "";
  text.textContent = captionText;
  if (captionText.length > 27) text.classList.add("long-caption");
  caption.append(date, text);
  card.append(button, caption);
  gallery.append(card);
});

function showPhoto(index) {
  if (!photoFiles.length) return;
  currentPhotoIndex = (index + photoFiles.length) % photoFiles.length;
  const filename = photoFiles[currentPhotoIndex];
  lightboxImage.src = `images/${encodeURIComponent(filename)}`;
  lightboxImage.alt = `Memory ${currentPhotoIndex + 1}`;
  lightboxCaption.textContent = (window.memoryCaptions || [])[currentPhotoIndex] || "";
  lightboxCount.textContent = `${currentPhotoIndex + 1} of ${photoFiles.length}`;
  previousButton.disabled = photoFiles.length < 2;
  nextButton.disabled = photoFiles.length < 2;
}

function openPhoto(index, trigger) {
  lastFocusedElement = trigger;
  showPhoto(index);
  if (!lightbox.open) lightbox.showModal();
  closeButton.focus();
}

gallery.addEventListener("click", (event) => {
  const button = event.target.closest(".photo-button");
  if (!button || button.classList.contains("image-unavailable")) return;
  openPhoto(Number(button.dataset.index), button);
});

previousButton.addEventListener("click", () => showPhoto(currentPhotoIndex - 1));
nextButton.addEventListener("click", () => showPhoto(currentPhotoIndex + 1));
closeButton.addEventListener("click", () => lightbox.close());

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) lightbox.close();
});

lightbox.addEventListener("close", () => {
  lightboxImage.removeAttribute("src");
  if (lastFocusedElement?.isConnected) lastFocusedElement.focus();
});

// Escape closes the native dialog. Arrow keys move between photos.
lightbox.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    showPhoto(currentPhotoIndex - 1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    showPhoto(currentPhotoIndex + 1);
  }
});

// Touch swipe support for iPhone and other touchscreens.
lightbox.addEventListener("touchstart", (event) => {
  touchStartX = event.changedTouches[0].clientX;
}, { passive: true });

lightbox.addEventListener("touchend", (event) => {
  const deltaX = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(deltaX) < 45) return;
  if (deltaX < 0) showPhoto(currentPhotoIndex + 1);
  else showPhoto(currentPhotoIndex - 1);
}, { passive: true });

// Anniversary counter: fixed Sri Lanka time (UTC+05:30), even for visitors abroad.
const anniversary = new Date("2023-05-11T19:30:00+05:30");
const counterToggle = document.getElementById("counter-toggle");
const counterNote = document.getElementById("counter-note");
let counterMode = 0; // 0 = calendar duration, 1 = total elapsed time
const counterUnits = Array.from({ length: 7 }, (_, i) => ({
  value: document.getElementById(`unit-${["one","two","three","four","five","six","seven"][i]}`),
  label: document.getElementById(`label-${["one","two","three","four","five","six","seven"][i]}`)
}));
const sriLankaOffset = 330 * 60 * 1000;

function getCalendarDuration(nowMs) {
  // Shift both instants to Sri Lankan wall-clock time, then use UTC calendar arithmetic.
  const start = new Date(anniversary.getTime() + sriLankaOffset);
  const now = new Date(nowMs + sriLankaOffset);
  let months = (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + (now.getUTCMonth() - start.getUTCMonth());
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, start.getUTCDate(), start.getUTCHours(), start.getUTCMinutes(), start.getUTCSeconds()));
  if (cursor.getTime() > now.getTime()) {
    months--;
    cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, start.getUTCDate(), start.getUTCHours(), start.getUTCMinutes(), start.getUTCSeconds()));
  }
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  let remainder = Math.max(0, now.getTime() - cursor.getTime());
  const totalSeconds = Math.floor(remainder / 1000);
  const weeks = Math.floor(totalSeconds / 604800);
  remainder -= weeks * 604800000;
  const days = Math.floor(remainder / 86400000); remainder -= days * 86400000;
  const hours = Math.floor(remainder / 3600000); remainder -= hours * 3600000;
  const minutes = Math.floor(remainder / 60000); remainder -= minutes * 60000;
  const seconds = Math.floor(remainder / 1000);
  return [years, remainingMonths, weeks, days, hours, minutes, seconds];
}

function updateCounter() {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - anniversary.getTime()) / 1000));
  let values, labels;
  if (counterMode === 0) {
    values = getCalendarDuration(Date.now());
    labels = ["Years", "Months", "Weeks", "Days", "Hours", "Minutes", "Seconds"];
    counterNote.textContent = "Counting from 11 May 2023 at 7:30 PM (Sri Lanka time).";
  } else {
    const days = Math.floor(elapsedSeconds / 86400);
    const hours = Math.floor((elapsedSeconds % 86400) / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    values = [days, hours, minutes, seconds];
    labels = ["Total Days", "Hours", "Minutes", "Seconds"];
    counterNote.textContent = "Total elapsed time since 11 May 2023 at 7:30 PM (Sri Lanka time).";
  }
  counterUnits.forEach((unit, index) => {
    const visible = index < values.length;
    unit.value.parentElement.hidden = !visible;
    if (visible) {
      unit.value.textContent = values[index].toLocaleString();
      unit.label.textContent = labels[index];
    }
  });
}

counterToggle.addEventListener("click", () => {
  counterMode = counterMode === 0 ? 1 : 0;
  counterToggle.textContent = counterMode === 0 ? "♡ Show Total Time" : "♡ Show Years & Months";
  updateCounter();
});
updateCounter();
window.setInterval(updateCounter, 1000);
