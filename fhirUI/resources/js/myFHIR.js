$(document).ready(function () {
    const divPlist = document.querySelector('#patientlist');

    var objPatient = "";

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
                    $('#fhirdatasource').text(textedJSON);

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
            const bundle = res.data;
            bundle.entry.forEach((patient) => {
                const patientId = patient.resource.id;
                const name = getName(patient.resource);
                const megaDIV = '<div id="' + patientId + '" class="list-group-item" data-toggle="sidebar" data-sidebar="show" onclick="loadForm(' + patientId + ')"><a href="#" class="stretched-link"></a><div class="list-group-item-figure"><div class="tile tile-circle bg-blue">' + name.slice(0, 1) + '</div></div><div class="list-group-item-body"><h4 class="list-group-item-title"> ' + name + '</h4><p class="list-group-item-text"> FHIR Patient ID: ' + patientId + ' </p></div></div>';
                $("#listgroup").append(megaDIV);
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


    // Perform a search to Immunization list for a specific patient
    window.immunization = function (patientId) {
        client.search({
                type: 'Immunization',
                query: {
                    patient: patientId
                }
            }).then((res) => {
                const bundle = res.data;
                $("#badgeImmunization").html(res.data.total);

                var resourceImmunization = JSON.stringify(bundle, undefined, 4);
                $('#fhirdatasource').append(resourceImmunization);

                bundle.entry.forEach((immunization) => {
                    const vaccineRow = '<tr><td>' + immunization.resource.vaccineCode["coding"][0].display + '</td><td>' + immunization.resource.occurrenceDateTime + '</td></tr>';
                    $("#immunizationTable tbody").append(vaccineRow);
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
                $("#badgeAllergy").html(res.data.total);

                if (res.data.total > 0) {
                    var resourceAllergy = JSON.stringify(bundle, undefined, 4);
                    $('#fhirdatasource').append(resourceAllergy);

                    bundle.entry.forEach((allergy) => {
                        const allergyRow = '<tr><td>' + allergy.resource.code.coding[0].display + '</td><td>' + allergy.resource.type + '</td><td>' + allergy.resource.category[0] + '</td><td>' + allergy.resource.criticality + '</td></tr>';
                        $("#allergyTable tbody").append(allergyRow);
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
                $("#badgeVitalSigns").html(res.data.total);

                var resourceVitalSigns = JSON.stringify(bundle, undefined, 4);
                $('#fhirdatasource').append(resourceVitalSigns);

                bundle.entry.forEach((vitalsigns) => {
                    if (vitalsigns.resource.hasOwnProperty('valueQuantity')) {
                        const vitalsignsRow = '<tr><td>' + vitalsigns.resource.code.coding[0].display + '</td><td>' + vitalsigns.resource.valueQuantity.value + '</td><td>' + vitalsigns.resource.valueQuantity.unit + '</td><td>' + vitalsigns.resource.effectiveDateTime + '</td></tr>';
                        $("#vitalSignsTable tbody").append(vitalsignsRow);
                    } else {
                        vitalsigns.resource.component.forEach((bp) => {
                            const vitalBpRow = '<tr><td>' + bp.code.text + '</td><td>' + bp.valueQuantity.value + '</td><td>' + bp.valueQuantity.unit + '</td><td>' + vitalsigns.resource.effectiveDateTime + '</td></tr>';
                            $("#vitalSignsTable tbody").append(vitalBpRow);
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
                $("#badgeLaboratory").html(res.data.total);

                if (res.data.total > 0) {
                    const icone = '<a target="_blank" href="labresult.html?id=' + patientId + '"><span class="label label-info"><i class="fas fa-chart-line"></i></span></a>';
                    $("#iconChart").append(icone);
                }

                var resourceLaboratory = JSON.stringify(bundle, undefined, 4);
                $('#fhirdatasource').append(resourceLaboratory);

                bundle.entry.forEach((laboratory) => {
                    const laboratoryRow = '<tr><td>' + laboratory.resource.code.coding[0].display + '</td><td>' + laboratory.resource.valueQuantity.value + '</td><td>' + laboratory.resource.valueQuantity.unit + '</td><td>' + laboratory.resource.effectiveDateTime + '</td></tr>';
                    $("#laboratoryTable tbody").append(laboratoryRow);
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