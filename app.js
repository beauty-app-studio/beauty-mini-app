const APP_VERSION = "7.32.0";
const CONFIG_URL = `salon_config.json?v=${APP_VERSION}`;

let salonConfig = null;
let API_BASE_URL = "";
let SALON_NAME = "Салон краси";
let SALON_PHONE = "";
let SALON_PHONE_DISPLAY = "";
let SALON_ADDRESS = "";
let SALON_MAP_URL = "";
let masters = {};
let serviceCatalog = {};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function validateSalonConfig(config) {
  const required = [
    config?.salon?.name,
    config?.salon?.address,
    config?.salon?.phone_e164,
    config?.deployment?.api_base_url,
  ];

  if (
    required.some(value => !String(value || "").trim()) ||
    !config?.services ||
    !Object.keys(config.services).length ||
    !config?.masters ||
    !Object.keys(config.masters).length
  ) {
    throw new Error("Файл salon_config.json заповнений не повністю.");
  }

  Object.entries(config.masters).forEach(([masterKey, master]) => {
    const unknownService = (master.services || []).find(
      serviceKey => !config.services[serviceKey]
    );

    if (unknownService) {
      throw new Error(
        `У майстра ${masterKey} вказана невідома послуга ${unknownService}.`
      );
    }
  });
}

function buildSalonCatalog(config) {
  serviceCatalog = config.services;
  masters = Object.fromEntries(
    Object.entries(config.masters).map(([key, master]) => [
      key,
      {
        ...master,
        key,
        legacyKey: master.legacy_key || "",
        services: (master.services || []).map(
          serviceKey => config.services[serviceKey].name
        ),
        // У конфігурації: 1 = понеділок, 7 = неділя.
        // Date.getDay(): 0 = неділя, 1 = понеділок.
        workdays: (master.workdays || []).map(day => Number(day) % 7),
      },
    ])
  );
}

function renderSalonCatalog() {
  const masterList = document.querySelector(".master-list");
  const serviceList = document.querySelector(".service-list");

  if (masterList) {
    masterList.innerHTML = Object.entries(masters).map(([key, master]) => `
      <article class="master-card compact">
        <img src="${escapeHtml(master.photo)}" alt="${escapeHtml(master.name)}">
        <div class="master-content">
          <div class="master-title-row">
            <div>
              <h3>${escapeHtml(master.name)}</h3>
              <p>${escapeHtml(master.specialty)}</p>
            </div>
            <span class="rating">★ ${escapeHtml(master.rating)}</span>
          </div>
          <button class="secondary-button profile-open" data-master-key="${escapeHtml(key)}">
            Переглянути профіль
          </button>
        </div>
      </article>
    `).join("");
  }

  if (serviceList) {
    serviceList.innerHTML = Object.entries(serviceCatalog)
      .map(([, service]) => `
        <button
          class="service-card"
          data-service="${escapeHtml(service.name)}"
          data-price="${escapeHtml(service.price)}"
          data-duration="${Number(service.duration)} хв"
        >
          <div>
            <strong>${escapeHtml(service.name)}</strong>
            <small>${Number(service.duration)} хв</small>
          </div>
          <span>${escapeHtml(service.price)}</span>
        </button>
      `).join("");
  }

  bindCatalogButtons();
}

function applySalonConfig(config) {
  validateSalonConfig(config);
  salonConfig = config;

  SALON_NAME = String(config.salon.name);
  SALON_PHONE = String(config.salon.phone_e164);
  SALON_PHONE_DISPLAY = String(
    config.salon.phone_display || config.salon.phone_e164
  );
  SALON_ADDRESS = String(config.salon.address);
  SALON_MAP_URL = String(
    config.salon.map_url ||
    "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(SALON_ADDRESS)
  );
  API_BASE_URL = String(config.deployment.api_base_url).replace(/\/$/, "");

  buildSalonCatalog(config);

  document.title = SALON_NAME;
  document.querySelectorAll("[data-salon-name]").forEach(element => {
    element.textContent = SALON_NAME;
  });
  document.querySelectorAll("[data-salon-address]").forEach(element => {
    element.textContent = SALON_ADDRESS;
  });
  document.querySelectorAll("[data-salon-phone]").forEach(element => {
    element.textContent = SALON_PHONE_DISPLAY;
  });
  document.querySelectorAll("[data-salon-work-time]").forEach(element => {
    element.textContent = config.salon.work_time || "";
  });
  document.querySelectorAll("[data-salon-tagline]").forEach(element => {
    element.textContent = config.salon.tagline || "Ваш простір краси";
  });

  const heroImage = document.querySelector("#home-hero-image");
  if (heroImage && config.salon.hero_image) {
    heroImage.src = config.salon.hero_image;
  }

  const theme = config.theme || {};
  const themeVariables = {
    "--accent": theme.accent,
    "--accent-dark": theme.accent_dark,
    "--soft": theme.soft,
    "--page": theme.page,
  };
  Object.entries(themeVariables).forEach(([name, value]) => {
    if (value) document.documentElement.style.setProperty(name, value);
  });

  document.querySelectorAll('input[type="tel"]').forEach(input => {
    input.placeholder = SALON_PHONE;
  });

  renderSalonCatalog();
}

function showConfigFailure(message) {
  const startup = document.querySelector("#app-startup");
  const title = document.querySelector("#app-startup-title");
  const description = document.querySelector("#app-startup-description");
  const retry = document.querySelector("#app-startup-retry");

  if (startup) startup.hidden = false;
  if (title) title.textContent = "Не вдалося відкрити салон";
  if (description) description.textContent = message;
  if (retry) retry.hidden = false;
}

function setServerAvailability(isAvailable) {
  const banner = document.querySelector("#server-status-banner");
  if (!banner) return;
  banner.hidden = isAvailable;
}

async function checkApiHealth() {
  if (!API_BASE_URL) return false;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      cache: "no-store",
      signal: controller.signal,
    });
    const data = await response.json();
    const isAvailable = Boolean(response.ok && data?.ok);
    setServerAvailability(isAvailable);
    return isAvailable;
  } catch {
    setServerAvailability(false);
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function loadSalonConfig() {
  const response = await fetch(CONFIG_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Не вдалося завантажити salon_config.json.");
  }

  const config = await response.json();
  applySalonConfig(config);
  return config;
}

function getTelegramWebApp() {
  return window.Telegram?.WebApp || null;
}

function getInitData() {
  return getTelegramWebApp()?.initData || "";
}

function showAppAlert(message) {
  const tg = getTelegramWebApp();

  if (tg?.showAlert) {
    tg.showAlert(message);
  } else {
    window.alert(message);
  }
}

function askConfirmation(message) {
  const tg = getTelegramWebApp();

  return new Promise(resolve => {
    if (tg?.showConfirm) {
      tg.showConfirm(message, result => resolve(Boolean(result)));
      return;
    }

    resolve(window.confirm(message));
  });
}

function openExternal(url) {
  const tg = getTelegramWebApp();

  if (tg?.openLink) {
    tg.openLink(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function apiErrorMessage(status, responseData) {
  const detail = responseData?.detail;

  if (status === 401) {
    return (
      "Не вдалося підтвердити Telegram-сесію. " +
      "Закрийте Mini App і відкрийте його знову через бота."
    );
  }

  if (status === 429) {
    return "Забагато дій поспіль. Зачекайте хвилину та спробуйте ще раз.";
  }

  if (status === 404) {
    return "Запис не знайдено або він уже недоступний.";
  }

  if (status === 409) {
    if (detail === "This booking can no longer be cancelled.") {
      return "Цей запис уже не можна скасувати.";
    }

    if (detail === "This booking can no longer be rescheduled.") {
      return "Цей запис уже не можна перенести.";
    }

    if (detail === "Only confirmed bookings can receive client updates.") {
      return "Повідомити про запізнення можна лише для підтвердженого запису.";
    }

    return (
      "Цей час щойно зайняли. Поверніться до вибору часу " +
      "та оберіть інший варіант."
    );
  }

  if (status === 422) {
    if (detail === "Phone number is required for callback request.") {
      return "Вкажіть номер телефону, на який адміністратор зможе передзвонити.";
    }

    if (detail === "This master does not provide the selected service.") {
      return "Обраний майстер не виконує цю послугу.";
    }

    if (detail === "Unknown service." || detail === "Unknown master.") {
      return "Не вдалося розпізнати послугу або майстра.";
    }

    return "Перевірте дані запису та спробуйте ще раз.";
  }

  if (status === 503 && detail === "Could not send salon contact.") {
    return "Не вдалося надіслати контакт у Telegram. Спробуйте ще раз.";
  }

  return detail || "Сталася помилка. Спробуйте ще раз.";
}

async function apiPost(path, payload) {
  let response;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15000);

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    setServerAvailability(false);
    const networkError = new Error(
      error?.name === "AbortError"
        ? "Сервер відповідає надто довго. Спробуйте ще раз за кілька секунд."
        : "Не вдалося зв’язатися із сервером запису. Спробуйте ще раз за кілька секунд."
    );
    networkError.cause = error;
    throw networkError;
  } finally {
    window.clearTimeout(timeoutId);
  }

  setServerAvailability(true);

  let responseData = {};

  try {
    responseData = await response.json();
  } catch {
    responseData = {};
  }

  if (!response.ok) {
    const error = new Error(
      apiErrorMessage(response.status, responseData)
    );
    error.status = response.status;
    error.data = responseData;
    throw error;
  }

  return responseData;
}

function updateServiceAvailability(masterKey = null) {
  const allowedServices = masterKey
    ? masters[masterKey]?.services || []
    : null;

  document.querySelectorAll(".service-card").forEach(card => {
    const isAvailable = !allowedServices ||
      allowedServices.includes(card.dataset.service);

    card.hidden = !isAvailable;
    card.disabled = !isAvailable;
  });
}

function getSavedBooking() {
  try {
    return JSON.parse(
      localStorage.getItem("beautyStudioLastBooking") || "null"
    );
  } catch {
    return null;
  }
}

function saveBooking(value) {
  if (!value) {
    localStorage.removeItem("beautyStudioLastBooking");
    return;
  }

  localStorage.setItem(
    "beautyStudioLastBooking",
    JSON.stringify(value)
  );
}

function getTelegramUser() {
  return window.Telegram?.WebApp?.initDataUnsafe?.user || null;
}

function getSavedProfileName() {
  return localStorage.getItem("beautyStudioProfileName") || "";
}

function saveProfileName(name) {
  localStorage.setItem(
    "beautyStudioProfileName",
    name.trim()
  );
}

function getSavedPhone() {
  return localStorage.getItem("beautyStudioPhone") || "";
}

function savePhone(phone) {
  const clean = String(phone || "").trim();
  if (clean) {
    localStorage.setItem("beautyStudioPhone", clean);
  }
}

function getFavorites() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("beautyStudioFavorites") || "[]"
    );

    if (!Array.isArray(saved)) return [];

    const migrated = saved.map(key => {
      if (masters[key]) return key;

      const match = Object.entries(masters).find(
        ([, master]) => master.legacyKey === key
      );
      return match?.[0] || key;
    }).filter(key => masters[key]);

    if (JSON.stringify(migrated) !== JSON.stringify(saved)) {
      saveFavorites(migrated);
    }

    return migrated;
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem(
    "beautyStudioFavorites",
    JSON.stringify(favorites)
  );
}

function getDisplayUser() {
  const telegramUser = getTelegramUser();
  const savedName = getSavedProfileName();

  return {
    name: savedName,
    username: telegramUser?.username
      ? `@${telegramUser.username}`
      : "",
    photo: telegramUser?.photo_url || "",
    isConfigured: Boolean(savedName),
  };
}

function greetingByTime(name) {
  const hour = new Date().getHours();
  let greeting = "Добрий вечір";

  if (hour < 12) greeting = "Доброго ранку";
  else if (hour < 18) greeting = "Добрий день";

  return name
    ? `${greeting}, ${name} 🌸`
    : "Раді бачити вас 🌸";
}

function renderAvatar(element, user) {
  if (!element) return;

  element.replaceChildren();

  if (user.photo) {
    const image = document.createElement("img");
    image.src = user.photo;
    image.alt = user.name || "Аватар користувача";
    image.referrerPolicy = "no-referrer";
    element.append(image);
  } else {
    element.textContent =
      user.name.trim().charAt(0).toUpperCase() ||
      SALON_NAME.trim().charAt(0).toUpperCase() ||
      "S";
  }
}

function statusLabel(status) {
  return {
    new: "Очікує підтвердження",
    confirmed: "Підтверджено",
    completed: "Завершено",
    cancelled: "Скасовано",
  }[status] || "Статус уточнюється";
}

function safeBookingStatus(status) {
  return ["new", "confirmed", "completed", "cancelled"].includes(status)
    ? status
    : "new";
}

function formatIsoDate(isoDate) {
  if (!isoDate) return "";

  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;

  return new Date(year, month - 1, day).toLocaleDateString("uk-UA");
}

function normalizeServerBooking(item) {
  return {
    master: item.master,
    service: item.service,
    price: item.price,
    duration: item.duration,
    date: formatIsoDate(item.booking_date),
    time: item.booking_time,
    bookingId: item.booking_id,
    visitMode: item.visit_mode || "standard",
    visitModeLabel:
      item.visit_mode_label ||
      visitModeLabel(item.visit_mode || "standard"),
    status: item.status,
  };
}

let completedVisitCount = 0;
let profileSyncInProgress = false;
let preferredProfileBookingId = null;
let activeClientBookings = [];

function renderClientProfile() {
  const user = getDisplayUser();
  const savedBooking = getSavedBooking();
  const favorites = getFavorites();

  const greeting = document.querySelector("#home-greeting");
  const profileName = document.querySelector("#client-profile-name");
  const profileUsername = document.querySelector("#client-profile-username");
  const favoriteCount = document.querySelector("#favorite-count");
  const visitCount = document.querySelector("#visit-count");

  if (greeting) greeting.textContent = greetingByTime(user.name);
  if (profileName) {
    profileName.textContent = user.name || "Профіль не налаштовано";
  }
  if (profileUsername) {
    profileUsername.textContent = user.username;
    profileUsername.hidden = !user.username;
  }
  if (favoriteCount) favoriteCount.textContent = favorites.length;
  if (visitCount) visitCount.textContent = completedVisitCount;

  renderAvatar(document.querySelector("#home-avatar"), user);
  renderAvatar(document.querySelector("#client-avatar"), user);

  const card = document.querySelector("#next-booking-card");
  const actions = document.querySelector("#profile-booking-actions");
  const lateButton = document.querySelector("#late-arrival-button");
  const bookingsList = document.querySelector("#client-bookings-list");
  const selectedLabel = document.querySelector("#selected-booking-label");

  if (!card || !actions) return;

  if (bookingsList) {
    bookingsList.innerHTML = activeClientBookings.map(item => {
      const isSelected =
        savedBooking &&
        String(savedBooking.bookingId) === String(item.bookingId);
      const itemStatus = safeBookingStatus(item.status);

      return `
        <button
          type="button"
          class="client-booking-list-item${isSelected ? " selected" : ""}"
          data-profile-booking-id="${escapeHtml(item.bookingId)}"
        >
          <span class="client-booking-list-main">
            <strong>${escapeHtml(item.service)}</strong>
            <small>${escapeHtml(item.date)} · ${escapeHtml(item.time)}</small>
            <small>${escapeHtml(item.master)}</small>
          </span>
          <span class="client-booking-list-status status-${itemStatus}">
            ${escapeHtml(statusLabel(itemStatus))}
          </span>
        </button>`;
    }).join("");
  }

  if (!savedBooking) {
    if (selectedLabel) selectedLabel.style.display = "none";
    card.innerHTML = `
      <div class="empty-booking-state">
        <span>📅</span>
        <strong>Активних записів немає</strong>
        <p>Оберіть майстра та зручний час.</p>
      </div>`;
    actions.style.display = "none";
    return;
  }

  if (selectedLabel) selectedLabel.style.display = "block";

  const status = safeBookingStatus(savedBooking.status);
  const savedVisitMode =
    savedBooking.visitMode || savedBooking.visit_mode || "standard";
  const visitPreference =
    savedVisitMode !== "standard"
      ? `<div class="booking-preference-note">🌿 ${escapeHtml(visitModeLabel(savedVisitMode))}</div>`
      : "";

  card.innerHTML = `
    <div class="booking-ticket-top">
      <span>Заявка №${escapeHtml(savedBooking.bookingId || "—")}</span>
      <span class="status-pill status-${status}">${escapeHtml(statusLabel(status))}</span>
    </div>
    <div class="booking-ticket-service">
      <h3>${escapeHtml(savedBooking.service)}</h3>
      <p>${escapeHtml(savedBooking.master)}</p>
    </div>
    <div class="booking-ticket-details">
      <div>
        <small>Дата</small>
        <strong>${escapeHtml(savedBooking.date)}</strong>
      </div>
      <div>
        <small>Час</small>
        <strong>${escapeHtml(savedBooking.time)}</strong>
      </div>
      <div>
        <small>Тривалість</small>
        <strong>${escapeHtml(savedBooking.duration)}</strong>
      </div>
      <div>
        <small>Вартість</small>
        <strong>${escapeHtml(savedBooking.price)}</strong>
      </div>
    </div>
    ${visitPreference}`;

  actions.style.display =
    ["new", "confirmed"].includes(status) ? "grid" : "none";

  if (lateButton) {
    lateButton.style.display = status === "confirmed" ? "block" : "none";
  }
}

async function syncClientBookings() {
  if (profileSyncInProgress) return;

  const initData = getInitData();
  if (!initData) {
    const localBooking = getSavedBooking();
    activeClientBookings = localBooking ? [localBooking] : [];
    renderClientProfile();
    return;
  }

  profileSyncInProgress = true;

  try {
    const data = await apiPost("/api/my-bookings", {
      init_data: initData,
    });

    completedVisitCount = Number(data.completed_count || 0);

    const serverBookings = Array.isArray(data.bookings)
      ? data.bookings
      : [];

    activeClientBookings = serverBookings.map(normalizeServerBooking);

    const currentBooking = getSavedBooking();
    let selectedBooking = activeClientBookings[0] || null;

    if (preferredProfileBookingId !== null) {
      const preferredBooking = activeClientBookings.find(
        item =>
          String(item.bookingId) ===
          String(preferredProfileBookingId)
      );

      if (preferredBooking) {
        selectedBooking = preferredBooking;
      }

      preferredProfileBookingId = null;
    } else if (currentBooking?.bookingId) {
      const stillActive = activeClientBookings.find(
        item =>
          String(item.bookingId) ===
          String(currentBooking.bookingId)
      );

      if (stillActive) {
        selectedBooking = stillActive;
      }
    }

    saveBooking(selectedBooking);
  } catch (error) {
    console.warn("Profile sync error:", error);
  } finally {
    profileSyncInProgress = false;
    renderClientProfile();
  }
}

document.querySelector("#client-bookings-list")?.addEventListener(
  "click",
  event => {
    const button = event.target.closest("[data-profile-booking-id]");
    if (!button) return;

    const selected = activeClientBookings.find(
      item =>
        String(item.bookingId) ===
        String(button.dataset.profileBookingId)
    );

    if (!selected) return;

    saveBooking(selected);
    renderClientProfile();
    getTelegramWebApp()?.HapticFeedback?.selectionChanged?.();
  }
);


function renderFavorites() {
  const container = document.querySelector("#favorites-list");
  if (!container) return;

  const favoriteKeys = getFavorites().filter(key => masters[key]);

  if (!favoriteKeys.length) {
    container.innerHTML = `
      <div class="favorite-empty">
        <span>♡</span>
        <strong>Улюблених майстрів поки немає</strong>
        <p>Відкрийте профіль майстра та натисніть сердечко.</p>
      </div>`;
    return;
  }

  container.innerHTML = favoriteKeys.map(key => {
    const master = masters[key];
    return `
      <button class="favorite-card" data-favorite-master="${escapeHtml(key)}">
        <img src="${escapeHtml(master.photo)}" alt="${escapeHtml(master.name)}">
        <span>
          <strong>${escapeHtml(master.name)}</strong>
          <small>${escapeHtml(master.specialty)}</small>
        </span>
        <b>›</b>
      </button>`;
  }).join("");

  container
    .querySelectorAll("[data-favorite-master]")
    .forEach(button => {
      button.addEventListener("click", () => {
        openMasterProfile(button.dataset.favoriteMaster);
      });
    });
}

const screens = document.querySelectorAll(".screen");
const navItems = document.querySelectorAll(".nav-item");

screens.forEach(screen => {
  const isActive = screen.classList.contains("active");
  screen.hidden = !isActive;
  screen.setAttribute("aria-hidden", String(!isActive));
});
const historyStack = ["home-screen"];
const VISIT_MODE_LABELS = {
  standard: "Без побажань",
  quiet: "Хочу тиші",
  social: "Можна спілкуватися",
  consultation: "Потрібна консультація",
};

function visitModeLabel(value) {
  return VISIT_MODE_LABELS[value] || VISIT_MODE_LABELS.standard;
}

const booking = {
  master: "",
  masterKey: "",
  service: "",
  price: "",
  duration: "",
  date: "",
  time: "",
  visitMode: "standard",
};

let currentMonth = new Date();
currentMonth.setDate(1);
let activeMasterKey = null;
let bookingFlowMode = "new";
let rescheduleBookingId = null;

function resetMasterFilter() {
  document.querySelectorAll(".master-card").forEach(card => {
    card.hidden = false;
  });

  const chip = document.querySelector("#masters-filter-chip");
  if (chip) {
    chip.hidden = true;
    chip.textContent = "";
  }
}

function filterMastersForService(serviceName) {
  document.querySelectorAll(".master-card").forEach(card => {
    const button = card.querySelector(".profile-open");
    const key = button?.dataset.masterKey;
    card.hidden = !key || !masters[key].services.includes(serviceName);
  });

  const chip = document.querySelector("#masters-filter-chip");
  if (chip) {
    chip.hidden = false;
    chip.textContent = `Послуга: ${serviceName} · тепер оберіть майстра`;
  }
}

function setBookingFlowMode(mode = "new") {
  bookingFlowMode = mode;

  const isReschedule = mode === "reschedule";
  const dateEyebrow = document.querySelector("#date-step-eyebrow");
  const dateTitle = document.querySelector("#date-step-title");
  const timeEyebrow = document.querySelector("#time-step-eyebrow");
  const timeTitle = document.querySelector("#time-step-title");
  const rescheduleConfirmButton =
    document.querySelector("#reschedule-confirm-button");

  if (rescheduleConfirmButton) {
    rescheduleConfirmButton.hidden = !isReschedule;
    rescheduleConfirmButton.disabled = true;
    rescheduleConfirmButton.textContent = "Підтвердити перенесення";
  }

  if (dateEyebrow) {
    dateEyebrow.textContent = isReschedule ? "Перенесення запису" : "Крок 3";
  }
  if (dateTitle) {
    dateTitle.textContent = isReschedule ? "Оберіть нову дату" : "Оберіть дату";
  }
  if (timeEyebrow) {
    timeEyebrow.textContent = isReschedule ? "Перенесення запису" : "Крок 4";
  }
  if (timeTitle) {
    timeTitle.textContent = isReschedule ? "Оберіть новий час" : "Оберіть час";
  }
}


function renderVisitModeSelection() {
  document.querySelectorAll("[data-visit-mode]").forEach(button => {
    const selected = button.dataset.visitMode === booking.visitMode;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}


document.querySelectorAll("[data-visit-mode]").forEach(button => {
  button.addEventListener("click", () => {
    booking.visitMode = button.dataset.visitMode || "standard";
    renderVisitModeSelection();
    renderSummary();
  });
});


function resetBookingFlow() {
  booking.master = "";
  booking.masterKey = "";
  booking.service = "";
  booking.price = "";
  booking.duration = "";
  booking.date = "";
  booking.time = "";
  booking.visitMode = "standard";
  renderVisitModeSelection();
  activeMasterKey = null;
  rescheduleBookingId = null;
  setBookingFlowMode("new");
}

function setProfileSetupMode(mode = "first") {
  const isEdit = mode === "edit";

  const eyebrow = document.querySelector("#profile-setup-eyebrow");
  const title = document.querySelector("#profile-setup-title");
  const question = document.querySelector("#profile-setup-question");
  const description = document.querySelector("#profile-setup-description");
  const submit = document.querySelector("#profile-setup-submit");

  if (eyebrow) {
    eyebrow.textContent = isEdit ? "Редагування профілю" : "Перший вхід";
  }

  if (title) {
    title.textContent = isEdit ? "Змінити ім’я" : "Налаштуємо профіль";
  }

  if (question) {
    question.textContent = isEdit
      ? "Як до вас звертатися?"
      : "Як до вас звертатися?";
  }

  if (description) {
    description.textContent = isEdit
      ? "Оновіть ім’я або зручну форму звертання. Telegram username і фото залишаться без змін."
      : "Вкажіть справжнє ім’я або зручну форму звертання. Це ім’я належатиме саме профілю і не змінюватиметься через нові або скасовані записи.";
  }

  if (submit) {
    submit.textContent = isEdit ? "Зберегти зміни" : "Зберегти профіль";
  }
}


function resetScreenViewport() {
  const scrollingElement =
    document.scrollingElement || document.documentElement;

  scrollingElement.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  window.scrollTo(0, 0);

  requestAnimationFrame(() => {
    scrollingElement.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
  });

  setTimeout(() => {
    scrollingElement.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
  }, 60);
}


function showScreen(id, add = true) {
  const targetScreen = document.getElementById(id);
  if (!targetScreen) return;

  document.activeElement?.blur?.();

  screens.forEach(screen => {
    const isTarget = screen === targetScreen;
    screen.hidden = !isTarget;
    screen.classList.toggle("active", isTarget);
    screen.setAttribute("aria-hidden", String(!isTarget));
  });

  if (add) {
    const existingIndex = historyStack.lastIndexOf(id);

    if (existingIndex >= 0) {
      historyStack.splice(existingIndex + 1);
    } else {
      historyStack.push(id);
    }
  }

  navItems.forEach(item => {
    item.classList.toggle("active-nav", item.dataset.open === id);
  });

  if (id === "favorites-screen") renderFavorites();
  if (id === "client-profile-screen") syncClientBookings();
  if (id === "contacts-screen") prefillCallbackPhone();

  getTelegramWebApp()?.expand?.();
  resetScreenViewport();
}

document.querySelectorAll("[data-open]").forEach(button => {
  button.addEventListener("click", () => {
    const target = button.dataset.open;
    const isRootNavigation = button.classList.contains("nav-item");

    if (
      preferredProfileBookingId !== null &&
      button.id !== "success-view-booking"
    ) {
      preferredProfileBookingId = null;
    }

    if (
      target === "client-profile-screen" &&
      !getSavedProfileName()
    ) {
      setProfileSetupMode("first");
      document.querySelector("#profile-name-input").value = "";
      showScreen("profile-setup-screen");
      return;
    }

    if (target === "masters-screen") {
      resetBookingFlow();
      resetMasterFilter();
    }

    if (target === "services-screen") {
      resetBookingFlow();
      updateServiceAvailability(null);
      const chip = document.querySelector("#selected-master-chip");
      if (chip) {
        chip.textContent = "Спочатку оберіть послугу — потім майстра";
      }
    }

    if (isRootNavigation) {
      historyStack.splice(0, historyStack.length, target);
      showScreen(target, false);
    } else {
      showScreen(target);
    }
  });
});

document.querySelectorAll("[data-back]").forEach(button => {
  button.addEventListener("click", () => {
    if (historyStack.length > 1) historyStack.pop();
    showScreen(historyStack.at(-1), false);
  });
});

function openMasterProfile(key) {
  const master = masters[key];
  if (!master) return;

  activeMasterKey = key;
  document.querySelector("#profile-photo").src = master.photo;
  document.querySelector("#profile-name").textContent = master.name;
  document.querySelector("#profile-specialty").textContent = master.specialty;
  document.querySelector("#profile-rating").textContent = master.rating;
  document.querySelector("#profile-experience").textContent = master.experience;
  document.querySelector("#profile-clients").textContent = master.clients;
  document.querySelector("#profile-about").textContent = master.about;
  document.querySelector("#profile-review").textContent = master.review;
  const portfolio = document.querySelector("#profile-portfolio");
  portfolio.replaceChildren(
    ...master.portfolio.map(src => {
      const image = document.createElement("img");
      image.src = src;
      image.alt = "Робота майстра";
      image.loading = "lazy";
      return image;
    })
  );

  document.querySelector("#profile-like").textContent =
    getFavorites().includes(key) ? "♥" : "♡";

  showScreen("master-profile-screen");
}

function bindCatalogButtons() {
  document.querySelectorAll(".profile-open").forEach(button => {
    button.addEventListener("click", () => {
      openMasterProfile(button.dataset.masterKey);
    });
  });

  document.querySelectorAll(".service-card").forEach(button => {
    button.addEventListener("click", () => {
      booking.service = button.dataset.service;
      booking.price = button.dataset.price;
      booking.duration = button.dataset.duration;
      booking.date = "";
      booking.time = "";

      if (!booking.master) {
        filterMastersForService(booking.service);
        showScreen("masters-screen");
        return;
      }

      document.querySelector("#date-summary").innerHTML =
        `<strong>${escapeHtml(booking.master)}</strong><br>` +
        `${escapeHtml(booking.service)} · ${escapeHtml(booking.price)} · ${escapeHtml(booking.duration)}`;
      renderCalendar();
      showScreen("date-screen");
    });
  });
}

document.querySelector("#profile-like").addEventListener("click", event => {
  if (!activeMasterKey) return;

  const favorites = getFavorites();
  const index = favorites.indexOf(activeMasterKey);

  if (index === -1) {
    favorites.push(activeMasterKey);
    event.currentTarget.textContent = "♥";
  } else {
    favorites.splice(index, 1);
    event.currentTarget.textContent = "♡";
  }

  saveFavorites(favorites);
  renderClientProfile();
});

document.querySelector("#profile-book-button").addEventListener("click", () => {
  const master = masters[activeMasterKey];
  if (!master) return;

  booking.master = master.name;
  booking.masterKey = activeMasterKey;
  booking.date = "";
  booking.time = "";

  const chip = document.querySelector("#selected-master-chip");
  if (chip) chip.textContent = `Обрано: ${booking.master}`;

  if (
    booking.service &&
    master.services.includes(booking.service)
  ) {
    document.querySelector("#date-summary").innerHTML =
      `<strong>${escapeHtml(booking.master)}</strong><br>` +
      `${escapeHtml(booking.service)} · ${escapeHtml(booking.price)} · ${escapeHtml(booking.duration)}`;
    renderCalendar();
    showScreen("date-screen");
    return;
  }

  booking.service = "";
  booking.price = "";
  booking.duration = "";
  updateServiceAvailability(activeMasterKey);
  showScreen("services-screen");
});

const monthNames = [
  "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
  "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
];

function isSameMonth(first, second) {
  return first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth();
}

function renderCalendar() {
  const grid = document.querySelector("#calendar-grid");
  grid.innerHTML = "";

  document.querySelector("#calendar-month").textContent =
    `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  const firstDay = (currentMonth.getDay() + 6) % 7;
  const days = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentMonthStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );
  const previousButton = document.querySelector("#previous-month");
  previousButton.disabled = isSameMonth(currentMonth, currentMonthStart);

  for (let i = 0; i < firstDay; i += 1) {
    grid.appendChild(document.createElement("span"));
  }

  const workdays = masters[booking.masterKey]?.workdays || [];

  for (let day = 1; day <= days; day += 1) {
    const dateObj = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    const button = document.createElement("button");
    button.className = "calendar-day";
    button.textContent = day;

    const isPast = dateObj < today;
    const isWorkingDay = workdays.includes(dateObj.getDay());

    if (isPast || !isWorkingDay) {
      button.classList.add("disabled");
      button.disabled = true;
      if (!isPast && !isWorkingDay) {
        button.title = "Майстер цього дня не працює";
      }
    } else {
      button.addEventListener("click", async () => {
        document.querySelectorAll(".calendar-day").forEach(item => {
          item.classList.remove("selected");
        });
        button.classList.add("selected");
        booking.date = dateObj.toLocaleDateString("uk-UA");
        booking.time = "";
        showScreen("time-screen");
        await renderTimes();
      });
    }

    grid.appendChild(button);
  }
}

document.querySelector("#previous-month").addEventListener("click", () => {
  const todayMonth = new Date();
  todayMonth.setDate(1);
  todayMonth.setHours(0, 0, 0, 0);

  const candidate = new Date(currentMonth);
  candidate.setMonth(candidate.getMonth() - 1);

  if (candidate < todayMonth) return;

  currentMonth = candidate;
  renderCalendar();
});

document.querySelector("#next-month").addEventListener("click", () => {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  renderCalendar();
});

async function renderTimes() {
  const summary = document.querySelector("#time-summary");
  const grid = document.querySelector("#time-grid");
  const status = document.querySelector("#time-status");
  const rescheduleConfirmButton =
    document.querySelector("#reschedule-confirm-button");

  if (rescheduleConfirmButton) {
    rescheduleConfirmButton.hidden = bookingFlowMode !== "reschedule";
    rescheduleConfirmButton.disabled = true;
    rescheduleConfirmButton.textContent = "Підтвердити перенесення";
  }

  booking.time = "";

  summary.innerHTML =
    `<strong>${escapeHtml(booking.date)}</strong><br>` +
    `${escapeHtml(booking.master)}<br>${escapeHtml(booking.service)}`;
  grid.innerHTML = "";
  status.className = "time-status loading";
  status.textContent = "Перевіряємо вільний час…";

  const initData = getInitData();

  if (!initData) {
    status.className = "time-status warning";
    status.textContent = "Вільний час можна перевірити лише всередині Telegram.";
    return;
  }

  try {
    const data = await apiPost("/api/availability", {
      master: booking.master,
      service: booking.service,
      booking_date: booking.date,
      init_data: initData,
      ...(bookingFlowMode === "reschedule" && rescheduleBookingId
        ? { booking_id: rescheduleBookingId }
        : {}),
    });

    if (!data.workday) {
      status.className = "time-status warning";
      status.textContent = "Майстер цього дня не працює. Оберіть іншу дату.";
      return;
    }

    const allSlots = Array.isArray(data.all_slots)
      ? data.all_slots
      : [];
    const available = new Set(
      Array.isArray(data.available) ? data.available : []
    );

    if (!allSlots.length) {
      status.className = "time-status warning";
      status.textContent = "На цю дату немає доступного часу.";
      return;
    }

    allSlots.forEach(time => {
      const button = document.createElement("button");
      const isAvailable = available.has(time);

      button.className = isAvailable
        ? "time-button available"
        : "time-button busy";
      button.innerHTML = isAvailable
        ? `<strong>${escapeHtml(time)}</strong><small>Вільно</small>`
        : `<strong>${escapeHtml(time)}</strong><small>Зайнято</small>`;

      if (!isAvailable) {
        button.disabled = true;
      } else {
        button.addEventListener("click", async () => {
          booking.time = time;

          document.querySelectorAll(".time-button").forEach(item => {
            item.classList.remove("selected");
          });
          button.classList.add("selected");

          if (bookingFlowMode !== "reschedule") {
            renderSummary();
            showScreen("details-screen");
            return;
          }

          const confirmButton =
            document.querySelector("#reschedule-confirm-button");

          if (confirmButton) {
            confirmButton.hidden = false;
            confirmButton.disabled = false;
            confirmButton.textContent =
              `Підтвердити перенесення · ${booking.time}`;
          }

          status.className = "time-status success";
          status.textContent =
            `Обрано ${booking.time}. Натисніть «Підтвердити перенесення».`;
        });
      }

      grid.appendChild(button);
    });

    if (available.size) {
      status.className = "time-status success";
      status.textContent =
        `Вільних варіантів: ${available.size}. Зайнятий час позначено сірим.`;
    } else {
      status.className = "time-status warning";
      status.textContent = "Усі доступні години вже зайняті. Оберіть іншу дату.";
    }
  } catch (error) {
    console.error("Availability API error:", error);
    status.className = "time-status warning";
    status.textContent = "Не вдалося завантажити актуальний розклад.";
    showAppAlert(error.message);
  }
}

function renderSummary() {
  const summary = document.querySelector("#booking-summary");
  const submitButton = document.querySelector("#booking-submit-button");
  const visitModeRow =
    booking.visitMode !== "standard"
      ? `<div class="review-detail-row visit-mode-summary"><span>🌿 Комфорт</span><strong>${escapeHtml(visitModeLabel(booking.visitMode))}</strong></div>`
      : "";

  if (summary) {
    summary.innerHTML =
      `<div class="review-main-row">` +
        `<div class="review-service-icon">✦</div>` +
        `<div><small>Послуга</small><strong>${escapeHtml(booking.service)}</strong></div>` +
        `<strong class="review-price">${escapeHtml(booking.price)}</strong>` +
      `</div>` +
      `<div class="review-detail-row"><span>👩‍🎨 Майстер</span><strong>${escapeHtml(booking.master)}</strong></div>` +
      `<div class="review-detail-row"><span>📅 Дата</span><strong>${escapeHtml(booking.date)}</strong></div>` +
      `<div class="review-detail-row"><span>🕒 Час</span><strong>${escapeHtml(booking.time)}</strong></div>` +
      `<div class="review-detail-row"><span>⏳ Тривалість</span><strong>${escapeHtml(booking.duration)}</strong></div>` +
      visitModeRow;
  }

  if (submitButton) {
    submitButton.textContent = booking.price
      ? `Підтвердити запис · ${booking.price}`
      : "Підтвердити запис";
  }

  const profileName = getSavedProfileName();
  const nameInput = document.querySelector("#client-name");

  if (profileName && !nameInput.value.trim()) {
    nameInput.value = profileName;
  }
}

document.querySelector("#booking-form").addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    const form = event.currentTarget;
    const submitButton =
      event.submitter ||
      form.querySelector('button[type="submit"], input[type="submit"]');

    const name = document.querySelector("#client-name").value.trim();
    const phone = document.querySelector("#client-phone").value.trim();
    const tg = getTelegramWebApp();
    const initData = getInitData();

    if (name.length < 2 || phone.replace(/\D/g, "").length < 10) {
      showAppAlert("Перевірте ім’я та номер телефону");
      return;
    }

    if (
      !booking.master ||
      !booking.service ||
      !booking.date ||
      !booking.time
    ) {
      showAppAlert("Заповніть усі дані запису");
      return;
    }

    if (!initData) {
      showAppAlert(
        "Для справжнього запису відкрийте Mini App через Telegram-бота."
      );
      return;
    }

    const originalButtonText =
      submitButton?.tagName === "INPUT"
        ? submitButton.value
        : submitButton?.textContent;

    if (submitButton) {
      submitButton.disabled = true;

      if (submitButton.tagName === "INPUT") {
        submitButton.value = "Створюємо запис…";
      } else {
        submitButton.textContent = "Створюємо запис…";
      }
    }

    try {
      const responseData = await apiPost("/api/bookings", {
        client_name: name,
        client_phone: phone,
        service: booking.service,
        master: booking.master,
        booking_date: booking.date,
        booking_time: booking.time,
        visit_mode: booking.visitMode,
        init_data: initData,
      });

      const result = {
        ...booking,
        name,
        phone,
        bookingId: responseData.booking_id,
        status: responseData.status || "new",
        createdAt: new Date().toISOString(),
      };

      saveBooking(result);
      activeClientBookings = [
        result,
        ...activeClientBookings.filter(
          item => String(item.bookingId) !== String(result.bookingId)
        ),
      ];
      preferredProfileBookingId = responseData.booking_id;
      saveProfileName(name);
      savePhone(phone);
      renderClientProfile();

      const successTitle = document.querySelector("#success-title");
      const successDescription = document.querySelector("#success-description");
      const successTicket = document.querySelector("#success-booking-ticket");

      if (successTitle) {
        successTitle.textContent = `Чудово, ${name}!`;
      }

      if (successDescription) {
        successDescription.innerHTML =
          `Заявка <strong>№${responseData.booking_id}</strong> успішно створена. ` +
          `Залишився лише короткий крок — підтвердження від адміністратора.`;
      }

      if (successTicket) {
        successTicket.innerHTML =
          `<div class="success-ticket-top">` +
            `<div><small>Послуга</small><strong>${escapeHtml(booking.service)}</strong></div>` +
            `<strong class="success-ticket-price">${escapeHtml(booking.price)}</strong>` +
          `</div>` +
          `<div class="success-ticket-row"><span>👩‍🎨 Майстер</span><strong>${escapeHtml(booking.master)}</strong></div>` +
          `<div class="success-ticket-row"><span>📅 Дата</span><strong>${escapeHtml(booking.date)}</strong></div>` +
          `<div class="success-ticket-row"><span>🕒 Час</span><strong>${escapeHtml(booking.time)}</strong></div>` +
          `<div class="success-ticket-row"><span>⏳ Тривалість</span><strong>${escapeHtml(booking.duration)}</strong></div>` +
          (booking.visitMode !== "standard"
            ? `<div class="success-ticket-row"><span>🌿 Комфорт</span><strong>${escapeHtml(visitModeLabel(booking.visitMode))}</strong></div>`
            : "");
      }

      tg?.HapticFeedback?.notificationOccurred("success");
      showScreen("success-screen");
    } catch (error) {
      console.error("Booking API error:", error);
      tg?.HapticFeedback?.notificationOccurred("error");
      showAppAlert(error.message);

      if (error.status === 409) {
        showScreen("time-screen");
        await renderTimes();
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;

        if (submitButton.tagName === "INPUT") {
          submitButton.value = originalButtonText || "Підтвердити запис";
        } else {
          submitButton.textContent =
            originalButtonText ||
            (booking.price
              ? `Підтвердити запис · ${booking.price}`
              : "Підтвердити запис");
        }
      }
    }
  }
);


let selectedLateMinutes = null;

function renderLateArrivalScreen() {
  const savedBooking = getSavedBooking();
  const summary = document.querySelector("#late-arrival-summary");
  const submit = document.querySelector("#late-arrival-submit");
  const message = document.querySelector("#late-arrival-message");

  selectedLateMinutes = null;

  document.querySelectorAll("[data-late-minutes]").forEach(button => {
    button.classList.remove("selected");
  });

  if (submit) {
    submit.disabled = true;
    submit.textContent = "Повідомити салон";
  }

  if (message) {
    message.value = "";
  }

  if (summary && savedBooking) {
    summary.innerHTML =
      `<strong>${escapeHtml(savedBooking.service)}</strong><br>` +
      `${escapeHtml(savedBooking.date)} о ${escapeHtml(savedBooking.time)}`;
  }
}

document.querySelector("#late-arrival-button").addEventListener(
  "click",
  () => {
    const savedBooking = getSavedBooking();

    if (!savedBooking?.bookingId) {
      showAppAlert("Активний запис не знайдено.");
      return;
    }

    if (savedBooking.status !== "confirmed") {
      showAppAlert(
        "Повідомити про запізнення можна після підтвердження запису адміністратором."
      );
      return;
    }

    renderLateArrivalScreen();
    showScreen("late-arrival-screen");
  }
);

document.querySelectorAll("[data-late-minutes]").forEach(button => {
  button.addEventListener("click", () => {
    selectedLateMinutes = Number(button.dataset.lateMinutes);

    document.querySelectorAll("[data-late-minutes]").forEach(item => {
      item.classList.toggle("selected", item === button);
    });

    document.querySelector("#late-arrival-submit").disabled = false;
    getTelegramWebApp()?.HapticFeedback?.selectionChanged?.();
  });
});

document.querySelector("#late-arrival-form").addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    const savedBooking = getSavedBooking();
    const initData = getInitData();
    const submit = document.querySelector("#late-arrival-submit");
    const message = document.querySelector("#late-arrival-message").value.trim();

    if (!savedBooking?.bookingId) {
      showAppAlert("Активний запис не знайдено.");
      return;
    }

    if (!selectedLateMinutes) {
      showAppAlert("Оберіть приблизний час запізнення.");
      return;
    }

    if (!initData) {
      showAppAlert("Ця функція доступна лише всередині Telegram.");
      return;
    }

    const oldText = submit.textContent;
    submit.disabled = true;
    submit.textContent = "Надсилаємо…";

    try {
      const result = await apiPost(
        `/api/bookings/${savedBooking.bookingId}/late`,
        {
          init_data: initData,
          minutes: selectedLateMinutes,
          message,
        }
      );

      getTelegramWebApp()?.HapticFeedback?.notificationOccurred("success");

      if (result.master_notified) {
        showAppAlert(
          `Готово. Адміністратор і майстер отримали повідомлення про запізнення на ${selectedLateMinutes} хв.`
        );
      } else {
        showAppAlert(
          `Готово. Адміністратор отримав повідомлення про запізнення на ${selectedLateMinutes} хв і бачить, якого майстра потрібно попередити.`
        );
      }

      showScreen("client-profile-screen");
    } catch (error) {
      getTelegramWebApp()?.HapticFeedback?.notificationOccurred("error");
      showAppAlert(error.message);
      await syncClientBookings();
    } finally {
      submit.disabled = false;
      submit.textContent = oldText;
    }
  }
);


document.querySelector("#cancel-booking-button").addEventListener(
  "click",
  async event => {
    const savedBooking = getSavedBooking();
    const initData = getInitData();

    if (!savedBooking?.bookingId) {
      showAppAlert("Активний запис не знайдено.");
      return;
    }

    if (!initData) {
      showAppAlert("Скасування доступне лише всередині Telegram.");
      return;
    }

    const button = event.currentTarget;

    const confirmed = await askConfirmation(
      `Скасувати запис №${savedBooking.bookingId} на ${savedBooking.date} о ${savedBooking.time}?`
    );

    if (!confirmed) return;

    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "Скасовуємо…";

    try {
      await apiPost(`/api/bookings/${savedBooking.bookingId}/cancel`, {
        init_data: initData,
      });

      saveBooking(null);
      getTelegramWebApp()?.HapticFeedback?.notificationOccurred("success");
      await syncClientBookings();
      showAppAlert("Запис скасовано. Адміністратор уже отримав повідомлення.");
    } catch (error) {
      getTelegramWebApp()?.HapticFeedback?.notificationOccurred("error");
      showAppAlert(error.message);
      await syncClientBookings();
    } finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  }
);

document.querySelector("#reschedule-confirm-button")?.addEventListener(
  "click",
  async event => {
    const savedBooking = getSavedBooking();
    const initData = getInitData();
    const submit = event.currentTarget;
    const status = document.querySelector("#time-status");

    if (
      !savedBooking?.bookingId ||
      !rescheduleBookingId ||
      !booking.date ||
      !booking.time ||
      !initData
    ) {
      showAppAlert("Оберіть нову дату та час для перенесення.");
      return;
    }

    const oldText = submit.textContent;
    submit.disabled = true;
    submit.textContent = "Переносимо…";

    const timeButtons = document.querySelectorAll(".time-button");
    timeButtons.forEach(item => {
      item.disabled = true;
    });

    if (status) {
      status.className = "time-status loading";
      status.textContent = "Переносимо запис…";
    }

    try {
      const responseData = await apiPost(
        `/api/bookings/${rescheduleBookingId}/reschedule`,
        {
          booking_date: booking.date,
          booking_time: booking.time,
          init_data: initData,
        }
      );

      preferredProfileBookingId = responseData.booking_id;
      getTelegramWebApp()?.HapticFeedback?.notificationOccurred("success");

      const movedId = responseData.booking_id;
      resetBookingFlow();
      preferredProfileBookingId = movedId;

      await syncClientBookings();
      showScreen("client-profile-screen");
      showAppAlert(
        "Запис перенесено. Новий час очікує підтвердження адміністратора."
      );
    } catch (error) {
      console.error("Reschedule API error:", error);
      getTelegramWebApp()?.HapticFeedback?.notificationOccurred("error");
      showAppAlert(error.message);

      if (error.status === 409) {
        await renderTimes();
      } else {
        timeButtons.forEach(item => {
          item.disabled = false;
        });
        submit.disabled = false;
        submit.textContent = oldText;

        if (status) {
          status.className = "time-status success";
          status.textContent =
            `Обрано ${booking.time}. Натисніть «Підтвердити перенесення».`;
        }
      }
    }
  }
);


document.querySelector("#reschedule-booking-button").addEventListener(
  "click",
  () => {
    const savedBooking = getSavedBooking();

    if (
      !savedBooking?.bookingId ||
      !["new", "confirmed"].includes(savedBooking.status || "new")
    ) {
      showAppAlert("Цей запис уже не можна перенести.");
      return;
    }

    const masterEntry = Object.entries(masters).find(
      ([, master]) => master.name === savedBooking.master
    );

    if (!masterEntry) {
      showAppAlert("Не вдалося знайти майстра для перенесення.");
      return;
    }

    const [masterKey] = masterEntry;

    rescheduleBookingId = savedBooking.bookingId;
    setBookingFlowMode("reschedule");

    activeMasterKey = masterKey;
    booking.masterKey = masterKey;
    booking.master = savedBooking.master;
    booking.service = savedBooking.service;
    booking.price = savedBooking.price;
    booking.duration = savedBooking.duration;
    booking.date = "";
    booking.time = "";

    document.querySelector("#date-summary").innerHTML =
      `<strong>Запис №${escapeHtml(savedBooking.bookingId)} · ${escapeHtml(booking.service)}</strong><br>` +
      `${escapeHtml(booking.master)}<br>` +
      `Було: ${escapeHtml(savedBooking.date)} о ${escapeHtml(savedBooking.time)}`;

    currentMonth = new Date();
    currentMonth.setDate(1);
    renderCalendar();
    showScreen("date-screen");
  }
);


document.querySelector("#repeat-booking-button").addEventListener(
  "click",
  () => {
    const savedBooking = getSavedBooking();
    if (!savedBooking) return;

    rescheduleBookingId = null;
    setBookingFlowMode("new");

    const masterEntry = Object.entries(masters).find(
      ([, master]) => master.name === savedBooking.master
    );

    if (!masterEntry) {
      showAppAlert("Не вдалося знайти майстра для повторного запису.");
      return;
    }

    const [masterKey] = masterEntry;
    activeMasterKey = masterKey;
    booking.masterKey = masterKey;
    booking.master = savedBooking.master;
    booking.service = savedBooking.service;
    booking.price = savedBooking.price;
    booking.duration = savedBooking.duration;
    booking.date = "";
    booking.time = "";

    document.querySelector("#selected-master-chip").textContent =
      `Обрано: ${booking.master}`;
    document.querySelector("#date-summary").innerHTML =
      `<strong>${escapeHtml(booking.master)}</strong><br>` +
      `${escapeHtml(booking.service)} · ${escapeHtml(booking.price)} · ${escapeHtml(booking.duration)}`;

    currentMonth = new Date();
    currentMonth.setDate(1);
    renderCalendar();
    showScreen("date-screen");
  }
);

document.querySelector("#profile-setup-form").addEventListener(
  "submit",
  event => {
    event.preventDefault();

    const input = document.querySelector("#profile-name-input");
    const name = input.value.trim();

    if (name.length < 2) {
      showAppAlert("Введіть ім’я щонайменше з двох символів");
      return;
    }

    saveProfileName(name);
    renderClientProfile();
    showScreen("client-profile-screen");
  }
);

document.querySelector("#edit-profile-name").addEventListener(
  "click",
  () => {
    setProfileSetupMode("edit");
    document.querySelector("#profile-name-input").value =
      getSavedProfileName();
    showScreen("profile-setup-screen");
  }
);

document.querySelector("#home-favorites-button").addEventListener(
  "click",
  () => showScreen("favorites-screen")
);

document.querySelector("#favorite-masters-button").addEventListener(
  "click",
  () => showScreen("favorites-screen")
);

document.querySelector("#notifications-button").addEventListener(
  "click",
  () => {
    showAppAlert(
      "Підтвердження, зміни запису та автоматичні нагадування перед візитом приходять у Telegram."
    );
  }
);

document.querySelector("#address-button").addEventListener(
  "click",
  () => openExternal(SALON_MAP_URL)
);

function prefillCallbackPhone() {
  const input = document.querySelector("#callback-phone");
  if (!input || input.value.trim()) return;

  const savedBooking = getSavedBooking();
  const phone = getSavedPhone() || savedBooking?.phone || "";

  if (phone) {
    input.value = phone;
  }
}

document.querySelector("#save-contact-button")?.addEventListener(
  "click",
  async event => {
    const initData = getInitData();

    if (!initData) {
      showAppAlert("Збереження контакту доступне лише всередині Telegram.");
      return;
    }

    const button = event.currentTarget;
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "Надсилаємо контакт…";

    try {
      await apiPost("/api/contact/save", {
        init_data: initData,
      });

      const tg = getTelegramWebApp();
      tg?.HapticFeedback?.notificationOccurred("success");

      const message =
        `Контакт ${SALON_NAME} надіслано в чат з ботом. ` +
        "Натисніть на картку контакту, щоб додати її в телефон.";

      if (tg?.showAlert) {
        tg.showAlert(message, () => tg.close());
      } else {
        window.alert(message);
      }
    } catch (error) {
      getTelegramWebApp()?.HapticFeedback?.notificationOccurred("error");
      showAppAlert(error.message);
      button.disabled = false;
      button.textContent = oldText;
    }
  }
);

document.querySelector("#request-callback-button")?.addEventListener(
  "click",
  async event => {
    const initData = getInitData();
    const phoneInput = document.querySelector("#callback-phone");
    const phone = phoneInput?.value.trim() || "";

    if (!initData) {
      showAppAlert("Запит на дзвінок доступний лише всередині Telegram.");
      return;
    }

    if (phone.replace(/\D/g, "").length < 10) {
      showAppAlert("Вкажіть номер телефону, на який вам передзвонити.");
      phoneInput?.focus();
      return;
    }

    const button = event.currentTarget;
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "Надсилаємо…";

    try {
      await apiPost("/api/contact/callback", {
        init_data: initData,
        client_phone: phone,
      });

      savePhone(phone);
      getTelegramWebApp()?.HapticFeedback?.notificationOccurred("success");
      showAppAlert(
        `Готово. Адміністратор передзвонить вам на ${phone}.`
      );
    } catch (error) {
      getTelegramWebApp()?.HapticFeedback?.notificationOccurred("error");
      showAppAlert(error.message);
    } finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  }
);

document.querySelector("#telegram-phone-button")?.addEventListener(
  "click",
  event => {
    const tg = getTelegramWebApp();

    if (!tg?.requestContact) {
      showAppAlert("Ця версія Telegram не підтримує передачу номера акаунта.");
      return;
    }

    const button = event.currentTarget;
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "Очікуємо підтвердження…";

    tg.requestContact(shared => {
      button.disabled = false;
      button.textContent = oldText;

      if (shared) {
        tg.HapticFeedback?.notificationOccurred("success");
        showAppAlert(
          "Готово. Telegram-номер передано салону."
        );
      } else {
        tg.HapticFeedback?.notificationOccurred("warning");
      }
    });
  }
);

async function bootstrapApp() {
  try {
    await loadSalonConfig();
  } catch (error) {
    console.error("Salon config error:", error);
    showConfigFailure(
      error.message ||
      "Перевірте файл salon_config.json і спробуйте ще раз."
    );
    return;
  }

  const startup = document.querySelector("#app-startup");
  if (startup) startup.hidden = true;
  document.body.classList.remove("config-loading");

  renderClientProfile();
  renderFavorites();

  const telegramWebApp = getTelegramWebApp();

  if (telegramWebApp) {
    telegramWebApp.ready();
    telegramWebApp.expand();
    telegramWebApp.disableVerticalSwipes?.();

    try {
      const pageColor = salonConfig?.theme?.page || "#f8f5f6";
      telegramWebApp.setHeaderColor?.(pageColor);
      telegramWebApp.setBackgroundColor?.(pageColor);
    } catch {
      // Старі версії Telegram можуть не підтримувати ці методи.
    }

    document.body.style.backgroundColor =
      salonConfig?.theme?.page || "#f8f5f6";
    syncClientBookings();
  }

  checkApiHealth();
}

document.querySelector("#app-startup-retry")?.addEventListener(
  "click",
  () => window.location.reload()
);

document.querySelector("#server-status-retry")?.addEventListener(
  "click",
  () => checkApiHealth()
);

window.addEventListener("focus", () => {
  if (salonConfig) {
    checkApiHealth();
    syncClientBookings();
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && salonConfig) {
    checkApiHealth();
    syncClientBookings();
  }
});

bootstrapApp();
