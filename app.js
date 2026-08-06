
const API_BASE_URL =
  "https://logistics-sacramento-php-chubby.trycloudflare.com";

const masters = {
  nails: {
    name: "Майстер нігтьового сервісу",
    specialty: "Манікюр · Педикюр · Nail-дизайн",
    services: ["Манікюр", "Педикюр"],
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

function getTelegramWebApp() {
  return window.Telegram?.WebApp || null;
}

function showAppAlert(message) {
  const tg = getTelegramWebApp();

  if (tg?.showAlert) {
    tg.showAlert(message);
  } else {
    window.alert(message);
  }
}

function apiErrorMessage(status, responseData) {
  if (status === 401) {
    return (
      "Не вдалося підтвердити Telegram-сесію. " +
      "Закрийте Mini App і відкрийте його знову через бота."
    );
  }

  if (status === 409) {
    return (
      "Цей час щойно зайняли. Поверніться до вибору часу " +
      "та оберіть інший варіант."
    );
  }

  if (status === 422) {
    const detail = responseData?.detail;

    if (detail === "This master does not provide the selected service.") {
      return "Обраний майстер не виконує цю послугу.";
    }

    if (detail === "Unknown service." || detail === "Unknown master.") {
      return "Не вдалося розпізнати послугу або майстра.";
    }

    return "Перевірте дані запису та спробуйте ще раз.";
  }

  return (
    responseData?.detail ||
    "Не вдалося створити запис. Спробуйте ще раз."
  );
}

function updateServiceAvailability(masterKey) {
  const allowedServices = masters[masterKey]?.services || [];

  document.querySelectorAll(".service-card").forEach(card => {
    const isAvailable = allowedServices.includes(card.dataset.service);
    card.hidden = !isAvailable;
    card.disabled = !isAvailable;
  });
}

function getSavedBooking() {
  try {
    return JSON.parse(localStorage.getItem("beautyStudioLastBooking") || "null");
  } catch {
    return null;
  }
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

function getDisplayUser() {
  const telegramUser = getTelegramUser();
  const savedName = getSavedProfileName();

  return {
    name: savedName,
    username: telegramUser?.username
      ? `@${telegramUser.username}`
      : "Telegram username з’явиться після підключення",
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
    element.textContent = user.name.trim().charAt(0).toUpperCase() || "B";
  }
}

function renderClientProfile() {
  const user = getDisplayUser();
  const savedBooking = getSavedBooking();
  const favorites = JSON.parse(
    localStorage.getItem("beautyStudioFavorites") || "[]"
  );

  document.querySelector("#home-greeting").textContent =
    greetingByTime(user.name);
  document.querySelector("#client-profile-name").textContent =
    user.name || "Профіль не налаштовано";
  document.querySelector("#client-profile-username").textContent =
    user.username;
  document.querySelector("#favorite-count").textContent = favorites.length;

  renderAvatar(document.querySelector("#home-avatar"), user);
  renderAvatar(document.querySelector("#client-avatar"), user);

  const card = document.querySelector("#next-booking-card");
  const actions = document.querySelector("#profile-booking-actions");

  if (!savedBooking) {
    card.innerHTML = `
      <div class="empty-booking-state">
        <span>📅</span>
        <strong>Записів поки немає</strong>
        <p>Оберіть майстра та зручний час.</p>
      </div>`;
    actions.style.display = "none";
    return;
  }

  card.innerHTML = `
    <div class="booking-ticket-top">
      <span>Beauty Studio</span>
      <span class="status-pill">Очікує підтвердження</span>
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
  actions.style.display = "grid";
}

const screens = document.querySelectorAll(".screen");
const navItems = document.querySelectorAll(".nav-item");
const historyStack = ["home-screen"];
const booking = {master:"",service:"",price:"",duration:"",date:"",time:""};
let currentMonth = new Date();
currentMonth.setDate(1);
let activeMasterKey = null;

function showScreen(id, add = true) {
  screens.forEach(s => s.classList.toggle("active", s.id === id));
  if (add && historyStack.at(-1) !== id) historyStack.push(id);
  navItems.forEach(i => i.classList.toggle("active-nav", i.dataset.open === id));
  window.scrollTo({top: 0, behavior: "smooth"});
}

document.querySelectorAll("[data-open]").forEach(button => {
  button.addEventListener("click", () => {
    const target = button.dataset.open;

    if (
      target === "client-profile-screen"
      && !getSavedProfileName()
    ) {
      showScreen("profile-setup-screen");
      return;
    }

    showScreen(target);
  });
});
document.querySelectorAll("[data-back]").forEach(b => b.addEventListener("click", () => {
  if (historyStack.length > 1) historyStack.pop();
  showScreen(historyStack.at(-1), false);
}));

function openMasterProfile(key) {
  const master = masters[key];
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
    .map(src => `<img src="${src}" alt="Робота майстра">`).join("");
  const favorites = JSON.parse(
    localStorage.getItem("beautyStudioFavorites") || "[]"
  );
  document.querySelector("#profile-like").textContent =
    favorites.includes(key) ? "♥" : "♡";

  showScreen("master-profile-screen");
}

document.querySelectorAll(".profile-open").forEach(btn => {
  btn.addEventListener("click", () => openMasterProfile(btn.dataset.masterKey));
});

document.querySelector("#profile-like").addEventListener("click", e => {
  const favorites = JSON.parse(
    localStorage.getItem("beautyStudioFavorites") || "[]"
  );
  const index = favorites.indexOf(activeMasterKey);

  if (index === -1) {
    favorites.push(activeMasterKey);
    e.currentTarget.textContent = "♥";
  } else {
    favorites.splice(index, 1);
    e.currentTarget.textContent = "♡";
  }

  localStorage.setItem(
    "beautyStudioFavorites",
    JSON.stringify(favorites)
  );
  renderClientProfile();
});

document.querySelector("#profile-book-button").addEventListener("click", () => {
  const master = masters[activeMasterKey];
  booking.master = master.name;
  booking.service = "";
  booking.price = "";
  booking.duration = "";

  updateServiceAvailability(activeMasterKey);

  document.querySelector("#selected-master-chip").textContent =
    `Обрано: ${booking.master}`;
  showScreen("services-screen");
});

document.querySelectorAll(".service-card").forEach(btn => btn.addEventListener("click", () => {
  booking.service = btn.dataset.service;
  booking.price = btn.dataset.price;
  booking.duration = btn.dataset.duration;
  document.querySelector("#date-summary").innerHTML = `<strong>${booking.master}</strong><br>${booking.service} · ${booking.price} · ${booking.duration}`;
  renderCalendar();
  showScreen("date-screen");
}));

const monthNames = ["Січень","Лютий","Березень","Квітень","Травень","Червень","Липень","Серпень","Вересень","Жовтень","Листопад","Грудень"];

function renderCalendar() {
  const grid = document.querySelector("#calendar-grid");
  grid.innerHTML = "";
  document.querySelector("#calendar-month").textContent = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
  const firstDay = (currentMonth.getDay() + 6) % 7;
  const days = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const today = new Date();
  today.setHours(0,0,0,0);

  for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement("span"));

  for (let d = 1; d <= days; d++) {
    const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
    const btn = document.createElement("button");
    btn.className = "calendar-day";
    btn.textContent = d;

    if (dateObj < today) {
      btn.classList.add("disabled");
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".calendar-day").forEach(x => x.classList.remove("selected"));
        btn.classList.add("selected");
        booking.date = dateObj.toLocaleDateString("uk-UA");
        setTimeout(() => {
          renderTimes();
          showScreen("time-screen");
        }, 180);
      });
    }
    grid.appendChild(btn);
  }
}

document.querySelector("#previous-month").addEventListener("click", () => {
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  renderCalendar();
});
document.querySelector("#next-month").addEventListener("click", () => {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  renderCalendar();
});

function renderTimes() {
  document.querySelector("#time-summary").innerHTML = `<strong>${booking.date}</strong><br>${booking.master}<br>${booking.service}`;
  const grid = document.querySelector("#time-grid");
  grid.innerHTML = "";
  ["09:00","10:00","11:30","13:00","14:30","16:00","17:30","19:00"].forEach(t => {
    const btn = document.createElement("button");
    btn.className = "time-button";
    btn.textContent = t;
    btn.addEventListener("click", () => {
      booking.time = t;
      document.querySelectorAll(".time-button").forEach(x => x.classList.remove("selected"));
      btn.classList.add("selected");
      setTimeout(() => {
        renderSummary();
        showScreen("details-screen");
      }, 180);
    });
    grid.appendChild(btn);
  });
}

function renderSummary() {
  document.querySelector("#booking-summary").innerHTML =
    `<strong>${booking.service}</strong><br>👩‍🎨 ${booking.master}<br>📅 ${booking.date}<br>🕒 ${booking.time}<br>💰 ${booking.price}<br>⏳ ${booking.duration}`;

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
    const initData = tg?.initData || "";

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
      const response = await fetch(
        `${API_BASE_URL}/api/bookings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_name: name,
            client_phone: phone,
            service: booking.service,
            master: booking.master,
            booking_date: booking.date,
            booking_time: booking.time,
            init_data: initData,
          }),
        }
      );

      let responseData = {};

      try {
        responseData = await response.json();
      } catch {
        responseData = {};
      }

      if (!response.ok) {
        throw new Error(
          apiErrorMessage(response.status, responseData)
        );
      }

      const result = {
        ...booking,
        name,
        phone,
        bookingId: responseData.booking_id,
        status: responseData.status || "new",
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(
        "beautyStudioLastBooking",
        JSON.stringify(result)
      );
      saveProfileName(name);
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

      const message =
        error instanceof TypeError
          ? (
              "Немає зв’язку із сервером запису. " +
              "Перевірте, чи запущені API та Cloudflare Tunnel."
            )
          : error.message;

      tg?.HapticFeedback?.notificationOccurred("error");
      showAppAlert(message);
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
  () => {
    if (!getSavedBooking()) return;

    showAppAlert(
      "Онлайн-скасування підключимо наступним етапом. " +
      "Поки зверніться до адміністратора салону."
    );
  }
);

document.querySelector("#repeat-booking-button").addEventListener("click", () => {
  const savedBooking = getSavedBooking();
  if (!savedBooking) return;

  booking.master = savedBooking.master;
  booking.service = savedBooking.service;
  booking.price = savedBooking.price;
  booking.duration = savedBooking.duration;

  document.querySelector("#selected-master-chip").textContent =
    `Обрано: ${booking.master}`;
  document.querySelector("#date-summary").innerHTML =
    `<strong>${booking.master}</strong><br>` +
    `${booking.service} · ${booking.price} · ${booking.duration}`;

  renderCalendar();
  showScreen("date-screen");
});

renderClientProfile();


document.querySelector("#profile-setup-form").addEventListener(
  "submit",
  event => {
    event.preventDefault();

    const input = document.querySelector("#profile-name-input");
    const name = input.value.trim();

    if (name.length < 2) {
      alert("Введіть ім’я щонайменше з двох символів");
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
    document.querySelector("#profile-name-input").value =
      getSavedProfileName();
    showScreen("profile-setup-screen");
  }
);

const telegramWebApp = getTelegramWebApp();

if (telegramWebApp) {
  telegramWebApp.ready();
  telegramWebApp.expand();
  renderClientProfile();
  document.body.style.backgroundColor =
    telegramWebApp.themeParams.bg_color || "#f8f5f6";
}
