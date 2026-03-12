function cardTemplate(card) {
  const badgeMarkup = card.guestFavourite
    ? '<span class="stay-card__badge">Guest favourite</span>'
    : "";

  return `
    <article class="stay-card">
      <div class="stay-card__media">
        ${badgeMarkup}
        <button class="stay-card__fav" type="button" aria-label="Save listing">&#9825;</button>
        <img src="${card.image}" alt="${card.title}" loading="lazy" decoding="async">
      </div>
      <h3 class="stay-card__title">${card.title}</h3>
      <p class="stay-card__meta">${card.meta}</p>
    </article>
  `;
}

function updateButtons(track, controls) {
  const maxScroll = track.scrollWidth - track.clientWidth;
  controls.left.disabled = track.scrollLeft <= 2;
  controls.right.disabled = track.scrollLeft >= maxScroll - 2;
}

function bindTrackInteractions(trackId, track) {
  if (track.dataset.trackBound === "true") return;

  const controls = {
    left: document.querySelector(`.rail__ctrl[data-target="${trackId}"][data-dir="left"]`),
    right: document.querySelector(`.rail__ctrl[data-target="${trackId}"][data-dir="right"]`)
  };

  const step = () => Math.max(280, Math.round(track.clientWidth * 0.75));

  controls.left?.addEventListener("click", () => {
    track.scrollBy({ left: -step(), behavior: "smooth" });
  });

  controls.right?.addEventListener("click", () => {
    track.scrollBy({ left: step(), behavior: "smooth" });
  });

  track.addEventListener(
    "scroll",
    () => {
      updateButtons(track, controls);
    },
    { passive: true }
  );

  track.addEventListener("click", (event) => {
    const favButton = event.target.closest(".stay-card__fav");
    if (!favButton) return;
    event.stopPropagation();

    favButton.classList.toggle("active");
    favButton.innerHTML = favButton.classList.contains("active") ? "&#9829;" : "&#9825;";
  });

  window.addEventListener("resize", () => updateButtons(track, controls));
  requestAnimationFrame(() => updateButtons(track, controls));

  track.dataset.trackBound = "true";
}

window.initRails = function initRails(dataMap) {
  Object.entries(dataMap).forEach(([trackId, cards]) => {
    const track = document.getElementById(trackId);
    if (!track) return;

    track.innerHTML = cards.map(cardTemplate).join("");
    bindTrackInteractions(trackId, track);
  });
};
