const servers = [
    {
        name: "Result Server",
        url: "https://coe.annauniv.edu/home/index.php"
    }
];

const CHECK_INTERVAL = 30;
const REQUEST_TIMEOUT = 10000;

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


/* =========================================
   CHECK SERVER
========================================= */

async function checkServer(server) {

    const start = performance.now();

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, REQUEST_TIMEOUT);

    try {

        await fetch(server.url, {
            mode: "no-cors",
            cache: "no-store",
            signal: controller.signal
        });

        const ping = Math.round(
            performance.now() - start
        );

        clearTimeout(timeout);

        return {
            ...server,
            status: "ONLINE",
            statusClass: ping > 3000 ? "slow" : "online",
            ping: ping
        };

    } catch (error) {

        clearTimeout(timeout);

        console.warn(
            "Server check failed:",
            error
        );

        return {
            ...server,
            status: "OFFLINE",
            statusClass: "down",
            ping: null
        };
    }
}


/* =========================================
   CHECK ALL SERVERS
========================================= */

async function checkServers() {

    if (isChecking) {
        return;
    }

    isChecking = true;

    if (elements.checkButton) {
        elements.checkButton.disabled = true;

        elements.checkButton.innerHTML =
            "<span>⟳</span> Checking...";
    }

    if (elements.loading) {
        elements.loading.textContent =
            "Checking server connection...";
    }

    try {

        const results = await Promise.all(
            servers.map(server =>
                checkServer(server)
            )
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

        isChecking = false;

        if (elements.loading) {
            elements.loading.textContent =
                "Monitoring automatically every 30 seconds";
        }

        if (elements.checkButton) {

            elements.checkButton.disabled = false;

            elements.checkButton.innerHTML =
                "<span>↻</span> Check Server Now";
        }

        resetCountdown();
    }
}


/* =========================================
   RENDER SERVER
========================================= */

function renderServers(results) {

    if (!elements.container) {
        return;
    }

    elements.container.innerHTML = "";

    results.forEach((server, index) => {

        const card =
            document.createElement("div");

        card.className =
            "server-card " +
            (
                server.statusClass === "down"
                    ? "down"
                    : ""
            );

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


/* =========================================
   SUMMARY
========================================= */

function updateSummary(results) {

    const onlineServers =
        results.filter(
            server =>
                server.status === "ONLINE"
        );

    const offlineServers =
        results.filter(
            server =>
                server.status === "OFFLINE"
        );


    /* Overall status */

    if (offlineServers.length === 0) {

        elements.overallStatus.textContent =
            "ONLINE";

        elements.overallStatus.style.color =
            "var(--success)";

    } else if (
        onlineServers.length > 0
    ) {

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


    /* Response time */

    const validPings =
        onlineServers
            .map(server => server.ping)
            .filter(
                ping =>
                    typeof ping === "number"
            );


    if (validPings.length > 0) {

        const average =
            Math.round(
                validPings.reduce(
                    (sum, value) =>
                        sum + value,
                    0
                ) / validPings.length
            );

        elements.overallPing.textContent =
            `${average} ms`;

    } else {

        elements.overallPing.textContent =
            "-- ms";
    }
}


/* =========================================
   LAST CHECKED
========================================= */

function updateLastChecked() {

    const now = new Date();

    elements.lastChecked.textContent =
        now.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );
}


/* =========================================
   HISTORY
========================================= */

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

    if (!elements.history) {
        return;
    }

    if (historyData.length === 0) {

        elements.history.innerHTML = `
            <div class="history-empty">
                Waiting for the first server check...
            </div>
        `;

        return;
    }

    elements.history.innerHTML = "";

    const validPings =
        historyData
            .map(item => item.ping)
            .filter(
                ping =>
                    typeof ping === "number"
            );

    const maxPing =
        Math.max(
            1000,
            ...validPings
        );


    historyData.forEach(item => {

        const bar =
            document.createElement("div");

        let height = 30;


        if (
            typeof item.ping === "number"
        ) {

            height =
                Math.max(
                    30,
                    Math.min(
                        100,
                        (
                            item.ping /
                            maxPing
                        ) * 100
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


/* =========================================
   COUNTDOWN
========================================= */

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

    if (!elements.nextCheck) {
        return;
    }

    elements.nextCheck.textContent =
        `${secondsUntilNextCheck}s`;
}


/* =========================================
   DARK MODE
========================================= */

function setupTheme() {

    if (!elements.themeToggle) {
        return;
    }

    const savedTheme =
        localStorage.getItem(
            "annaResultTheme"
        );


    if (savedTheme === "dark") {

        document.body.classList.add(
            "dark"
        );

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


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================
   MANUAL BUTTON
========================================= */

if (elements.checkButton) {

    elements.checkButton.addEventListener(
        "click",
        checkServers
    );
}


/* =========================================
   PAGE VISIBILITY
========================================= */

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


/* =========================================
   START
========================================= */

setupTheme();

checkServers();
