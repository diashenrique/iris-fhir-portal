var urlOrigin = window.location.origin;
var urlREST = urlOrigin + "/fhir/api";

$(document).ready(function () {

    $("#labSearch").click(function () {
        $("#testName").text($("#labtest option:selected").text());
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
        $.getJSON(urlREST + "/patient/" + patientId, function (responseData) {
            var jsonPatient = JSON.stringify(responseData);
            $.each(JSON.parse(jsonPatient), function (idx, obj) {
                $("#fhirId").val(patientId);
                $("#fullName").val(obj.name);
                $("#dateofbirth").val(obj.birthdate);
            });
        });
    }

    function getOptions() {
        $.getJSON(urlREST + "/laboptions/" + patientId,
            function (responseData) {
                var jsonData = JSON.stringify(responseData);
                $.each(JSON.parse(jsonData), function (idx, obj) {
                    $("#labtest").append('<option value="' + obj.code + '">' + obj.name + '</option>');
                });

            });
    }


    var jsonfile = {
        "jsonarray": [{
            "name": "Joe",
            "age": 12
        }, {
            "name": "Tom",
            "age": 14
        }]
    };

    console.log(jsonfile)

    var ctx = document.getElementById("myChart").getContext("2d");

    function getResults() {
        $.getJSON(urlREST + "/patient/" + patientId + "/lab/" + $("#labtest").val(), function (responseData) {
            console.log(responseData);

            var labels = responseData.map(function (e) {
                return e.date;
            });
            var data = responseData.map(function (e) {
                return e.value;
            });

            var config = {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: $("#labtest option:selected").text(),
                        data: data,
                        backgroundColor: 'rgba(0, 119, 204, 0.3)'
                    }]
                },
                options: {
                    scales: {
                        xAxes: [{
                            type: 'time'
                        }]
                    }
                }
            };

            var chart = new Chart(ctx, config);
        });
    }


});