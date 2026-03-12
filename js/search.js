window.initSearch = function initSearch() {
  const header = document.querySelector(".hero-header");
  const form = document.getElementById("searchForm");
  const tabs = document.querySelectorAll(".hero-tab");

  if (!header || !form) return;

  const fields = Object.fromEntries(
    Array.from(form.querySelectorAll(".hero-search__field")).map((field) => [
      field.dataset.field,
      field
    ])
  );

  const panels = {
    where: document.getElementById("wherePanel"),
    when: document.getElementById("whenPanel"),
    who: document.getElementById("whoPanel")
  };

  const locationInput = document.getElementById("location");
  const whenInput = document.getElementById("when");
  const guestsInput = document.getElementById("guests");
  const clearWhenBtn = document.getElementById("clearWhen");
  const calendarRoot = document.getElementById("calendarMonths");
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const inputByField = {
    where: locationInput,
    when: whenInput,
    who: guestsInput
  };

  const guestState = {
    adults: 0,
    children: 0,
    infants: 0,
    pets: 0
  };

  const hideTimers = {
    where: 0,
    when: 0,
    who: 0
  };

  let compactOpenTimer = 0;

  let lastHeaderScrolled = false;
  let headerSearchExpanded = false;

  const selection = {
    activePanel: "",
    startDate: "",
    endDate: ""
  };

  const isDesktopLayout = () => window.innerWidth > 980;

  const isCompactSearchVisible = () =>
    isDesktopLayout() &&
    header.classList.contains("hero-header--scrolled") &&
    !header.classList.contains("hero-header--search-open");

  const searchPlaceholders = {
    homes: {
      expanded: {
        where: "Search destinations",
        when: "Add dates",
        who: "Add guests"
      },
      compact: {
        where: "Anywhere",
        when: "Anytime",
        who: "Add guests"
      }
    },
    experiences: {
      expanded: {
        where: "Search experiences",
        when: "Add dates",
        who: "Add guests"
      },
      compact: {
        where: "Anywhere",
        when: "Anytime",
        who: "Add guests"
      }
    },
    services: {
      expanded: {
        where: "Search services",
        when: "Add dates",
        who: "Add guests"
      },
      compact: {
        where: "Anywhere",
        when: "Anytime",
        who: "Add guests"
      }
    }
  };

  let searchMode = "homes";

  const syncCompactPlaceholders = () => {
    const modeConfig = searchPlaceholders[searchMode] || searchPlaceholders.homes;
    const nextPlaceholders = isCompactSearchVisible() ? modeConfig.compact : modeConfig.expanded;
    locationInput.placeholder = nextPlaceholders.where;
    whenInput.placeholder = nextPlaceholders.when;
    guestsInput.placeholder = nextPlaceholders.who;
  };

  window.setSearchMode = (nextMode) => {
    searchMode = searchPlaceholders[nextMode] ? nextMode : "homes";
    syncCompactPlaceholders();
  };

  const animateFormLayoutChange = (applyState) => {
    if (!isDesktopLayout() || reduceMotionQuery.matches) {
      applyState();
      return;
    }

    const before = form.getBoundingClientRect();
    applyState();
    const after = form.getBoundingClientRect();

    const dx = before.left - after.left;
    const dy = before.top - after.top;
    const sx = before.width / Math.max(after.width, 1);
    const sy = before.height / Math.max(after.height, 1);

    if (
      Math.abs(dx) < 0.5 &&
      Math.abs(dy) < 0.5 &&
      Math.abs(sx - 1) < 0.005 &&
      Math.abs(sy - 1) < 0.005
    ) {
      return;
    }

    form.getAnimations().forEach((animation) => animation.cancel());
    form.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
        { transform: "translate(0, 0) scale(1, 1)" }
      ],
      {
        duration: 320,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)"
      }
    );
  };

  const applyHeaderExpandedState = (nextExpanded) => {
    header.classList.toggle("hero-header--search-open", nextExpanded);
    syncCompactPlaceholders();
    if (selection.activePanel) {
      positionPanel(selection.activePanel);
    }
  };

  const applyHeaderScrollState = (nextScrolled) => {
    header.classList.toggle("hero-header--scrolled", nextScrolled);
    if (!nextScrolled && headerSearchExpanded) {
      headerSearchExpanded = false;
      header.classList.remove("hero-header--search-open");
    }
    syncCompactPlaceholders();
    if (selection.activePanel) {
      positionPanel(selection.activePanel);
    }
  };

  const animateSearchLift = (nextScrolled) => {
    animateFormLayoutChange(() => {
      applyHeaderScrollState(nextScrolled);
    });
  };

  const setSearchExpanded = (nextExpanded) => {
    if (!header.classList.contains("hero-header--scrolled") || !isDesktopLayout()) {
      return;
    }
    if (headerSearchExpanded === nextExpanded) return;

    headerSearchExpanded = nextExpanded;
    animateFormLayoutChange(() => {
      applyHeaderExpandedState(nextExpanded);
    });
  };

  const focusFieldInput = (fieldName) => {
    const field = fields[fieldName];
    if (field) {
      field.focus({ preventScroll: true });
    }

    const input = inputByField[fieldName];
    if (!input) return;
    input.focus({ preventScroll: true });

    if (typeof input.setSelectionRange === "function") {
      try {
        const length = input.value ? input.value.length : input.placeholder.length;
        input.setSelectionRange(0, length);
      } catch (_) {
        // Ignore selection errors for non-text states.
      }
    }
  };

  const openPanelWithFieldFocus = (fieldName) => {
    openPanel(fieldName);
    focusFieldInput(fieldName);
  };

  const openFromCompactState = (fieldName) => {
    if (!isCompactSearchVisible()) return false;
    window.clearTimeout(compactOpenTimer);
    setSearchExpanded(true);
    // Open panel immediately; re-open after animation completes to ensure correct position
    openPanelWithFieldFocus(fieldName);
    compactOpenTimer = window.setTimeout(
      () => {
        openPanelWithFieldFocus(fieldName);
      },
      reduceMotionQuery.matches ? 0 : 280
    );
    return true;
  };

  const resolveFieldFromClick = (clientX) => {
    for (const [name, field] of Object.entries(fields)) {
      const rect = field.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) {
        return name;
      }
    }

    const formRect = form.getBoundingClientRect();
    const submitRect = form.querySelector(".hero-search__submit")?.getBoundingClientRect();
    const submitLeft = submitRect ? submitRect.left - formRect.left : formRect.width;
    const segmentWidth = Math.max(1, submitLeft / 3);
    const x = clientX - formRect.left;

    if (x < segmentWidth) return "where";
    if (x < segmentWidth * 2) return "when";
    return "who";
  };

  const updateHeaderOnScroll = () => {
    if (!header) return;
    const nextScrolled = window.scrollY > 8;
    if (nextScrolled === lastHeaderScrolled) return;
    lastHeaderScrolled = nextScrolled;
    animateSearchLift(nextScrolled);
  };

  const MONTH_LABELS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];

  const calendarMonths = [
    { year: 2026, month: 2, label: "March 2026" },
    { year: 2026, month: 3, label: "April 2026" }
  ];

  const normalizeKey = (key) => {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day).getTime();
  };

  const formatDate = (key) => {
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return `${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`;
  };

  const pulseField = (fieldName) => {
    const field = fields[fieldName];
    if (!field) return;
    field.classList.remove("hero-search__field--updated");
    void field.offsetWidth;
    field.classList.add("hero-search__field--updated");
    window.setTimeout(() => {
      field.classList.remove("hero-search__field--updated");
    }, 280);
  };

  const updateWhenDisplay = (animate = false) => {
    if (selection.startDate && selection.endDate) {
      whenInput.value = `${formatDate(selection.startDate)} - ${formatDate(selection.endDate)}`;
      clearWhenBtn.hidden = false;
      if (animate) pulseField("when");
      return;
    }

    if (selection.startDate) {
      whenInput.value = formatDate(selection.startDate);
      clearWhenBtn.hidden = false;
      if (animate) pulseField("when");
      return;
    }

    whenInput.value = "";
    clearWhenBtn.hidden = true;
    if (animate) pulseField("when");
  };

  const updateGuestDisplay = (animate = false) => {
    const totalGuests = guestState.adults + guestState.children;
    if (totalGuests <= 0) {
      guestsInput.value = "";
      if (animate) pulseField("who");
      return;
    }

    const guestText = `${totalGuests} guest${totalGuests > 1 ? "s" : ""}`;
    const infantText =
      guestState.infants > 0
        ? `, ${guestState.infants} infant${guestState.infants > 1 ? "s" : ""}`
        : "";
    const petText =
      guestState.pets > 0
        ? `, ${guestState.pets} pet${guestState.pets > 1 ? "s" : ""}`
        : "";
    guestsInput.value = `${guestText}${infantText}${petText}`;
    if (animate) pulseField("who");
  };

  const updateGuestControls = () => {
    document.querySelectorAll(".guest-row").forEach((row) => {
      const key = row.dataset.guest;
      const value = guestState[key];
      const count = row.querySelector(".guest-row__count");
      const decrement = row.querySelector('[data-action="decrement"]');
      const increment = row.querySelector('[data-action="increment"]');

      if (count) {
        count.textContent = String(value);
      }
      if (decrement) {
        decrement.disabled = value <= 0;
      }
      if (increment) {
        increment.disabled = value >= 16;
      }
    });
  };

  const buildMonthMarkup = (year, month, label) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startTime = selection.startDate ? normalizeKey(selection.startDate) : 0;
    const endTime = selection.endDate ? normalizeKey(selection.endDate) : 0;

    const dayCells = [];
    for (let i = 0; i < firstDay; i += 1) {
      dayCells.push('<span class="calendar-day calendar-day--empty">.</span>');
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const time = normalizeKey(key);
      const inRange = startTime && endTime && time > startTime && time < endTime;
      const selected = key === selection.startDate || key === selection.endDate;
      const className = [
        "calendar-day",
        selected ? "calendar-day--selected" : "",
        inRange ? "calendar-day--in-range" : ""
      ]
        .filter(Boolean)
        .join(" ");

      dayCells.push(`<button type="button" class="${className}" data-date="${key}">${day}</button>`);
    }

    return `
      <section class="calendar-month">
        <h4 class="calendar-month__head">${label}</h4>
        <div class="calendar-weekdays">
          <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
        </div>
        <div class="calendar-days">${dayCells.join("")}</div>
      </section>
    `;
  };

  const renderCalendar = () => {
    if (!calendarRoot) return;
    calendarRoot.innerHTML = calendarMonths
      .map((monthInfo) =>
        buildMonthMarkup(monthInfo.year, monthInfo.month, monthInfo.label)
      )
      .join("");

    calendarRoot.querySelectorAll(".calendar-day[data-date]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextKey = button.dataset.date || "";
        const nextTime = normalizeKey(nextKey);
        const startTime = selection.startDate ? normalizeKey(selection.startDate) : 0;

        if (!selection.startDate || (selection.startDate && selection.endDate)) {
          selection.startDate = nextKey;
          selection.endDate = "";
        } else if (nextTime < startTime) {
          selection.startDate = nextKey;
          selection.endDate = "";
        } else if (nextKey === selection.startDate) {
          selection.endDate = "";
        } else {
          selection.endDate = nextKey;
        }

        updateWhenDisplay();
        renderCalendar();
      });
    });
  };

  const setFieldState = (fieldName, isActive) => {
    const field = fields[fieldName];
    if (!field) return;
    field.classList.toggle("hero-search__field--active", isActive);
    field.setAttribute("aria-expanded", String(isActive));
  };

  const positionPanel = (fieldName) => {
    const panel = panels[fieldName];
    if (!panel) return;
    if (window.innerWidth <= 980) return;
    panel.style.top = "0px";
    const searchWidth = form.clientWidth;

    if (fieldName === "where") {
      panel.style.left = "0px";
      panel.style.width = "460px";
      return;
    }

    if (fieldName === "when") {
      panel.style.left = "0px";
      panel.style.width = `${searchWidth}px`;
      return;
    }

    if (fieldName === "who") {
      const panelWidth = Math.min(460, searchWidth);
      panel.style.left = `${searchWidth - panelWidth}px`;
      panel.style.width = `${panelWidth}px`;
    }
  };

  const hidePanel = (fieldName) => {
    const panel = panels[fieldName];
    if (!panel) return;

    window.clearTimeout(hideTimers[fieldName]);
    panel.classList.remove("search-panel--open");
    setFieldState(fieldName, false);

    hideTimers[fieldName] = window.setTimeout(() => {
      if (!panel.classList.contains("search-panel--open")) {
        panel.hidden = true;
      }
    }, 200);
  };

  const showPanel = (fieldName) => {
    const panel = panels[fieldName];
    if (!panel) return;

    window.clearTimeout(hideTimers[fieldName]);
    panel.hidden = false;
    positionPanel(fieldName);
    requestAnimationFrame(() => {
      panel.classList.add("search-panel--open");
    });
    setFieldState(fieldName, true);
  };

  const closePanels = (except = "") => {
    Object.keys(panels).forEach((name) => {
      if (name === except) return;
      hidePanel(name);
    });
    if (!except) {
      selection.activePanel = "";
    }
  };

  const openPanel = (fieldName) => {
    closePanels(fieldName);
    showPanel(fieldName);
    selection.activePanel = fieldName;
    focusFieldInput(fieldName);
  };

  const togglePanel = (fieldName) => {
    if (selection.activePanel === fieldName && !panels[fieldName]?.hidden) {
      closePanels();
      return;
    }
    openPanel(fieldName);
  };

  const collapseExpandedSearchIfNeeded = () => {
    if (!header.classList.contains("hero-header--scrolled")) return;
    if (!headerSearchExpanded) return;
    setSearchExpanded(false);
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((current) => {
        current.classList.remove("hero-tab--active");
        current.removeAttribute("aria-current");
      });
      tab.classList.add("hero-tab--active");
      tab.setAttribute("aria-current", "page");
      closePanels();
      collapseExpandedSearchIfNeeded();

      const nextMode = tab.dataset.tab || "homes";
      if (typeof window.setExploreMode === "function") {
        window.setExploreMode(nextMode);
      } else {
        window.setSearchMode(nextMode);
      }
    });
  });

  Object.entries(fields).forEach(([name, field]) => {
    field.addEventListener("click", (event) => {
      event.stopPropagation();
      if (openFromCompactState(name)) {
        return;
      }
      togglePanel(name);
    });

    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (openFromCompactState(name)) {
          return;
        }
        togglePanel(name);
      }
    });
  });

  Object.entries(inputByField).forEach(([name, input]) => {
    if (!input) return;

    input.addEventListener("click", (event) => {
      event.stopPropagation();
      if (openFromCompactState(name)) return;
      if (selection.activePanel !== name || panels[name]?.hidden) {
        openPanel(name);
      }
    });

    input.addEventListener("focus", () => {
      if (isCompactSearchVisible()) {
        openFromCompactState(name);
        return;
      }
      if (selection.activePanel !== name || panels[name]?.hidden) {
        openPanel(name);
      }
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (isCompactSearchVisible()) {
      setSearchExpanded(true);
      window.clearTimeout(compactOpenTimer);
      openPanelWithFieldFocus("where");
      compactOpenTimer = window.setTimeout(
        () => openPanelWithFieldFocus("where"),
        reduceMotionQuery.matches ? 0 : 220
      );
      return;
    }
    closePanels();
    collapseExpandedSearchIfNeeded();
  });

  form.addEventListener(
    "pointerdown",
    (event) => {
      if (!isCompactSearchVisible()) return;
      if (event.target.closest(".hero-search__submit")) return;
      event.preventDefault();
      event.stopPropagation();
      openFromCompactState(resolveFieldFromClick(event.clientX));
    },
    true
  );

  document.querySelectorAll(".where-item").forEach((button) => {
    button.addEventListener("click", () => {
      locationInput.value = button.dataset.location || "";
      pulseField("where");
      closePanels();
    });
  });

  if (clearWhenBtn) {
    clearWhenBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      selection.startDate = "";
      selection.endDate = "";
      updateWhenDisplay(true);
      renderCalendar();
    });
  }

  document.querySelectorAll(".guest-row__btn").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest(".guest-row");
      const key = row?.dataset.guest || "";
      if (!key || !(key in guestState)) return;

      const action = button.dataset.action;
      if (action === "increment") {
        guestState[key] = Math.min(16, guestState[key] + 1);
      } else {
        guestState[key] = Math.max(0, guestState[key] - 1);
      }

      updateGuestControls();
      updateGuestDisplay(true);
    });
  });

  document.querySelectorAll(".when-switch__btn").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".when-switch__btn").forEach((current) => {
        current.classList.remove("when-switch__btn--active");
      });
      button.classList.add("when-switch__btn--active");
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    const clickedPanel = Object.values(panels).some((panel) => panel && panel.contains(target));
    const clickedField = form.contains(target);
    if (!clickedPanel && !clickedField) {
      closePanels();
      collapseExpandedSearchIfNeeded();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePanels();
      collapseExpandedSearchIfNeeded();
    }
  });

  window.addEventListener("resize", () => {
    if (!isDesktopLayout() && headerSearchExpanded) {
      headerSearchExpanded = false;
      applyHeaderExpandedState(false);
    }
    syncCompactPlaceholders();
    if (selection.activePanel) {
      positionPanel(selection.activePanel);
    }
  });

  window.addEventListener("scroll", updateHeaderOnScroll, { passive: true });
  lastHeaderScrolled = window.scrollY > 8;
  applyHeaderScrollState(lastHeaderScrolled);
  const activeTab = Array.from(tabs).find((tab) => tab.classList.contains("hero-tab--active"));
  window.setSearchMode(activeTab?.dataset.tab || "homes");

  updateWhenDisplay();
  updateGuestControls();
  updateGuestDisplay();
  renderCalendar();
};
