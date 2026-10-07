var urlOrigin = window.location.origin;
var urlREST = urlOrigin + "/fhir/api";

$(document).ready(function () {

    // Login page of the portal: a 401 from /fhir/api means the session ended
    const entryPage = 'diashenrique.fhir.portal.Home.cls';
    // Shared with myFHIR.js, which clears it once the patient list loads
    const redirectKey = 'fhirPortalLoginRedirect';

    // Same messages as the patient list (myFHIR.js): "Could not load <what> (HTTP <status>)"
    let unloading = false;
    window.addEventListener('beforeunload', () => { unloading = true; });
    window.addEventListener('pagehide', () => { unloading = true; });

    function failed(what) {
        return function (jqXHR) {
            if (unloading) return;
            const status = jqXHR && typeof jqXHR.status === 'number' ? jqXHR.status : null;
            if (status === 401) {
                // Redirect once, like the patient list: a 401 right after a redirect means the session is
                // valid but /fhir/api refuses it (configuration), and redirecting again would hide that
                if (!sessionStorage.getItem(redirectKey)) {
                    sessionStorage.setItem(redirectKey, '1');
                    window.location.href = entryPage;
                    return;
                }
                sessionStorage.removeItem(redirectKey);
                toastr.error('The FHIR API refused the request (HTTP 401). Check the /fhir/api configuration.');
            } else if (status === 0) {
                toastr.error('Could not load ' + what + ' (no response from the server)');
            } else if (status) {
                toastr.error('Could not load ' + what + ' (HTTP ' + status + ')');
            } else {
                console.error('Could not load ' + what, jqXHR);
                toastr.error('Could not load ' + what);
            }
        };
    }

    $("#labSearch").click(function () {
        getResults();
    });

    var getUrlParameter = function getUrlParameter(sParam) {
        var sPageURL = window.location.search.substring(1),
            sURLVariables = sPageURL.split('&'),
            sParameterName,
            i;

        for (i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split('=');

            if (sParameterName[0] === sParam) {
                return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
            }
        }
    };

    var patientId = getUrlParameter('id');

    getPatient();
    getOptions();

    function getPatient() {
        $.getJSON(urlREST + "/patient/" + encodeURIComponent(patientId), function (responseData) {
            $.each(responseData, function (idx, obj) {
                $("#fhirId").val(patientId);
                $("#fullName").val(obj.name);
                $("#dateofbirth").val(obj.birthdate);
            });
        }).fail(failed('the patient'));
    }

    function getOptions() {
        $.getJSON(urlREST + "/laboptions/" + encodeURIComponent(patientId), function (responseData) {
            $.each(responseData, function (idx, obj) {
                $("#labtest").append($('<option>').val(obj.code).text(obj.name));
            });
        }).fail(failed('lab tests'));
    }

    // The theme (theme.min.js) sets its font as a Chart.js 2 global, which Chart.js 4 ignores
    Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Fira Sans", "Helvetica Neue", "Apple Color Emoji", sans-serif';
    var ctx = document.getElementById("myChart").getContext("2d");
    // One chart at a time: the previous one is destroyed before drawing the next
    var chart = null;
    // Only the latest search may draw: an older response arriving late is ignored
    var latestRequest = 0;

    // Text alternative of the chart: its name on the canvas and every plotted point in a table only screen readers see
    function describeChart(label, points) {
        $("#myChart").attr('aria-label', 'Lab results chart of ' + label + ', ' + points.length + ' results, listed in the table below');
        $("#labTable caption").text(label);
        $("#labTable tbody").empty().append(points.map(function (e) {
            return $('<tr>').append($('<td>').text(e.date), $('<td>').text(e.value));
        }));
    }

    function getResults() {
        var request = ++latestRequest;
        var label = $("#labtest option:selected").text();
        var url = urlREST + "/patient/" + encodeURIComponent(patientId) + "/lab/" + encodeURIComponent($("#labtest").val());
        $.getJSON(url, function (responseData) {
            if (request !== latestRequest) return;
            // Only numeric results can be plotted
            var points = responseData.filter(function (e) {
                return e.value !== null && e.value !== '' && !isNaN(Number(e.value));
            });

            // Chart.js 4: one {x, y} point per result on a time axis (the date adapter parses the ISO dates)
            var config = {
                type: 'line',
                data: {
                    datasets: [{
                        label: label,
                        data: points.map(function (e) { return { x: e.date, y: Number(e.value) }; }),
                        borderColor: 'rgb(0, 119, 204)',
                        backgroundColor: 'rgba(0, 119, 204, 0.3)',
                        fill: true
                    }]
                },
                // No legend: the heading above names the test (the theme hid it with a Chart.js 2 global)
                options: {
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            type: 'time'
                        }
                    }
                }
            };

            if (chart) {
                chart.destroy();
            }
            chart = new Chart(ctx, config);
            $("#testName").text(label);
            describeChart(label, points);
        }).fail(function (jqXHR) {
            if (request === latestRequest) failed('lab results')(jqXHR);
        });
    }

});
