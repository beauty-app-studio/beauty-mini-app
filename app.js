
const API_BASE_URL =
  "https://mode-observer-course-procedure.trycloudflare.com";

const masters = {
  nails: {
    name: "Майстер нігтьового сервісу",
    specialty: "Манікюр · Педикюр · Nail-дизайн",
    services: ["Манікюр", "Педикюр"],
    workdays: [1, 2, 3, 4, 5, 6],
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1000&q=88",
    rating: "4.9",
    experience: "7 років",
    clients: "900+",
    about: "Спеціалізується на акуратних формах, делікатному покритті та природному дизайні. Працює уважно, спокійно й завжди пояснює кожний етап процедури.",
    review: "Дуже акуратно, красиво й без поспіху. Саме той результат, який я хотіла.",
    portfolio: [
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=85",
      "https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=800&q=85",
      "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=85"
    ]
  },
  colorist: {
    name: "Стиліст-колорист",
    specialty: "Фарбування · Стрижки · Укладки",
    services: ["Фарбування", "Стрижка", "Укладка"],
    workdays: [0, 2, 3, 4, 5, 6],
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=88",
    rating: "4.8",
    experience: "9 років",
    clients: "1 200+",
    about: "Підбирає колір і форму зачіски під тон шкіри, риси обличчя та спосіб життя. Працює із сучасними техніками фарбування й дбайливим відновленням волосся.",
    review: "Колір вийшов натуральним і дуже дорогим на вигляд. Отримала багато компліментів.",
    portfolio: [
      "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=85",
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=85",
      "https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=800&q=85"
    ]
  },
  universal: {
    name: "Універсальний майстер",
    specialty: "Образ · Догляд · Консультація",
    services: ["Манікюр", "Педикюр", "Фарбування", "Стрижка", "Укладка"],
    workdays: [1, 3, 4, 5, 6],
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1000&q=88",
    rating: "5.0",
    experience: "6 років",
    clients: "700+",
    about: "Допомагає визначитися з процедурою та створює цілісний образ. Добре підходить клієнтам, які хочуть змін, але ще не знають, з чого почати.",
    review: "Я не знала, чого хочу, але майстер усе підібрала і результат перевершив очікування.",
    portfolio: [
      "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=800&q=85",
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=85",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=85"
    ]
  }
};

const SALON_PHONE = "+380671234567";
const SALON_ADDRESS = "Київ, вул. Хрещатик, 1";
const SALON_MAP_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(SALON_ADDRESS);

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

  if (status === 404) {
    return "Запис не знайдено або він уже недоступний.";
  }

  if (status === 409) {
    if (detail === "This booking can no longer be cancelled.") {
      return "Цей запис уже не можна скасувати.";
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

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const networkError = new Error(
      "Немає зв’язку із сервером запису. Перевірте, чи запущені API та Cloudflare Tunnel."
    );
    networkError.cause = error;
    throw networkError;
  }

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
    return JSON.parse(
      localStorage.getItem("beautyStudioFavorites") || "[]"
    );
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
      : "Telegram username відсутній",
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

  if (user.photo) {
    element.innerHTML = `<img src="${user.photo}" alt="${user.name}">`;
  } else {
    element.textContent =
      user.name.trim().charAt(0).toUpperCase() || "B";
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
    status: item.status,
  };
}

let completedVisitCount = 0;
let profileSyncInProgress = false;

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
  if (profileUsername) profileUsername.textContent = user.username;
  if (favoriteCount) favoriteCount.textContent = favorites.length;
  if (visitCount) visitCount.textContent = completedVisitCount;

  renderAvatar(document.querySelector("#home-avatar"), user);
  renderAvatar(document.querySelector("#client-avatar"), user);

  const card = document.querySelector("#next-booking-card");
  const actions = document.querySelector("#profile-booking-actions");

  if (!card || !actions) return;

  if (!savedBooking) {
    card.innerHTML = `
      <div class="empty-booking-state">
        <span>📅</span>
        <strong>Активних записів немає</strong>
        <p>Оберіть майстра та зручний час.</p>
      </div>`;
    actions.style.display = "none";
    return;
  }

  const status = savedBooking.status || "new";

  card.innerHTML = `
    <div class="booking-ticket-top">
      <span>Заявка №${savedBooking.bookingId || "—"}</span>
      <span class="status-pill status-${status}">${statusLabel(status)}</span>
    </div>
    <div class="booking-ticket-service">
      <h3>${savedBooking.service}</h3>
      <p>${savedBooking.master}</p>
    </div>
    <div class="booking-ticket-details">
      <div>
        <small>Дата</small>
        <strong>${savedBooking.date}</strong>
      </div>
      <div>
        <small>Час</small>
        <strong>${savedBooking.time}</strong>
      </div>
      <div>
        <small>Тривалість</small>
        <strong>${savedBooking.duration}</strong>
      </div>
      <div>
        <small>Вартість</small>
        <strong>${savedBooking.price}</strong>
      </div>
    </div>`;

  actions.style.display =
    ["new", "confirmed"].includes(status) ? "grid" : "none";
}

async function syncClientBookings() {
  if (profileSyncInProgress) return;

  const initData = getInitData();
  if (!initData) {
    


renderClientProfile();
    return;
  }

  profileSyncInProgress = true;

  try {
    const data = await apiPost("/api/my-bookings", {
      init_data: initData,
    });

    completedVisitCount = Number(data.completed_count || 0);

    const firstBooking = Array.isArray(data.bookings)
      ? data.bookings[0]
      : null;

    saveBooking(
      firstBooking ? normalizeServerBooking(firstBooking) : null
    );
  } catch (error) {
    console.warn("Profile sync error:", error);
  } finally {
    profileSyncInProgress = false;
    renderClientProfile();
  }
}

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
      <button class="favorite-card" data-favorite-master="${key}">
        <img src="${master.photo}" alt="${master.name}">
        <span>
          <strong>${master.name}</strong>
          <small>${master.specialty}</small>
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
const historyStack = ["home-screen"];
const booking = {
  master: "",
  masterKey: "",
  service: "",
  price: "",
  duration: "",
  date: "",
  time: "",
};

let currentMonth = new Date();
currentMonth.setDate(1);
let activeMasterKey = null;

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

function resetBookingFlow() {
  booking.master = "";
  booking.masterKey = "";
  booking.service = "";
  booking.price = "";
  booking.duration = "";
  booking.date = "";
  booking.time = "";
  activeMasterKey = null;
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


function showScreen(id, add = true) {
  screens.forEach(screen => {
    screen.classList.toggle("active", screen.id === id);
  });

  if (add && historyStack.at(-1) !== id) {
    historyStack.push(id);
  }

  navItems.forEach(item => {
    item.classList.toggle("active-nav", item.dataset.open === id);
  });

  if (id === "favorites-screen") renderFavorites();
  if (id === "client-profile-screen") syncClientBookings();
  if (id === "contacts-screen") prefillCallbackPhone();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-open]").forEach(button => {
  button.addEventListener("click", () => {
    const target = button.dataset.open;

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

    showScreen(target);
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
  document.querySelector("#profile-portfolio").innerHTML = master.portfolio
    .map(src => `<img src="${src}" alt="Робота майстра">`)
    .join("");

  document.querySelector("#profile-like").textContent =
    getFavorites().includes(key) ? "♥" : "♡";

  showScreen("master-profile-screen");
}

document.querySelectorAll(".profile-open").forEach(button => {
  button.addEventListener("click", () => {
    openMasterProfile(button.dataset.masterKey);
  });
});

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
      `<strong>${booking.master}</strong><br>` +
      `${booking.service} · ${booking.price} · ${booking.duration}`;
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
      `<strong>${booking.master}</strong><br>` +
      `${booking.service} · ${booking.price} · ${booking.duration}`;
    renderCalendar();
    showScreen("date-screen");
  });
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

  summary.innerHTML =
    `<strong>${booking.date}</strong><br>` +
    `${booking.master}<br>${booking.service}`;
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
        ? `<strong>${time}</strong><small>Вільно</small>`
        : `<strong>${time}</strong><small>Зайнято</small>`;

      if (!isAvailable) {
        button.disabled = true;
      } else {
        button.addEventListener("click", () => {
          booking.time = time;
          document.querySelectorAll(".time-button").forEach(item => {
            item.classList.remove("selected");
          });
          button.classList.add("selected");
          renderSummary();
          showScreen("details-screen");
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
  document.querySelector("#booking-summary").innerHTML =
    `<strong>${booking.service}</strong><br>` +
    `👩‍🎨 ${booking.master}<br>` +
    `📅 ${booking.date}<br>` +
    `🕒 ${booking.time}<br>` +
    `💰 ${booking.price}<br>` +
    `⏳ ${booking.duration}`;

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
      saveProfileName(name);
      savePhone(phone);
      renderClientProfile();

      document.querySelector("#success-description").innerHTML =
        `${name}, вашу заявку <strong>№${responseData.booking_id}</strong> ` +
        `на <strong>${booking.service}</strong> створено.<br>` +
        `${booking.date} о ${booking.time}<br>` +
        `Майстер: ${booking.master}`;

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
          submitButton.value = originalButtonText || "Записатися";
        } else {
          submitButton.textContent =
            originalButtonText || "Записатися";
        }
      }
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

document.querySelector("#repeat-booking-button").addEventListener(
  "click",
  () => {
    const savedBooking = getSavedBooking();
    if (!savedBooking) return;

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
      `<strong>${booking.master}</strong><br>` +
      `${booking.service} · ${booking.price} · ${booking.duration}`;

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
      "Підтвердження та зміни запису вже приходять у Telegram. Автоматичні нагадування перед візитом додамо окремим етапом."
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
        "Контакт Beauty Studio надіслано в чат з ботом. " +
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


/* v7.10: Telegram/iPhone keyboard focus handling */
const keyboardFieldSelector =
  'input:not([type="hidden"]), textarea, select, [contenteditable="true"]';

function isKeyboardField(element) {
  return Boolean(element?.matches?.(keyboardFieldSelector));
}

function focusFieldIntoView(field = document.activeElement) {
  if (!isKeyboardField(field)) return;

  try {
    field.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  } catch {
    field.scrollIntoView();
  }
}

function scheduleKeyboardFocus(field) {
  setTimeout(() => focusFieldIntoView(field), 80);
  setTimeout(() => focusFieldIntoView(field), 260);
  setTimeout(() => focusFieldIntoView(field), 520);
}

document.addEventListener("focusin", event => {
  if (!isKeyboardField(event.target)) return;

  document.body.classList.add("keyboard-open");
  scheduleKeyboardFocus(event.target);
});

document.addEventListener("focusout", () => {
  setTimeout(() => {
    if (!isKeyboardField(document.activeElement)) {
      document.body.classList.remove("keyboard-open");
    }
  }, 180);
});

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => {
    if (!document.body.classList.contains("keyboard-open")) return;
    focusFieldIntoView();
  });
}

renderClientProfile();
renderFavorites();

const telegramWebApp = getTelegramWebApp();

if (telegramWebApp) {
  telegramWebApp.ready();
  telegramWebApp.expand();

  try {
    telegramWebApp.setHeaderColor?.("#f8f5f6");
    telegramWebApp.setBackgroundColor?.("#f8f5f6");
  } catch {
    // Старі версії Telegram можуть не підтримувати ці методи.
  }

  document.body.style.backgroundColor = "#f8f5f6";
  syncClientBookings();
}

window.addEventListener("focus", () => {
  syncClientBookings();
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) syncClientBookings();
});
