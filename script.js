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


const CHECK_INTERVAL = 30;

const REQUEST_TIMEOUT = 10000;

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

const themeToggle =
    document.getElementById("themeToggle");

const checkButton =
    document.getElementById("checkButton");

const overallStatus =
    document.getElementById("overallStatus");

const overallPing =
    document.getElementById("overallPing");

const lastChecked =
    document.getElementById("lastChecked");

const nextCheck =
    document.getElementById("nextCheck");

const loading =
    document.getElementById("loading");

const serversContainer =
    document.getElementById("servers");

const historyContainer =
    document.getElementById("history");


/* =========================================================
   DARK MODE
   ========================================================= */

function setupTheme() {

    const savedTheme =
        localStorage.getItem("anna-theme");


    if (savedTheme === "dark") {

        document.body.classList.add("dark");

    }


    updateThemeButton();
}


function updateThemeButton() {

    if (!themeToggle) {
        return;
    }


    const dark =
        document.body.classList.contains("dark");


    themeToggle.textContent =
        dark ? "☀️" : "🌙";


    themeToggle.setAttribute(
        "aria-label",
        dark
            ? "Switch to light mode"
            : "Switch to dark mode"
    );
}


function toggleTheme() {

    document.body.classList.toggle("dark");


    const dark =
        document.body.classList.contains("dark");


    localStorage.setItem(
        "anna-theme",
        dark ? "dark" : "light"
    );


    updateThemeButton();
}


/* =========================================================
   CHECK ONE SERVER
   ========================================================= */

async function checkServer(server) {

    const start =
        performance.now();


    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () => controller.abort(),
            REQUEST_TIMEOUT
        );


    try {

        await fetch(
            server.url +
            "?_=" +
            Date.now(),
            {
                method: "GET",
                mode: "no-cors",
                cache: "no-store",
                signal: controller.signal
            }
        );


        clearTimeout(timeout);


        const ping =
            Math.round(
                performance.now() - start
            );


        return {

            name: server.name,

            url: server.url,

            online: true,

            ping: ping

        };


    } catch (error) {

        clearTimeout(timeout);


        return {

            name: server.name,

            url: server.url,

            online: false,

            ping: null,

            error:
                error.name === "AbortError"
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

        const results =
            await Promise.all(
                servers.map(checkServer)
            );


        renderServers(results);

        updateSummary(results);

        updateLastChecked();

        updateHistory(results);


    } catch (error) {

        console.error(
            "Server check failed:",
            error
        );


        overallStatus.textContent =
            "ERROR";


        overallStatus.style.color =
            "var(--danger)";


    } finally {

        isChecking = false;

        setLoading(false);

        resetCountdown();
    }
}


/* =========================================================
   LOADING
   ========================================================= */

function setLoading(active) {

    if (loading) {

        loading.textContent =
            active
                ? "Checking..."
                : "Auto-check: 30s";
    }


    if (checkButton) {

        checkButton.disabled =
            active;


        checkButton.innerHTML =
            active
                ? "⏳ <span>Checking...</span>"
                : "🔄 <span>Check Server Now</span>";
    }
}


/* =========================================================
   CHECKING UI
   ========================================================= */

function renderChecking() {

    if (!serversContainer) {
        return;
    }


    serversContainer.innerHTML =
        servers.map(server => `

            <div class="server-card">

                <div class="server-top">

                    <div>

                        <div class="server-name">
                            ${escapeHtml(server.name)}
                        </div>

                        <div class="server-url">
                            ${escapeHtml(server.url)}
                        </div>

                    </div>

                    <div class="status checking">
                        CHECKING
                    </div>

                </div>


                <div class="server-details">

                    <div class="detail">

                        <span>
                            Status
                        </span>

                        <strong>
                            Checking...
                        </strong>

                    </div>


                    <div class="detail">

                        <span>
                            Response
                        </span>

                        <strong>
                            --
                        </strong>

                    </div>

                </div>

            </div>

        `).join("");
}


/* =========================================================
   SERVER RESULTS
   ========================================================= */

function renderServers(results) {

    if (!serversContainer) {
        return;
    }


    serversContainer.innerHTML =
        results.map(result => {

            const statusClass =
                result.online
                    ? "online"
                    : "down";


            const statusText =
                result.online
                    ? "ONLINE"
                    : "OFFLINE";


            const response =
                result.online
                    ? `${result.ping} ms`
                    : "--";


            return `

                <div
                    class="server-card ${result.online ? "" : "down"}">

                    <div class="server-top">

                        <div>

                            <div class="server-name">
                                ${escapeHtml(result.name)}
                            </div>

                            <div class="server-url">
                                ${escapeHtml(result.url)}
                            </div>

                        </div>


                        <div class="status ${statusClass}">
                            ${statusText}
                        </div>

                    </div>


                    <div class="server-details">

                        <div class="detail">

                            <span>
                                Status
                            </span>

                            <strong>
                                ${statusText}
                            </strong>

                        </div>


                        <div class="detail">

                            <span>
                                Response
                            </span>

                            <strong>
                                ${response}
                            </strong>

                        </div>

                    </div>

                </div>

            `;

        }).join("");
}


/* =========================================================
   SUMMARY
   ========================================================= */

function updateSummary(results) {

    if (!results.length) {
        return;
    }


    const online =
        results.filter(
            result => result.online
        );


    if (online.length === results.length) {

        overallStatus.textContent =
            "ONLINE";

        overallStatus.style.color =
            "var(--success)";

    } else if (online.length > 0) {

        overallStatus.textContent =
            "PARTIAL";

        overallStatus.style.color =
            "var(--warning)";

    } else {

        overallStatus.textContent =
            "OFFLINE";

        overallStatus.style.color =
            "var(--danger)";
    }


    const pings =
        online
            .map(result => result.ping)
            .filter(
                value =>
                    Number.isFinite(value)
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


        overallPing.textContent =
            average;

    } else {

        overallPing.textContent =
            "--";
    }
}


/* =========================================================
   LAST CHECKED
   ========================================================= */

function updateLastChecked() {

    const now =
        new Date();


    lastChecked.textContent =
        now.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );
}


/* =========================================================
   HISTORY
   ========================================================= */

function updateHistory(results) {

    const online =
        results.filter(
            result => result.online
        );


    if (!online.length) {

        historyData.unshift({

            time: new Date(),

            ping: null,

            online: false

        });

    } else {

        const average =
            Math.round(
                online.reduce(
                    (sum, result) =>
                        sum + result.ping,
                    0
                ) / online.length
            );


        historyData.unshift({

            time: new Date(),

            ping: average,

            online: true

        });
    }


    historyData =
        historyData.slice(
            0,
            MAX_HISTORY
        );


    renderHistory();
}


function renderHistory() {

    if (!historyContainer) {
        return;
    }


    if (!historyData.length) {

        historyContainer.innerHTML = `
            <div class="history-empty">
                Waiting for the first server check...
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


    historyContainer.innerHTML =
        historyData
            .slice()
            .reverse()
            .map(item => {

                const height =
                    item.online
                        ? Math.max(
                            20,
                            Math.min(
                                100,
                                (item.ping / maxPing) * 100
                            )
                        )
                        : 20;


                const time =
                    item.time.toLocaleTimeString(
                        [],
                        {
                            hour: "2-digit",
                            minute: "2-digit"
                        }
                    );


                if (!item.online) {

                    return `

                        <div
                            class="history-bar down"
                            style="--height: 20%;">

                            <span>
                                OFF
                            </span>

                        </div>

                    `;
                }


                return `

                    <div
                        class="history-bar"
                        style="--height: ${height}%;">

                        <span>
                            ${item.ping}ms
                        </span>

                    </div>

                `;

            })
            .join("");
}


/* =========================================================
   COUNTDOWN
   ========================================================= */

function resetCountdown() {

    countdown =
        CHECK_INTERVAL;


    updateCountdown();


    if (countdownTimer) {

        clearInterval(
            countdownTimer
        );
    }


    countdownTimer =
        setInterval(
            () => {

                countdown--;


                if (countdown <= 0) {

                    countdown =
                        CHECK_INTERVAL;
                }


                updateCountdown();

            },
            1000
        );
}


function updateCountdown() {

    if (!nextCheck) {
        return;
    }


    nextCheck.textContent =
        `${countdown}s`;
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

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


/* =========================================================
   EVENTS
   ========================================================= */

if (themeToggle) {

    themeToggle.addEventListener(
        "click",
        toggleTheme
    );
}


if (checkButton) {

    checkButton.addEventListener(
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
   CHECK AGAIN WHEN TAB RETURNS
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
