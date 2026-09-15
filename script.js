/* =========================================
   ANNA UNIVERSITY RESULT SERVER MONITOR
   ========================================= */

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


/* =========================================
   ELEMENTS
========================================= */

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

    let status = "OFFLINE";
    let statusClass = "down";
    let ping = null;

    try {

        /*
         * The Anna University server is cross-origin.
         * no-cors allows us to determine whether the
         * browser request completed successfully.
         */

        await fetch(
            server.url,
            {
                mode: "no-cors",
                cache: "no-store"
            }
        );

        ping = Math.round(
            performance.now() - start
        );

        status = "ONLINE";

        statusClass =
            ping > 3000
                ? "slow"
                : "online";

    } catch (error) {

        status = "OFFLINE";

        statusClass = "down";

        ping = null;

    }

    return {
        ...server,
        status,
        statusClass,
        ping
    };
}


/* =========================================
   CHECK ALL SERVERS
========================================= */

async function checkServers(manual = false) {

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

        const results = [];

        for (const server of servers) {

            const result =
                await checkServer(server);

            results.push(result);
        }

        renderServers(results);

        updateSummary(results);

        updateHistory(results);

        updateLastChecked();

        resetCountdown();

    } catch (error) {

        console.error(
            "Server monitoring error:",
            error
        );

    } finally {

        elements.loading.textContent =
            "Monitoring automatically every 30 seconds";

        elements.checkButton.disabled = false;

        elements.checkButton.innerHTML =
            "<span>↻</span> Check Server Now";

        isChecking = false;
    }
}


/* =========================================
   RENDER SERVER CARDS
========================================= */

function renderServers(results) {

    elements.container.innerHTML = "";

    results.forEach((server, index) => {

        const card =
            document.createElement("div");

        card.className =
            `server-card ${
                server.statusClass === "down"
                    ? "down"
                    : ""
            }`;

        const pingText =
            server.ping === null
                ? "--"
                : `${server.ping} ms`;

        const connectionText =
            server.status === "ONLINE"
                ? "Available"
                : "Unavailable";

        card.style.animationDelay =
            `${index * 0.08}s`;

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
   UPDATE SUMMARY
========================================= */

function updateSummary(results) {

    const onlineServers =
        results.filter(
            server => server.status === "ONLINE"
        );

    const allOnline =
        onlineServers.length === results.length;


    /* Overall Status */

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


    /* Average Response */

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
   RESPONSE HISTORY
========================================= */

function updateHistory(results) {

    results.forEach(server => {

        historyData.push({

            ping: server.ping,

            status: server.status,

            time: new Date()

        });
    });


    /*
     * Keep only the latest 10 checks.
     */

    historyData =
        historyData.slice(-10);

    renderHistory();
}


/* =========================================
   RENDER HISTORY
========================================= */

function renderHistory() {

    if (historyData.length === 0) {

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
        Math.max(
            1000,
            ...pings
        );


    historyData.forEach(item => {

        const bar =
            document.createElement("div");

        let height = 30;


        if (item.ping !== null) {

            height =
                Math.max(
                    30,
                    Math.min(
                        100,
                        (item.ping / maxPing) * 100
                    )
                );
        }


        bar.className =
            `history-bar ${
                item.status === "OFFLINE"
                    ? "down"
                    : ""
            }`;


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

    secondsUntilNextCheck =
        CHECK_INTERVAL;

    startCountdown();
}


function startCountdown() {

    clearInterval(countdownTimer);

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


/* =========================================
   DARK / LIGHT MODE
========================================= */

function setupTheme() {

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
   HTML SECURITY
========================================= */

function escapeHtml(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
}


/* =========================================
   PAGE VISIBILITY
========================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        /*
         * When returning to the page,
         * immediately perform a fresh check.
         */

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
   START MONITOR
========================================= */

setupTheme();

checkServers();
