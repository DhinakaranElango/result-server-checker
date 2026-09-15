/* =========================================================
   ANNA UNIVERSITY RESULT SERVER MONITOR
   ========================================================= */

"use strict";


/* =========================================================
   CONFIGURATION
   ========================================================= */

const servers = [
    {
        name: "Anna University Result Server",
        url: "https://coe.annauniv.edu/home/index.php"
    }
];

const CHECK_INTERVAL = 30;       // seconds
const REQUEST_TIMEOUT = 10000;   // milliseconds
const MAX_HISTORY = 10;


/* =========================================================
   STATE
   ========================================================= */

let historyData = [];

let countdown = CHECK_INTERVAL;

let countdownTimer = null;

let isChecking = false;


/* =========================================================
   ELEMENTS
   ========================================================= */

const elements = {
    themeToggle: document.getElementById("themeToggle"),

    checkButton: document.getElementById("checkButton"),

    overallStatus: document.getElementById("overallStatus"),

    overallPing: document.getElementById("overallPing"),

    lastChecked: document.getElementById("lastChecked"),

    nextCheck: document.getElementById("nextCheck"),

    loading: document.getElementById("loading"),

    servers: document.getElementById("servers"),

    history: document.getElementById("history")
};


/* =========================================================
   DARK MODE
   ========================================================= */

function setupTheme() {

    const savedTheme = localStorage.getItem("anna-theme");

    if (savedTheme === "dark") {

        document.body.classList.add("dark");

    }

    updateThemeButton();

}


function updateThemeButton() {

    if (!elements.themeToggle) {
        return;
    }

    if (document.body.classList.contains("dark")) {

        elements.themeToggle.textContent = "☀️";

        elements.themeToggle.setAttribute(
            "aria-label",
            "Switch to light mode"
        );

    } else {

        elements.themeToggle.textContent = "🌙";

        elements.themeToggle.setAttribute(
            "aria-label",
            "Switch to dark mode"
        );
    }
}


function toggleTheme() {

    document.body.classList.toggle("dark");

    const darkMode =
        document.body.classList.contains("dark");

    localStorage.setItem(
        "anna-theme",
        darkMode ? "dark" : "light"
    );

    updateThemeButton();
}


/* =========================================================
   CHECK SINGLE SERVER
   ========================================================= */

async function checkServer(server) {

    const startTime = performance.now();

    const controller = new AbortController();

    const timeout = setTimeout(() => {

        controller.abort();

    }, REQUEST_TIMEOUT);


    try {

        await fetch(
            server.url + "?_=" + Date.now(),
            {
                method: "GET",

                mode: "no-cors",

                cache: "no-store",

                signal: controller.signal
            }
        );


        const responseTime = Math.round(
            performance.now() - startTime
        );

        clearTimeout(timeout);

        return {
            name: server.name,

            url: server.url,

            online: true,

            ping: responseTime
        };

    } catch (error) {

        clearTimeout(timeout);

        return {
            name: server.name,

            url: server.url,

            online: false,

            ping: null,

            error: error.name === "AbortError"
                ? "Request timed out"
                : "Connection failed"
        };
    }
}


/* =========================================================
   CHECK ALL SERVERS
   ========================================================= */

async function checkServers() {

    if (isChecking) {
        return;
    }

    isChecking = true;

    setLoading(true);

    renderChecking();

    try {

        const results = await Promise.all(
            servers.map(server => checkServer(server))
        );

        renderServers(results);

        updateSummary(results);

        updateLastChecked();

        updateHistory(results);

    } catch (error) {

        console.error(
            "Server check error:",
            error
        );

        elements.overallStatus.textContent = "ERROR";

        elements.overallStatus.style.color =
            "var(--danger)";

    } finally {

        isChecking = false;

        setLoading(false);

        resetCountdown();
    }
}


/* =========================================================
   LOADING STATE
   ========================================================= */

function setLoading(loading) {

    if (!elements.loading) {
        return;
    }

    elements.loading.textContent =
        loading
            ? "Checking..."
            : "Auto-check: 30s";


    if (elements.checkButton) {

        elements.checkButton.disabled = loading;

        elements.checkButton.textContent =
            loading
                ? "⏳ Checking..."
                : "🔄 Check Now";
    }
}


/* =========================================================
   CHECKING SERVER UI
   ========================================================= */

function renderChecking() {

    if (!elements.servers) {
        return;
    }

    elements.servers.innerHTML = servers.map(server => {

        return `
            <div class="server-card">

                <div class="server-top">

                    <div class="server-name">
                        ${escapeHtml(server.name)}
                    </div>

                    <div class="status checking">
                        CHECKING
                    </div>

                </div>

                <div class="ping">
                    Checking server response...
                </div>

                <div class="server-url">
                    ${escapeHtml(server.url)}
                </div>

            </div>
        `;

    }).join("");
}


/* =========================================================
   RENDER SERVER RESULTS
   ========================================================= */

function renderServers(results) {

    if (!elements.servers) {
        return;
    }

    elements.servers.innerHTML = results.map(result => {

        const statusClass =
            result.online
                ? "online"
                : "down";

        const statusText =
            result.online
                ? "ONLINE"
                : "OFFLINE";


        const pingText =
            result.online
                ? `Response Time: ${result.ping} ms`
                : `Response Time: -- (${escapeHtml(result.error || "Unavailable")})`;


        return `
            <div class="server-card">

                <div class="server-top">

                    <div class="server-name">
                        ${escapeHtml(result.name)}
                    </div>

                    <div class="status ${statusClass}">
                        ${statusText}
                    </div>

                </div>

                <div class="ping">
                    ${pingText}
                </div>

                <div class="server-url">
                    ${escapeHtml(result.url)}
                </div>

            </div>
        `;

    }).join("");
}


/* =========================================================
   UPDATE SUMMARY
   ========================================================= */

function updateSummary(results) {

    if (!results.length) {
        return;
    }

    const onlineServers =
        results.filter(result => result.online);


    const allOnline =
        onlineServers.length === results.length;


    const anyOnline =
        onlineServers.length > 0;


    /* Overall status */

    if (allOnline) {

        elements.overallStatus.textContent = "ONLINE";

        elements.overallStatus.style.color =
            "var(--success)";

    } else if (anyOnline) {

        elements.overallStatus.textContent =
            "PARTIAL";

        elements.overallStatus.style.color =
            "var(--warning)";

    } else {

        elements.overallStatus.textContent =
            "OFFLINE";

        elements.overallStatus.style.color =
            "var(--danger)";
    }


    /* Average ping */

    const pings =
        onlineServers
            .map(result => result.ping)
            .filter(ping => Number.isFinite(ping));


    if (pings.length > 0) {

        const averagePing =
            Math.round(
                pings.reduce(
                    (sum, ping) => sum + ping,
                    0
                ) / pings.length
            );

        elements.overallPing.textContent =
            averagePing;

    } else {

        elements.overallPing.textContent =
            "--";
    }
}


/* =========================================================
   LAST CHECKED
   ========================================================= */

function updateLastChecked() {

    const now = new Date();

    elements.lastChecked.textContent =
        now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
}


/* =========================================================
   HISTORY
   ========================================================= */

function updateHistory(results) {

    const onlineResults =
        results.filter(result => result.online);


    if (!onlineResults.length) {

        historyData.unshift({
            time: new Date(),
            ping: null,
            online: false
        });

    } else {

        const averagePing =
            Math.round(
                onlineResults.reduce(
                    (sum, result) =>
                        sum + result.ping,
                    0
                ) / onlineResults.length
            );


        historyData.unshift({
            time: new Date(),
            ping: averagePing,
            online: true
        });
    }


    historyData =
        historyData.slice(0, MAX_HISTORY);


    renderHistory();
}


function renderHistory() {

    if (!elements.history) {
        return;
    }

    if (!historyData.length) {

        elements.history.innerHTML = `
            <div class="empty-history">
                No checks completed yet.
            </div>
        `;

        return;
    }


    const validPings =
        historyData
            .filter(item => item.online)
            .map(item => item.ping);


    const maxPing =
        Math.max(
            ...validPings,
            100
        );


    elements.history.innerHTML =
        historyData.map(item => {

            const time =
                item.time.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                });


            if (!item.online) {

                return `
                    <div class="history-item">

                        <div class="history-time">
                            ${time}
                        </div>

                        <div class="history-bar-container">
                            <div
                                class="history-bar"
                                style="width: 5%;">
                            </div>
                        </div>

                        <div class="history-value">
                            OFFLINE
                        </div>

                    </div>
                `;
            }


            const width =
                Math.max(
                    5,
                    Math.min(
                        100,
                        (item.ping / maxPing) * 100
                    )
                );


            return `
                <div class="history-item">

                    <div class="history-time">
                        ${time}
                    </div>

                    <div class="history-bar-container">
                        <div
                            class="history-bar"
                            style="width: ${width}%;">
                        </div>
                    </div>

                    <div class="history-value">
                        ${item.ping} ms
                    </div>

                </div>
            `;

        }).join("");
}


/* =========================================================
   COUNTDOWN
   ========================================================= */

function resetCountdown() {

    countdown = CHECK_INTERVAL;

    updateCountdown();


    if (countdownTimer) {

        clearInterval(countdownTimer);
    }


    countdownTimer =
        setInterval(() => {

            countdown--;

            if (countdown <= 0) {

                countdown = CHECK_INTERVAL;

            }

            updateCountdown();

        }, 1000);
}


function updateCountdown() {

    if (!elements.nextCheck) {
        return;
    }

    elements.nextCheck.textContent =
        `${countdown}s`;
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

if (elements.themeToggle) {

    elements.themeToggle.addEventListener(
        "click",
        toggleTheme
    );
}


if (elements.checkButton) {

    elements.checkButton.addEventListener(
        "click",
        checkServers
    );
}


/* =========================================================
   START
   ========================================================= */

setupTheme();

renderChecking();

resetCountdown();

checkServers();


/* =========================================================
   CHECK WHEN TAB BECOMES VISIBLE
   ========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState === "visible" &&
            !isChecking
        ) {

            checkServers();
        }
    }
);
