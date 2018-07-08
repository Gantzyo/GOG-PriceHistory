// ==UserScript==
// @name            GOG.com - Price history
// @namespace       https://github.com/Gantzyo/
// @homepageURL     https://github.com/Gantzyo/GOG-PriceHistory
// @supportURL      https://github.com/Gantzyo/GOG-PriceHistory/issues
// @match           https://www.gog.com/game/*
// @description     Import GOGDB.org's price history inside GOG.com's store
// @author          Gantzyo
// @version         1.0.0
// @icon            https://raw.githubusercontent.com/Gantzyo/GOG-PriceHistory/master/imgs/gogdb_256x256.png
// @grant           GM.getResourceUrl
// @grant           GM_getResourceURL
// @grant           GM.xmlHttpRequest
// @grant           GM_xmlhttpRequest
// @grant           console
// @grant           unsafeWindow
// @require         https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.2/Chart.bundle.js
// @require         https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @resource        gogdbLogo https://raw.githubusercontent.com/Gantzyo/GOG-PriceHistory/master/imgs/gogdb_256x256.png
// @connect         www.gogdb.org
// ==/UserScript==
(function () {

    // --- FUNCTIONS
    function addGlobalStyle(css) {
        var head, style;
        head = document.getElementsByTagName('head')[0];
        if (!head) {
            return;
        }
        style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    }

    function setGOGDBLogo(url) {
        // Prepend logo
        // Not inserted as DOM elements, no advantages in this scenario? https://stackoverflow.com/questions/2007357/how-to-set-dom-element-as-the-first-child
        document.getElementById('gog_ph_gogdb_link').innerHTML = '<img src="' + url + '" width="12px" height="12px"/>&nbsp;' + document.getElementById('gog_ph_gogdb_link').innerHTML;
    }

    // --- MAIN

    var $productId = unsafeWindow.gogData.gameProductData.id;

    // All new DOM classes and IDs look like: gog_ph_*
    addGlobalStyle('#gog_ph_header { margin-top: 20px; }');
    addGlobalStyle('#gog_ph_chart_canvas { max-height: 200px; width: 100%; }'); // BUGGED!! max-height is extremly important to avoid infinite canvas height
    addGlobalStyle('.gog_ph_shadow { box-shadow: 0 1px 5px rgba(0,0,0,.15); }');
    addGlobalStyle('.gog_ph_whitebg { background-color: #e1e1e1; }');
    addGlobalStyle('.gog_ph_hidden { display: none; }');

    // Add DOM element to prevent DOM rebuild upon element append
    var gog_ph_div = document.createElement('div');
    gog_ph_div.setAttribute("id", "gog_ph_div");
    gog_ph_div.innerHTML =
        '<header id="gog_ph_header" class="module-header">Price history</header>' +
        '<p id="gog_ph_loading"><small>Loading...</small></p>' +
        '<canvas id="gog_ph_chart_canvas" class="gog_ph_whitebg gog_ph_shadow gog_ph_hidden"></canvas>' +
        '<p>' +
        '<small>Price history retrieved from ' +
        '<a id="gog_ph_gogdb_link" class="un" href="https://www.gogdb.org/" target="_blank">GOG Database</a>' +
        '</small>' +
        '</p>';

    // Append price history
    document.querySelector('.screens').parentElement.appendChild(gog_ph_div);

    // Load GOGDB icon and place it inside site link (Async call)
    GM.getResourceUrl("gogdbLogo").then(function (value) {
        setGOGDBLogo(value);
    }, function (reason) {
        console.error("Resource 'gogdbLogo' couldn't be retrieved. Reason: " + reason);
        setGOGDBLogo("https://raw.githubusercontent.com/Gantzyo/GOG-PriceHistory/master/imgs/gogdb_256x256.png");
    });

    // Retrieve data from GOGDB (Async call)
    GM.xmlHttpRequest({
        method: 'GET',
        url: 'https://www.gogdb.org/product/' + $productId,
        onload: function (response) {
            var parser      = new DOMParser ();
            var responseDoc = parser.parseFromString (response.responseText, "text/html");
            
            // Remove "Loading..." message
            document.getElementById('gog_ph_loading').remove();

            // Init chart
            init_chart(responseDoc.getElementById('pricehistory-json').innerHTML);

            // Display chart
            document.getElementById('gog_ph_chart_canvas').classList.remove("gog_ph_hidden");

            // Set GOGDB link
            document.getElementById('gog_ph_gogdb_link').setAttribute("href", "https://www.gogdb.org/product/" + $productId);
        }
    });

    // --- CHART GENERATION
    // Code from https://github.com/Yepoleb/gogdb/blob/master/gogdb/static/js/chartconfig.js
    // (A bit modified)
    function null_to_nan(value) {
        if (value == null) {
            return NaN;
        }
        return value;
    }

    function init_chart(rawPriceHistory) {
        var pricehistory = JSON.parse(rawPriceHistory)
        pricehistory["values"] = pricehistory["values"].map(null_to_nan);

        var config = {
            type: "line",
            data: {
                labels: pricehistory["labels"],
                datasets: [{
                    label: "Price",
                    fill: false,
                    steppedLine: true,
                    borderColor: "rgb(241, 142, 0)",
                    backgroundColor: "rgb(241, 142, 0)",
                    data: pricehistory["values"],
                }]
            },
            options: {
                scales: {
                    xAxes: [{
                        type: "time",
                        time: {
                            tooltipFormat: "MMM D, YYYY",
                        }
                    }],
                    yAxes: [{
                        ticks: {
                            beginAtZero: true,
                            suggestedMax: Math.round(pricehistory["max"]) + 1
                        }
                    }]
                },
                legend: {
                    display: false
                },
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 15
                    }
                }
            }
        };

        var ctx = document.getElementById("gog_ph_chart_canvas");
        if (ctx != null) {
            window.myChart = new Chart(ctx, config);
        }
    }
})();