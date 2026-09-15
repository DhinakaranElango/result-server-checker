const servers = [
    {
        name: "Result Server",
        url: "https://coe.annauniv.edu/home/index.php"
    }
];

const CHECK_INTERVAL = 30;

let secondsUntilNextCheck = CHECK_INTERVAL;
let countdownTimer = null;
let isChecking = false;
let historyData = [];

const elements = {
    container: document.getElementById("servers"),
    loading: document.getElementById("loading"),
    checkButton: document.getElementById("checkButton"),
    overallStatus: document.getElementById("overallStatus"),
    overallPing: document.getElementById("overallPing"),
    lastChecked: document.getElementById("lastChecked"),
    nextCheck: document.getElementById("nextCheck"),
    history: document.getElementById("history"),
    themeToggle: document.getElementById("themeToggle")
};


/* ================================
   CHECK SERVER
================================ */

async function checkServer(server) {

    const start = performance.now();

    try {

        await fetch(server.url, {
            mode: "no-cors",
            cache: "no-store"
        });

        const ping = Math.round(
            performance.now() - start
        );

        return {
            ...server,
            status: "ONLINE",
            statusClass: ping > 3000 ? "slow" : "online",
            ping
        };

    } catch (error) {

        console.error("Server check failed:", error);

        return {
            ...server,
            status: "OFFLINE",
            statusClass: "down",
            ping: null
        };
    }
}


/* ================================
   CHECK ALL SERVERS
================================ */

async function checkServers() {

    if (isChecking) {
        return;
    }

    isChecking = true;

    elements.checkButton.disabled = true;
    elements.checkButton.innerHTML =
        "<span>⟳</span> Checking...";

    elements.loading.textContent =
        "Checking server connection...";

    try {

        const results = await Promise.all(
            servers.map(checkServer)
        );

        renderServers(results);
        updateSummary(results);
        updateHistory(results);
        updateLastChecked();

    } catch (error) {

        console.error(
            "Monitoring error:",
            error
        );

    } finally {

        elements.loading.textContent =
            "Monitoring automatically every 30 seconds";

        elements.checkButton.disabled = false;

        elements.checkButton.innerHTML =
            "<span>↻</span> Check Server Now";

        isChecking = false;

        resetCountdown();
    }
}


/* ================================
   SERVER CARDS
================================ */

function renderServers(results) {

    elements.container.innerHTML = "";

    results.forEach((server, index) => {

        const card =
            document.createElement("div");

        card.className =
            "server-card " +
            (server.statusClass === "down"
                ? "down"
                : "");

        card.style.animationDelay =
            `${index * 0.08}s`;

        const pingText =
            server.ping === null
                ? "--"
                : `${server.ping} ms`;

        const connectionText =
            server.status === "ONLINE"
                ? "Available"
                : "Unavailable";

        card.innerHTML = `

            <div class="server-top">

                <div>

                    <div class="server-name">
                        ${escapeHtml(server.name)}
                    </div>

                    <div class="server-url">
                        ${escapeHtml(server.url)}
                    </div>

                </div>

                <div class="status ${server.statusClass}">
                    ${server.status}
                </div>

            </div>

            <div class="server-details">

                <div class="detail">

                    <span>Response Time</span>

                    <strong>
                        ${pingText}
                    </strong>

                </div>

                <div class="detail">

                    <span>Connection</span>

                    <strong>
                        ${connectionText}
                    </strong>

                </div>

            </div>
        `;

        elements.container.appendChild(card);
    });
}


/* ================================
   SUMMARY
================================ */

function updateSummary(results) {

    const online =
        results.filter(
            server => server.status === "ONLINE"
        );

    const allOnline =
        online.length === results.length;

    if (allOnline) {

        elements.overallStatus.textContent =
            "ONLINE";

        elements.overallStatus.style.color =
            "var(--success)";

    } else {

        elements.overallStatus.textContent =
            "OFFLINE";

        elements.overallStatus.style.color =
            "var(--danger)";
    }


    const pings =
        online
            .map(server => server.ping)
            .filter(
                ping =>
                    typeof ping === "number"
            );


    if (pings.length) {

        const average =
            Math.round(
                pings.reduce(
                    (sum, value) =>
                        sum + value,
                    0
                ) / pings.length
            );

        elements.overallPing.textContent =
            `${average} ms`;

    } else {

        elements.overallPing.textContent =
            "-- ms";
    }
}


/* ================================
   LAST CHECKED
================================ */

function updateLastChecked() {

    elements.lastChecked.textContent =
        new Date().toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );
}


/* ================================
   HISTORY
================================ */

function updateHistory(results) {

    results.forEach(server => {

        historyData.push({
            ping: server.ping,
            status: server.status,
            time: new Date()
        });

    });

    historyData =
        historyData.slice(-10);

    renderHistory();
}


function renderHistory() {

    if (!historyData.length) {

        elements.history.innerHTML = `
            <div class="history-empty">
                Waiting for the first server check...
            </div>
        `;

        return;
    }

    elements.history.innerHTML = "";

    const pings =
        historyData
            .map(item => item.ping)
            .filter(
                ping =>
                    typeof ping === "number"
            );

    const maxPing =
        Math.max(1000, ...pings);

    historyData.forEach(item => {

        const bar =
            document.createElement("div");

        let height = 30;

        if (item.ping !== null) {

            height = Math.max(
                30,
                Math.min(
                    100,
                    (item.ping / maxPing) * 100
                )
            );
        }

        bar.className =
            "history-bar " +
            (
                item.status === "OFFLINE"
                    ? "down"
                    : ""
            );

        bar.style.setProperty(
            "--height",
            `${height}px`
        );

        const time =
            item.time.toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

        bar.title =
            item.ping === null
                ? `${time} • Offline`
                : `${time} • ${item.ping} ms`;

        bar.innerHTML = `
            <span>
                ${
                    item.ping === null
                        ? "DOWN"
                        : `${item.ping}ms`
                }
            </span>
        `;

        elements.history.appendChild(bar);
    });
}


/* ================================
   COUNTDOWN
================================ */

function resetCountdown() {

    clearInterval(countdownTimer);

    secondsUntilNextCheck =
        CHECK_INTERVAL;

    updateCountdown();

    countdownTimer =
        setInterval(() => {

            secondsUntilNextCheck--;

            updateCountdown();

            if (
                secondsUntilNextCheck <= 0
            ) {

                clearInterval(
                    countdownTimer
                );

                checkServers();
            }

        }, 1000);
}


function updateCountdown() {

    elements.nextCheck.textContent =
        `${secondsUntilNextCheck}s`;
}


/* ================================
   THEME
================================ */

function setupTheme() {

    const savedTheme =
        localStorage.getItem(
            "annaResultTheme"
        );

    if (savedTheme === "dark") {

        document.body.classList.add("dark");

        elements.themeToggle.textContent =
            "☀️";

    } else {

        elements.themeToggle.textContent =
            "🌙";
    }


    elements.themeToggle.addEventListener(
        "click",
        () => {

            const isDark =
                document.body.classList.toggle(
                    "dark"
                );

            localStorage.setItem(
                "annaResultTheme",
                isDark
                    ? "dark"
                    : "light"
            );

            elements.themeToggle.textContent =
                isDark
                    ? "☀️"
                    : "🌙";
        }
    );
}


/* ================================
   ESCAPE HTML
================================ */

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ================================
   MANUAL CHECK BUTTON
================================ */

elements.checkButton.addEventListener(
    "click",
    () => {
        checkServers();
    }
);


/* ================================
   WHEN PAGE BECOMES VISIBLE
================================ */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState ===
            "visible"
        ) {

            if (!isChecking) {
                checkServers();
            }
        }
    }
);


/* ================================
   START
================================ */

setupTheme();

checkServers();
