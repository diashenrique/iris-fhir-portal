$(document).ready(function () {
    const divPlist = document.querySelector('#patientlist');

    var objPatient = "";

    // Login page of the portal; the IRIS session cookie authenticates /fhir/r4 and /fhir/api
    const entryPage = 'diashenrique.fhir.portal.Home.cls';
    const redirectKey = 'fhirPortalLoginRedirect';

    // Instantiate a new FHIR client
    var client = fhir({
        baseUrl: '/fhir/r4',

        headers: {
            'Accept': 'application/fhir+json',
            'Content-Type': 'application/fhir+json;charset=UTF-8'
        }
    });

    $("#reloadList").click(function () {
        location.reload();
    });

    $("#updateData").prop('disabled', true);

    function Toast(type, css, msg) {
        this.type = type;
        this.css = css;
        this.msg = msg;
    }

    var toasts = [
        new Toast('success', 'toast-bottom-center', 'Updating patient successed!'),
        new Toast('error', 'toast-bottom-center', 'An error happened while updating patient record.')
    ];

    toastr.options.positionClass = 'toast-top-full-width';
    toastr.options.extendedTimeOut = 0; //1000;
    toastr.options.timeOut = 2000;
    toastr.options.fadeOut = 250;
    toastr.options.fadeIn = 250;

    function showToast(i) {
        var t = toasts[i];
        toastr.options.positionClass = t.css;
        toastr[t.type](t.msg);
    }

    $("#updateData").click(function () {
        $("#updateData").prop('disabled', true);
        updatePatient($("#fhirId").val());
    });

    function getName(r) {
        let name = '';
        if (r.name && r.name.length > 0) {
            if (r.name[0].given && r.name[0].given.length > 0) {
                name += `${r.name[0].given[0]} `;
            }
            if (r.name[0].family) {
                name += r.name[0].family;
            }
        }

        return name;
    }

    // Build a table row whose cells hold the values as text, never as HTML
    function textRow(values) {
        const row = $('<tr>');
        values.forEach((value) => {
            row.append($('<td>').text(value));
        });
        return row;
    }

    // Perform a search to retrieve patient details for a specific patient
    window.loadForm = function (patientId) {
        client.search({
                type: 'Patient',
                query: {
                    _id: patientId
                }
            }).then((res) => {
                const bundle = res.data;
                bundle.entry.forEach((patient) => {
                    //console.log(patient.resource);
                    objPatient = patient;
                    $("#fhirId").val(patient.resource.id);
                    $("#SSN").val(patient.resource.identifier[2].value);
                    $("#firstName").val(patient.resource.name[0].given[0]);
                    $("#lastName").val(patient.resource.name[0].family);
                    $("#dateofbirth").val(patient.resource.birthDate);
                    $("#gender").val(patient.resource.gender);
                    $("#address").val(patient.resource.address[0].line[0]);
                    $("#city").val(patient.resource.address[0].city);
                    $("#state").val(patient.resource.address[0].state);
                    $("#country").val(patient.resource.address[0].country);

                    var textedJSON = JSON.stringify(patient.resource, undefined, 4);
                    $('#fhirdatasource').val(textedJSON);

                    $("#allergyTable tbody").empty();
                    $("#vitalSignsTable tbody").empty();
                    $("#laboratoryTable tbody").empty();
                    $("#immunizationTable tbody").empty();
                    $("#iconChart").empty();
                    $("#updateData").prop('disabled', false);

                    allergy(patient.resource.id);
                    vitalsigns(patient.resource.id);
                    laboratory(patient.resource.id);
                    immunization(patient.resource.id);
                });
            })
            .catch((err) => {
                // Error responses
                if (err.status) {
                    console.log(err);
                    console.log('Error', err.status);
                }
                // Errors
                if (err.data && err.data) {
                    console.log('Error', err.data);
                }
            });
    };

    // Perform a search to retrieve patient list
    client.search({
            type: 'Patient',
            query: {
                _sort: '-_lastUpdated'
            }
        }).then((res) => {
            sessionStorage.removeItem(redirectKey);
            const bundle = res.data;
            bundle.entry.forEach((patient) => {
                const patientId = patient.resource.id;
                const name = getName(patient.resource);
                const item = $('<div class="list-group-item" data-toggle="sidebar" data-sidebar="show">')
                    .attr('id', patientId)
                    .on('click', () => loadForm(patientId))
                    .append(
                        $('<a href="#" class="stretched-link"></a>'),
                        $('<div class="list-group-item-figure">').append(
                            $('<div class="tile tile-circle bg-blue">').text(name.slice(0, 1))
                        ),
                        $('<div class="list-group-item-body">').append(
                            $('<h4 class="list-group-item-title">').text(' ' + name),
                            $('<p class="list-group-item-text">').text(' FHIR Patient ID: ' + patientId + ' ')
                        )
                    );
                $("#listgroup").append(item);
            });
        })
        .catch((err) => {
            // No session (logged out or expired): the FHIR endpoint answers 401 (404 if the web app ever refuses it first).
            // The jQuery adapter of fhir.js rejects with { error: jqXHR }, so the status is on err.error.
            const status = err.error && err.error.status;
            if (status === 401 || status === 404) {
                // Redirect once: a refusal right after a redirect means the session is fine but the
                // FHIR endpoint refuses it (configuration), and redirecting again would loop forever
                if (!sessionStorage.getItem(redirectKey)) {
                    sessionStorage.setItem(redirectKey, '1');
                    window.location.href = entryPage;
                    return;
                }
                sessionStorage.removeItem(redirectKey);
                toastr.error('The FHIR server refused the request (HTTP ' + status + '). Check the /fhir/r4 configuration.');
            }
            // Error responses
            if (err.status) {
                console.log(err);
                console.log('Error', err.status);
            }
            // Errors
            if (err.data && err.data) {
                console.log('Error', err.data);
            }
        });


    // Perform a search to Immunization list for a specific patient
    window.immunization = function (patientId) {
        client.search({
                type: 'Immunization',
                query: {
                    patient: patientId
                }
            }).then((res) => {
                const bundle = res.data;
                $("#badgeImmunization").text(res.data.total);

                var resourceImmunization = JSON.stringify(bundle, undefined, 4);
                $('#fhirdatasource').val($('#fhirdatasource').val() + resourceImmunization);

                bundle.entry.forEach((immunization) => {
                    $("#immunizationTable tbody").append(textRow([
                        immunization.resource.vaccineCode["coding"][0].display,
                        immunization.resource.occurrenceDateTime
                    ]));
                });
            })
            .catch((err) => {
                // Error responses
                if (err.status) {
                    console.log(err);
                    console.log('Error', err.status);
                }
                // Errors
                if (err.data && err.data) {
                    console.log('Error', err.data);
                }
            });
    };

    // Perform a search to Allergy list for a specific patient
    window.allergy = function (patientId) {
        client.search({
                type: 'AllergyIntolerance',
                query: {
                    patient: patientId
                }
            }).then((res) => {
                const bundle = res.data;
                $("#badgeAllergy").text(res.data.total);

                if (res.data.total > 0) {
                    var resourceAllergy = JSON.stringify(bundle, undefined, 4);
                    $('#fhirdatasource').val($('#fhirdatasource').val() + resourceAllergy);

                    bundle.entry.forEach((allergy) => {
                        $("#allergyTable tbody").append(textRow([
                            allergy.resource.code.coding[0].display,
                            allergy.resource.type,
                            allergy.resource.category[0],
                            allergy.resource.criticality
                        ]));
                    });
                }
            })
            .catch((err) => {
                // Error responses
                if (err.status) {
                    console.log(err);
                    console.log('Error', err.status);
                }
                // Errors
                if (err.data && err.data) {
                    console.log('Error', err.data);
                }
            });
    };

    // Perform a search to Vital Signs list for a specific patient
    window.vitalsigns = function (patientId) {
        client.search({
                type: 'Observation',
                query: {
                    patient: patientId,
                    category: 'vital-signs',
                    _sort: 'date'
                }
            }).then((res) => {
                const bundle = res.data;
                $("#badgeVitalSigns").text(res.data.total);

                var resourceVitalSigns = JSON.stringify(bundle, undefined, 4);
                $('#fhirdatasource').val($('#fhirdatasource').val() + resourceVitalSigns);

                bundle.entry.forEach((vitalsigns) => {
                    if (vitalsigns.resource.hasOwnProperty('valueQuantity')) {
                        $("#vitalSignsTable tbody").append(textRow([
                            vitalsigns.resource.code.coding[0].display,
                            vitalsigns.resource.valueQuantity.value,
                            vitalsigns.resource.valueQuantity.unit,
                            vitalsigns.resource.effectiveDateTime
                        ]));
                    } else {
                        vitalsigns.resource.component.forEach((bp) => {
                            $("#vitalSignsTable tbody").append(textRow([
                                bp.code.text,
                                bp.valueQuantity.value,
                                bp.valueQuantity.unit,
                                vitalsigns.resource.effectiveDateTime
                            ]));
                        });
                    }
                });
            })
            .catch((err) => {
                // Error responses
                if (err.status) {
                    console.log(err);
                    console.log('Error', err.status);
                }
                // Errors
                if (err.data && err.data) {
                    console.log('Error', err.data);
                }
            });
    };

    window.laboratory = function (patientId) {
        client.search({
                type: 'Observation',
                query: {
                    patient: patientId,
                    category: 'laboratory',
                    _sort: 'date'
                }
            }).then((res) => {
                const bundle = res.data;
                $("#badgeLaboratory").text(res.data.total);

                if (res.data.total > 0) {
                    const icone = $('<a target="_blank"><span class="label label-info"><i class="fas fa-chart-line"></i></span></a>')
                        .attr('href', 'labresult.html?id=' + encodeURIComponent(patientId));
                    $("#iconChart").append(icone);
                }

                var resourceLaboratory = JSON.stringify(bundle, undefined, 4);
                $('#fhirdatasource').val($('#fhirdatasource').val() + resourceLaboratory);

                bundle.entry.forEach((laboratory) => {
                    $("#laboratoryTable tbody").append(textRow([
                        laboratory.resource.code.coding[0].display,
                        laboratory.resource.valueQuantity.value,
                        laboratory.resource.valueQuantity.unit,
                        laboratory.resource.effectiveDateTime
                    ]));
                });
            })
            .catch((err) => {
                // Error responses
                if (err.status) {
                    console.log(err);
                    console.log('Error', err.status);
                }
                // Errors
                if (err.data && err.data) {
                    console.log('Error', err.data);
                }
            });
    };

    window.updatePatient = function (patientId) {
        objPatient.resource.id = $("#fhirId").val();
        objPatient.resource.identifier[2].value = $("#SSN").val();
        objPatient.resource.name[0].given[0] = $("#firstName").val();
        objPatient.resource.name[0].family = $("#lastName").val();
        objPatient.resource.birthDate = $("#dateofbirth").val();
        objPatient.resource.gender = $("#gender").val();
        objPatient.resource.address[0].line[0] = $("#address").val();
        objPatient.resource.address[0].city = $("#city").val();
        objPatient.resource.address[0].state = $("#state").val();
        objPatient.resource.address[0].country = $("#country").val();

        client.update({
            type: "Patient",
            id: parseInt(patientId),
            resource: objPatient.resource
        }).catch(function (e) {
            showToast(1);
            $("#updateData").prop('disabled', false);
            throw e;
        }).then(function (bundle) {
            showToast(0);
            $("#updateData").prop('disabled', false);

            return bundle;
        });
    };

});