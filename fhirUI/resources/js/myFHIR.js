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

    // The SSN is protected health information: masked and read-only until the user asks to see it
    let ssnValue = '';
    let ssnRevealed = false;

    function maskSSN(value) {
        const text = value ? String(value) : '';
        // Keep the last four digits only when there is more than that to hide
        return text.length > 4 ? '***-**-' + text.slice(-4) : text.replace(/./g, '*');
    }

    // The SSN is the identifier with this system, wherever it sits in the list
    const SSN_SYSTEM = 'http://hl7.org/fhir/sid/us-ssn';

    function findSSN(resource) {
        return (resource.identifier || []).find((id) => id && id.system === SSN_SYSTEM);
    }

    function showMaskedSSN() {
        ssnRevealed = false;
        $("#SSN").val(maskSSN(ssnValue)).prop('readonly', true);
        $("#revealSSN").prop('disabled', false);
    }

    $("#revealSSN").click(function () {
        ssnRevealed = true;
        $("#SSN").val(ssnValue).prop('readonly', false).focus();
        $("#revealSSN").prop('disabled', true);
    });

    // Build a table row whose cells hold the values as text, never as HTML
    function textRow(values) {
        const row = $('<tr>');
        values.forEach((value) => {
            row.append($('<td>').text(value));
        });
        return row;
    }

    // The row shown when a search finds nothing, spanning every column of its table
    function noRecordsRow(colspan) {
        return $('<tr>').append($('<td>').attr('colspan', colspan).text('No records'));
    }

    // The entries of a search bundle; a search without results has no entry at all
    function entries(bundle) {
        return (bundle && bundle.entry) || [];
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
                entries(bundle).forEach((patient) => {
                    //console.log(patient.resource);
                    objPatient = patient;
                    const r = patient.resource;
                    // Any of these may be missing in a valid Patient: show an empty field
                    const ssn = findSSN(r) || {};
                    const name = (r.name && r.name[0]) || {};
                    const address = (r.address && r.address[0]) || {};
                    $("#fhirId").val(r.id);
                    ssnValue = ssn.value || '';
                    showMaskedSSN();
                    $("#firstName").val((name.given && name.given[0]) || '');
                    $("#lastName").val(name.family || '');
                    $("#dateofbirth").val(r.birthDate || '');
                    $("#gender").val(r.gender || '');
                    $("#address").val((address.line && address.line[0]) || '');
                    $("#city").val(address.city || '');
                    $("#state").val(address.state || '');
                    $("#country").val(address.country || '');

                    // The FHIR Data Source modal shows the resource as stored, except the SSN, which stays masked
                    const shownPatient = JSON.parse(JSON.stringify(patient.resource));
                    const shownSSN = findSSN(shownPatient);
                    if (shownSSN && shownSSN.value) {
                        shownSSN.value = maskSSN(shownSSN.value);
                    }
                    var textedJSON = JSON.stringify(shownPatient, undefined, 4);
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
            entries(bundle).forEach((patient) => {
                const patientId = patient.resource.id;
                const name = getName(patient.resource).trim();
                const item = $('<div class="list-group-item" data-toggle="sidebar" data-sidebar="show">')
                    .attr('id', patientId)
                    .on('click', () => loadForm(patientId))
                    .append(
                        $('<a href="#" class="stretched-link"></a>'),
                        $('<div class="list-group-item-figure">').append(
                            $('<div class="tile tile-circle bg-blue">').text(name ? name.slice(0, 1) : '?')
                        ),
                        $('<div class="list-group-item-body">').append(
                            $('<h4 class="list-group-item-title">').text(' ' + (name || '(no name)')),
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
                $("#badgeImmunization").text(bundle.total || 0);

                var resourceImmunization = JSON.stringify(bundle, undefined, 4);
                $('#fhirdatasource').val($('#fhirdatasource').val() + resourceImmunization);

                if (entries(bundle).length === 0) {
                    $("#immunizationTable tbody").append(noRecordsRow(2));
                }
                entries(bundle).forEach((immunization) => {
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
                $("#badgeAllergy").text(bundle.total || 0);

                if (entries(bundle).length === 0) {
                    $("#allergyTable tbody").append(noRecordsRow(4));
                } else {
                    var resourceAllergy = JSON.stringify(bundle, undefined, 4);
                    $('#fhirdatasource').val($('#fhirdatasource').val() + resourceAllergy);

                    entries(bundle).forEach((allergy) => {
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
                $("#badgeVitalSigns").text(bundle.total || 0);

                var resourceVitalSigns = JSON.stringify(bundle, undefined, 4);
                $('#fhirdatasource').val($('#fhirdatasource').val() + resourceVitalSigns);

                if (entries(bundle).length === 0) {
                    $("#vitalSignsTable tbody").append(noRecordsRow(4));
                }
                entries(bundle).forEach((vitalsigns) => {
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
                $("#badgeLaboratory").text(bundle.total || 0);

                if (entries(bundle).length > 0) {
                    const icone = $('<a target="_blank"><span class="label label-info"><i class="fas fa-chart-line"></i></span></a>')
                        .attr('href', 'labresult.html?id=' + encodeURIComponent(patientId));
                    $("#iconChart").append(icone);
                }

                var resourceLaboratory = JSON.stringify(bundle, undefined, 4);
                $('#fhirdatasource').val($('#fhirdatasource').val() + resourceLaboratory);

                if (entries(bundle).length === 0) {
                    $("#laboratoryTable tbody").append(noRecordsRow(4));
                }
                entries(bundle).forEach((laboratory) => {
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

    // Set a field to the value typed, or remove it when left empty: FHIR does not accept empty strings
    function setOrRemove(obj, key, value) {
        if (value) {
            obj[key] = value;
        } else {
            delete obj[key];
        }
    }

    // Same for the first item of a list field (name.given, address.line)
    function setFirstOrRemove(obj, key, value) {
        if (value) {
            obj[key] = obj[key] || [];
            obj[key][0] = value;
        } else if (obj[key]) {
            obj[key].splice(0, 1);
            if (obj[key].length === 0) {
                delete obj[key];
            }
        }
    }

    // Write the first item of a list field (name, address) from the form. The item is created only
    // when the form has a value for it, and an existing item left with nothing is removed.
    function updateFirstItem(resource, key, values, write) {
        const exists = resource[key] && resource[key].length > 0;
        if (!exists && !values.some((v) => v)) {
            return;
        }
        resource[key] = resource[key] || [];
        resource[key][0] = resource[key][0] || {};
        write(resource[key][0]);
        if (Object.keys(resource[key][0]).length === 0) {
            resource[key].splice(0, 1);
            if (resource[key].length === 0) {
                delete resource[key];
            }
        }
    }

    window.updatePatient = function (patientId) {
        const r = objPatient.resource;
        r.id = $("#fhirId").val();
        // Never save the mask: only a revealed field carries an edited SSN
        if (ssnRevealed) {
            ssnValue = $("#SSN").val();
        }
        // Update the us-ssn identifier; a patient without one gains it at the end only when there is a value
        const ssn = findSSN(r);
        if (ssn) {
            setOrRemove(ssn, 'value', ssnValue);
        } else if (ssnValue) {
            r.identifier = r.identifier || [];
            r.identifier.push({ system: SSN_SYSTEM, value: ssnValue });
        }

        const firstName = $("#firstName").val();
        const lastName = $("#lastName").val();
        updateFirstItem(r, 'name', [firstName, lastName], (name) => {
            setFirstOrRemove(name, 'given', firstName);
            setOrRemove(name, 'family', lastName);
        });

        // Written only when filled: an empty select may stand for a value it does not list
        const birthDate = $("#dateofbirth").val();
        if (birthDate) {
            r.birthDate = birthDate;
        }
        const gender = $("#gender").val();
        if (gender) {
            r.gender = gender;
        }

        const line = $("#address").val();
        const city = $("#city").val();
        const state = $("#state").val();
        const country = $("#country").val();
        updateFirstItem(r, 'address', [line, city, state, country], (address) => {
            setFirstOrRemove(address, 'line', line);
            setOrRemove(address, 'city', city);
            setOrRemove(address, 'state', state);
            setOrRemove(address, 'country', country);
        });

        client.update({
            type: "Patient",
            id: parseInt(patientId),
            resource: r
        }).catch(function (e) {
            showToast(1);
            $("#updateData").prop('disabled', false);
            throw e;
        }).then(function (bundle) {
            showToast(0);
            showMaskedSSN();
            $("#updateData").prop('disabled', false);

            return bundle;
        });
    };

});