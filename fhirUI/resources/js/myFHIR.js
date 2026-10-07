$(document).ready(function () {
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

    // Reload asks the server again for the list, keeping the search typed
    $("#reloadList").click(function () {
        loadList();
    });

    // The user of the IRIS session, in the header
    $.getJSON('/fhir/api/session', function (session) {
        $("#currentUser").text(session.user || '');
    });

    // Below 992px the list and the chart take turns (.show-chart); Back returns to the list where it was
    let listScroll = 0;

    function showChart() {
        listScroll = window.scrollY;
        $("#portal").addClass('show-chart');
        window.scrollTo(0, 0);
    }

    $("#backToList").click(function () {
        $("#portal").removeClass('show-chart');
        window.scrollTo(0, listScroll);
    });

    // Age in whole years from a FHIR date (YYYY, YYYY-MM or YYYY-MM-DD); empty when unknown
    function ageOf(birthDate) {
        const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(birthDate || '');
        if (!m) return '';
        const today = new Date();
        const month = m[2] ? Number(m[2]) : 1;
        const day = m[3] ? Number(m[3]) : 1;
        let age = today.getFullYear() - Number(m[1]);
        if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age--;
        return age >= 0 ? String(age) : '';
    }

    // The summary at the top of the chart: who the patient is, at a glance
    function showSummary(r) {
        const name = displayName(r);
        const age = ageOf(r.birthDate);
        $("#patientName").text(name || '(no name)').attr('title', getName(r).trim());
        $("#patientAge").text(age ? age + ' years' : '');
        $("#patientGender").text(r.gender ? r.gender.charAt(0).toUpperCase() + r.gender.slice(1) : '');
        $("#patientBirthDate").text(r.birthDate ? 'Born ' + r.birthDate : '');
        $("#patientFhirId").text('FHIR ID ' + r.id);
        $("#allergyAlert").addClass('d-none').text('');
        $("#conditionAlert").addClass('d-none').text('');
        $("#emptyState").addClass('d-none');
        $("#patientChart").removeClass('d-none');
        if (timelineFor !== r.id) {
            timelineFor = null;
            showTab('chart');
        }
    }

    $("#updateData").prop('disabled', true);

    // The Edit modal opens with no message from a previous save
    $("#editModal").on('show.bs.modal', function () {
        $("#editError").addClass('d-none').text('');
    });

    // Vital signs: the latest value of each measure, or the whole history
    $("#vitalsShowAll").click(function () {
        const all = $(this).attr('aria-expanded') !== 'true';
        $("#vitalSignsTable tbody .vital-history").toggleClass('d-none', !all);
        $(this).attr('aria-expanded', String(all)).text(all ? 'Show latest' : 'Show all (' + $("#vitalSignsTable tbody tr").length + ')');
    });

    // Copy the FHIR JSON; without the Clipboard API (a page that is not https or localhost), select and copy
    $("#copyJSON").click(function () {
        const text = $("#fhirdatasource").val();
        const copied = () => toastr.info('Copied.');
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(copied);
        } else {
            $("#fhirdatasource").trigger('select');
            if (document.execCommand('copy')) copied();
        }
    });

    // An error toast, also said by screen readers through the live region of the page
    function toastError(message) {
        toastr.error(message);
        $("#liveStatus").text(message);
    }

    toastr.options.positionClass = 'toast-top-full-width';
    toastr.options.extendedTimeOut = 0; //1000;
    toastr.options.timeOut = 2000;
    toastr.options.fadeOut = 250;
    toastr.options.fadeIn = 250;

    // The result of a save, at the bottom of the screen (only for this toast: the others stay on top)
    function saveToast(saved) {
        const options = { positionClass: 'toast-bottom-center' };
        if (saved) {
            toastr.success('Saved.', '', options);
        } else {
            const message = "Couldn't save the patient. Try again.";
            toastr.error(message, '', options);
            $("#liveStatus").text(message);
        }
    }

    $("#updateData").click(function () {
        $("#updateData").prop('disabled', true).text('Saving…');
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

    // The name to show: without the numeric suffix Synthea glues to each part ("Carroll471" -> "Carroll").
    // Only digits at the end of a part that has something else before them go; the FHIR data is unchanged.
    function displayName(r) {
        return getName(r).trim().split(/\s+/).map((part) => part.replace(/^(.*\D)\d+$/, '$1')).join(' ');
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

    // A FHIR date or dateTime as people read it ("Sep 3, 2014"), from its own digits: no time zone shift
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    function readableDate(value) {
        const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(value || '');
        if (!m) return value || '';
        if (!m[2]) return m[1];
        const month = MONTHS[Number(m[2]) - 1];
        return m[3] ? month + ' ' + Number(m[3]) + ', ' + m[1] : month + ' ' + m[1];
    }

    // A number shown with at most two decimals ("6.7188" -> "6.72"); anything else as it is
    function roundValue(value) {
        return /^-?\d+(\.\d+)?$/.test(value) ? String(Math.round(Number(value) * 100) / 100) : value;
    }

    // Build a table row whose cells hold the values as text, never as HTML.
    // The cell at dateColumn shows a readable date, with the value as stored in its title.
    function textRow(values, dateColumn) {
        const row = $('<tr>');
        values.forEach((value, i) => {
            const cell = $('<td>');
            if (i === dateColumn && value) {
                cell.text(readableDate(value)).attr('title', value);
            } else {
                cell.text(value);
            }
            row.append(cell);
        });
        return row;
    }

    // The clinical cards: their table, columns, what they hold and what they say when empty
    const CARDS = {
        allergy: { table: '#allergyTable', badge: '#badgeAllergy', columns: 4, what: 'allergies', empty: 'No allergies recorded.' },
        condition: { table: '#conditionTable', badge: '#badgeCondition', columns: 4, what: 'conditions', empty: 'No conditions recorded.' },
        vitalsigns: { table: '#vitalSignsTable', badge: '#badgeVitalSigns', columns: 4, what: 'vital signs', empty: 'No vital signs recorded.' },
        laboratory: { table: '#laboratoryTable', badge: '#badgeLaboratory', columns: 4, what: 'laboratory results', empty: 'No lab results recorded.' },
        immunization: { table: '#immunizationTable', badge: '#badgeImmunization', columns: 2, what: 'immunizations', empty: 'No immunizations recorded.' }
    };

    // A row spanning every column of the card's table
    function cardRow(card, content) {
        return $('<tr class="card-state">').append($('<td>').attr('colspan', card.columns).append(content));
    }

    // Loading: a placeholder line, and no count yet
    function cardLoading(key) {
        const card = CARDS[key];
        $(card.badge).text('');
        $(card.table + ' tbody').empty().append(cardRow(card, $('<span class="skeleton-line" aria-hidden="true">'))).attr('aria-busy', 'true');
    }

    // Loaded: the rows, or the line that says there are none
    function cardLoaded(key, total) {
        const card = CARDS[key];
        $(card.badge).text(total);
        $(card.table + ' tbody').empty().removeAttr('aria-busy');
        if (total === 0) {
            $(card.table + ' tbody').append(cardRow(card, document.createTextNode(card.empty)));
        }
    }

    // Failed: the toast (showError), and in the card itself what failed and a way to try again
    function cardError(key, patientId, err) {
        const card = CARDS[key];
        showError(card.what, err);
        $(card.table + ' tbody').empty().removeAttr('aria-busy').append(cardRow(card, [
            document.createTextNode("Couldn't load " + card.what + '. '),
            $('<button type="button" class="btn btn-link btn-sm p-0 card-retry">').text('Try again').on('click', () => {
                if (isSelected(patientId)) window[key](patientId);
            })
        ]));
    }

    // The entries of a search bundle; a search without results has no entry at all
    function entries(bundle) {
        return (bundle && bundle.entry) || [];
    }

    // The link of a bundle with this relation, if any
    function bundleLink(bundle, relation) {
        const link = ((bundle && bundle.link) || []).find((l) => l && l.relation === relation);
        return link && link.url;
    }

    // Run a search and follow every link[next] the server returns, in order.
    // Resolves to { first, bundles, entries }: the first bundle (its total feeds the badges),
    // every bundle fetched, and the entries of all pages together. A failed page rejects;
    // when it is a next page (not the first request), the error carries nextPage: true.
    function searchAll(params) {
        const bundles = [];
        const seen = new Set();
        const collect = (res) => {
            const bundle = res.data;
            bundles.push(bundle);
            const next = bundleLink(bundle, 'next');
            // A next link already followed would loop forever: stop there
            if (next && !seen.has(next)) {
                seen.add(next);
                return client.nextPage({ bundle: bundle }).then(collect, (err) => {
                    const failure = err && typeof err === 'object' ? err : { error: err };
                    failure.nextPage = true;
                    throw failure;
                });
            }
            return {
                first: bundles[0],
                bundles: bundles,
                entries: bundles.reduce((all, b) => all.concat(entries(b)), [])
            };
        };
        return client.search(params).then(collect);
    }

    // Append the JSON of every page to the FHIR JSON panel
    function appendBundles(bundles) {
        bundles.forEach((bundle) => {
            $('#fhirdatasource').val($('#fhirdatasource').val() + JSON.stringify(bundle, undefined, 4));
        });
    }

    // The value[x] element name of an Observation or of a component, if it has one
    function valueKey(item) {
        return Object.keys(item || {}).find((key) => /^value[A-Z]/.test(key));
    }

    // The text of a CodeableConcept: its text, or the display of its first coding
    function conceptText(concept) {
        if (!concept) return '';
        if (concept.text) return concept.text;
        return (concept.coding && concept.coding[0] && concept.coding[0].display) || '';
    }

    // Value and unit of an Observation or of a component, for any value[x]; empty when there is none
    function observationValue(item) {
        const key = valueKey(item);
        if (!key) return { value: '', unit: '' };
        const value = item[key];
        if (key === 'valueQuantity') {
            const number = value.value == null ? '' : roundValue(String(value.value));
            return {
                // A comparator such as "<" belongs to the value: "< 0.5"
                value: value.comparator && number !== '' ? value.comparator + ' ' + number : number,
                unit: value.unit || value.code || ''
            };
        }
        if (key === 'valueCodeableConcept') return { value: conceptText(value), unit: '' };
        // valueString, valueBoolean, valueInteger, valueDateTime, valueTime...: shown as text
        if (value !== null && typeof value !== 'object') return { value: String(value), unit: '' };
        return { value: '', unit: '' };
    }

    // The rows of an Observation: [name, value, unit, date], one per component when it has no value[x]
    function observationRows(resource) {
        const date = resource.effectiveDateTime || '';
        const row = (item) => {
            const v = observationValue(item);
            return [conceptText(item.code), v.value, v.unit, date];
        };
        if (!valueKey(resource) && resource.component && resource.component.length > 0) {
            return resource.component.map(row);
        }
        return [row(resource)];
    }

    // The reference range of an Observation or component as text ("4–10", "≥ 4", "≤ 10" or its text)
    function rangeText(range) {
        if (!range) return '';
        const low = range.low && range.low.value;
        const high = range.high && range.high.value;
        if (low != null && high != null) return roundValue(String(low)) + '\u2013' + roundValue(String(high));
        if (low != null) return '\u2265 ' + roundValue(String(low));
        if (high != null) return '\u2264 ' + roundValue(String(high));
        return range.text || '';
    }

    // High or Low: from the interpretation when the server gives one, else from the number against the range
    function abnormalFlag(item, range) {
        const codes = ((item.interpretation || [])[0] || {}).coding || [];
        const code = (codes[0] && codes[0].code) || '';
        if (/^(H|HH|HU|>)$/.test(code)) return 'High';
        if (/^(L|LL|LU|<)$/.test(code)) return 'Low';
        const quantity = item.valueQuantity;
        if (!range || !quantity || typeof quantity.value !== 'number' || quantity.comparator) return '';
        if (range.high && typeof range.high.value === 'number' && quantity.value > range.high.value) return 'High';
        if (range.low && typeof range.low.value === 'number' && quantity.value < range.low.value) return 'Low';
        return '';
    }

    // The lab rows of an Observation, one per component when it has no value[x]:
    // { name, value, unit, date, code, range, flag }
    function labRows(resource) {
        const date = resource.effectiveDateTime || '';
        const row = (item) => {
            const v = observationValue(item);
            const range = (item.referenceRange || [])[0];
            const coding = ((item.code || {}).coding || [])[0] || {};
            return { name: conceptText(item.code), value: v.value, unit: v.unit, date, code: coding.code || '', range, flag: abnormalFlag(item, range) };
        };
        if (!valueKey(resource) && resource.component && resource.component.length > 0) {
            return resource.component.map(row);
        }
        return [row(resource)];
    }

    // The unit and reference range of each lab test, from its latest result: the chart uses them (8.6)
    let labTests = new Map();

    // The HTTP status of a failed FHIR request, if it has one. The jQuery adapter of fhir.js
    // rejects with { error: jqXHR }, so the status is on err.error; 0 means no answer from the server.
    function httpStatus(err) {
        const status = err && err.error && err.error.status;
        return typeof status === 'number' ? status : null;
    }

    // Requests cancelled because the page is going away fail with status 0: nothing to tell then
    let unloading = false;
    window.addEventListener('beforeunload', () => { unloading = true; });
    window.addEventListener('pagehide', () => { unloading = true; });

    // Tell the user that a search failed: "Could not load <what> (HTTP <status>)".
    // An error without an HTTP status is a bug in the code (an exception in a .then): it is logged too.
    function showError(what, err) {
        if (unloading) return;
        const status = httpStatus(err);
        if (status === 0) {
            toastError('Could not load ' + what + ' (no response from the server)');
        } else if (status) {
            toastError('Could not load ' + what + ' (HTTP ' + status + ')');
        } else {
            console.error('Could not load ' + what, err);
            toastError('Could not load ' + what);
        }
    }

    // The FHIR JSON panel shows the resource as stored, except the SSN, which stays masked
    function patientJSON(resource) {
        const shownPatient = JSON.parse(JSON.stringify(resource));
        const shownSSN = findSSN(shownPatient);
        if (shownSSN && shownSSN.value) {
            shownSSN.value = maskSSN(shownSSN.value);
        }
        return JSON.stringify(shownPatient, undefined, 4);
    }

    // The patient whose details are shown: results that arrive for another one are dropped
    let selectedPatientId = null;

    function isSelected(patientId) {
        return String(patientId) === String(selectedPatientId);
    }

    // Perform a search to retrieve patient details for a specific patient
    window.loadForm = function (patientId) {
        selectedPatientId = patientId;
        // Screen readers announce the selected patient of the list
        $('#listgroup .stretched-link').removeAttr('aria-current');
        $('#listgroup .list-group-item').filter((i, el) => el.id === String(patientId)).find('.stretched-link').attr('aria-current', 'true');
        client.search({
                type: 'Patient',
                query: {
                    _id: patientId
                }
            }).then((res) => {
                if (!isSelected(patientId)) return;
                const bundle = res.data;
                entries(bundle).forEach((patient) => {
                    objPatient = patient;
                    const r = patient.resource;
                    // Any of these may be missing in a valid Patient: show an empty field
                    const ssn = findSSN(r) || {};
                    const name = (r.name && r.name[0]) || {};
                    const address = (r.address && r.address[0]) || {};
                    showSummary(r);
                    $("#fhirId").val(r.id);
                    ssnValue = ssn.value || '';
                    showMaskedSSN();
                    $("#firstName").val((name.given && name.given[0]) || '');
                    $("#lastName").val(name.family || '');
                    $("#dateofbirth").val(r.birthDate || '');
                    // The date picker (the theme starts flatpickr on the field) opens on the patient's date
                    const picker = $("#dateofbirth")[0]._flatpickr;
                    if (picker) picker.setDate(r.birthDate || null, false);
                    $("#gender").val(r.gender || '');
                    $("#address").val((address.line && address.line[0]) || '');
                    $("#city").val(address.city || '');
                    $("#state").val(address.state || '');
                    $("#country").val(address.country || '');

                    $('#fhirdatasource').val(patientJSON(patient.resource));

                    $("#vitalsShowAll").addClass('d-none');
                    $("#updateData").prop('disabled', false);
                    $("#editPatient").prop('disabled', false);

                    // The chart is on screen: the focus goes to the patient's name, so it is announced
                    if ($("#patientName").is(':visible')) $("#patientName").trigger('focus');
                    allergy(patient.resource.id);
                    condition(patient.resource.id);
                    vitalsigns(patient.resource.id);
                    laboratory(patient.resource.id);
                    immunization(patient.resource.id);
                });
            })
            .catch((err) => {
                if (isSelected(patientId)) showError('patient', err);
            });
    };

    // "/" goes to the patient search from anywhere but a field; on a phone, back to the list first
    $(document).on('keydown', function (e) {
        if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
        if ($(e.target).is('input, textarea, select, [contenteditable]') || $('.modal.show').length) return;
        e.preventDefault();
        if ($("#portal").hasClass('show-chart') && !$("#listPane").is(':visible')) $("#backToList").trigger('click');
        $("#searchClients").trigger('focus');
    });

    // Arrow keys move between the patients of the list, Home and End to the first and last; Enter opens one
    $("#listgroup").on('keydown', '.stretched-link', function (e) {
        const links = $('#listgroup .list-group-item:visible .stretched-link');
        const at = links.index(this);
        const to = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: links.length - 1 }[e.key];
        if (to === undefined || to < 0 || to >= links.length) return;
        e.preventDefault();
        links.eq(to).trigger('focus');
    });

    // Search the patients typed in the box, by name (shown or original) and FHIR id;
    // a search that matches nobody says so, with a way to clear it
    function filterList() {
        const term = $("#searchClients").val().trim().toLowerCase();
        let shown = 0;
        $("#listgroup .list-group-item").each(function () {
            const match = !term || $(this).data('search').indexOf(term) >= 0;
            $(this).toggle(match);
            if (match) shown++;
        });
        $("#noMatch").toggleClass('d-none', !(term && shown === 0 && $("#listgroup .list-group-item").length > 0));
        $("#noMatchTerm").text($("#searchClients").val().trim());
    }

    $("#searchClients").on('input keyup', filterList);
    $("#clearSearch").click(function (e) {
        e.preventDefault();
        $("#searchClients").val('').trigger('focus');
        filterList();
    });

    // A list item: initial, name, then age, sex and FHIR id
    function listItem(resource) {
        const patientId = resource.id;
        const name = displayName(resource);
        const original = getName(resource).trim();
        const age = ageOf(resource.birthDate);
        const meta = [
            age ? age + ' years' : '',
            resource.gender ? resource.gender.charAt(0).toUpperCase() + resource.gender.slice(1) : '',
            'ID ' + patientId
        ].filter((part) => part).join(' \u00b7 ');
        return $('<div class="list-group-item">')
            .attr({ id: patientId, role: 'listitem' })
            .data('search', [name, original, patientId].join(' ').toLowerCase())
            .on('click', (e) => {
                e.preventDefault();
                showChart();
                loadForm(patientId);
            })
            .append(
                // The link is what the keyboard reaches (Tab, then the arrows below); its name says who it opens
                $('<a href="#" class="stretched-link"></a>')
                    .attr('aria-label', (name || '(no name)') + ', FHIR Patient ID ' + patientId),
                $('<div class="list-group-item-figure">').append(
                    $('<div class="tile tile-circle bg-blue">').text(name ? name.slice(0, 1) : '?')
                ),
                $('<div class="list-group-item-body">').append(
                    $('<h4 class="list-group-item-title">').text(name || '(no name)').attr('title', original),
                    $('<p class="list-group-item-text">').text(meta)
                )
            );
    }

    // Perform a search to retrieve patient list, every page of it. While it runs, placeholder items
    // stand in for the list and the search box waits; the typed search applies to the new list.
    let deepLinked = false;

    function loadList() {
        $("#listgroup").empty().append(
            [1, 2, 3, 4].map(() => $('<div class="list-skeleton px-3 py-2" aria-hidden="true">').append(
                $('<div class="list-group-item-body">').append($('<span class="skeleton-line">'), $('<span class="skeleton-line short">'))
            ))
        ).attr('aria-busy', 'true');
        $("#searchClients, #reloadList").prop('disabled', true);
        $("#noMatch").addClass('d-none');

        searchAll({
            type: 'Patient',
            query: {
                _sort: '-_lastUpdated'
            }
        }).then((result) => {
            sessionStorage.removeItem(redirectKey);
            $("#listgroup").empty().append(result.entries.map((patient) => listItem(patient.resource)));
            // The patient open in the chart stays marked
            if (selectedPatientId) {
                $('#listgroup .list-group-item').filter((i, el) => el.id === String(selectedPatientId)).find('.stretched-link').attr('aria-current', 'true');
            }
            filterList();
            const linked = new URLSearchParams(window.location.search).get('id');
            if (linked && !deepLinked) {
                deepLinked = true;
                showChart();
                loadForm(linked);
            }
        })
        .catch((err) => {
            // No session (logged out or expired): the FHIR endpoint answers 401 (404 if the web app ever refuses it first).
            // The jQuery adapter of fhir.js rejects with { error: jqXHR }, so the status is on err.error.
            // Only the first request tells about the session: a next page that fails (an expired
            // queryId answers 404) goes to the normal error handling, never to the login.
            const status = httpStatus(err);
            if (!err.nextPage && (status === 401 || status === 404)) {
                // Redirect once: a refusal right after a redirect means the session is fine but the
                // FHIR endpoint refuses it (configuration), and redirecting again would loop forever
                if (!sessionStorage.getItem(redirectKey)) {
                    sessionStorage.setItem(redirectKey, '1');
                    window.location.href = entryPage;
                    return;
                }
                sessionStorage.removeItem(redirectKey);
                toastError('The FHIR server refused the request (HTTP ' + status + '). Check the /fhir/r4 configuration.');
                return;
            }
            showError('the patient list', err);
        })
        .then(() => {
            $("#listgroup .list-skeleton").remove();
            $("#listgroup").removeAttr('aria-busy');
            $("#searchClients, #reloadList").prop('disabled', false);
        });
    }

    loadList();



    // Perform a search to Immunization list for a specific patient
    window.immunization = function (patientId) {
        cardLoading('immunization');
        searchAll({
                type: 'Immunization',
                query: {
                    patient: patientId
                }
            }).then((result) => {
                if (!isSelected(patientId)) return;
                appendBundles(result.bundles);
                const rows = result.entries.map((immunization) => textRow([
                    immunization.resource.vaccineCode["coding"][0].display,
                    immunization.resource.occurrenceDateTime
                ], 1));
                cardLoaded('immunization', result.first.total || 0);
                $("#immunizationTable tbody").append(rows);
            })
            .catch((err) => {
                if (isSelected(patientId)) cardError('immunization', patientId, err);
            });
    };

    // Conditions: the active ones first, then the resolved and inactive, each group latest onset first.
    // A condition without clinicalStatus counts as active (the safer reading for a chart).
    const ACTIVE_CONDITION = ['active', 'recurrence', 'relapse'];

    function conditionStatus(resource) {
        const coding = ((resource.clinicalStatus || {}).coding || [])[0] || {};
        return coding.code || 'active';
    }

    window.condition = function (patientId) {
        cardLoading('condition');
        searchAll({
                type: 'Condition',
                query: {
                    patient: patientId
                }
            }).then((result) => {
                if (!isSelected(patientId)) return;
                appendBundles(result.bundles);
                const onset = (r) => r.onsetDateTime || (r.onsetPeriod && r.onsetPeriod.start) || '';
                const abatement = (r) => r.abatementDateTime || (r.abatementPeriod && r.abatementPeriod.start) || '';
                const conditions = result.entries.map((e) => e.resource).map((r) => ({
                    r: r,
                    status: conditionStatus(r),
                    active: ACTIVE_CONDITION.indexOf(conditionStatus(r)) >= 0
                }));
                conditions.sort((a, b) => (b.active - a.active) || onset(b.r).localeCompare(onset(a.r)));
                const rows = conditions.map((c) => textRow([
                    conceptText(c.r.code),
                    c.status.charAt(0).toUpperCase() + c.status.slice(1),
                    onset(c.r),
                    abatement(c.r)
                ], 2).each(function () {
                    // The resolution date is a date column too
                    const cell = $(this).children().eq(3);
                    const value = cell.text();
                    if (value) cell.text(readableDate(value)).attr('title', value);
                }).toggleClass('condition-inactive', !c.active));
                cardLoaded('condition', result.first.total || 0);
                $("#conditionTable tbody").append(rows);

                // The count in the summary: how many are active, a link to their card
                const active = conditions.filter((c) => c.active).length;
                if (active > 0) {
                    $("#conditionAlert").removeClass('d-none').text(active + (active === 1 ? ' active condition' : ' active conditions'));
                }
            })
            .catch((err) => {
                if (isSelected(patientId)) cardError('condition', patientId, err);
            });
    };

    // Perform a search to Allergy list for a specific patient
    window.allergy = function (patientId) {
        cardLoading('allergy');
        searchAll({
                type: 'AllergyIntolerance',
                query: {
                    patient: patientId
                }
            }).then((result) => {
                if (!isSelected(patientId)) return;
                // The alert in the summary: how many allergies, a link to their card
                const allergies = result.entries.length;
                if (allergies > 0) {
                    $("#allergyAlert").removeClass('d-none').text(allergies + (allergies === 1 ? ' allergy' : ' allergies'));
                }

                appendBundles(result.bundles);
                const rows = result.entries.map((allergy) => textRow([
                    allergy.resource.code.coding[0].display,
                    allergy.resource.type,
                    allergy.resource.category[0],
                    allergy.resource.criticality
                ]));
                cardLoaded('allergy', result.first.total || 0);
                $("#allergyTable tbody").append(rows);
            })
            .catch((err) => {
                if (isSelected(patientId)) cardError('allergy', patientId, err);
            });
    };

    // Perform a search to Vital Signs list for a specific patient
    window.vitalsigns = function (patientId) {
        cardLoading('vitalsigns');
        searchAll({
                type: 'Observation',
                query: {
                    patient: patientId,
                    category: 'vital-signs',
                    _sort: 'date'
                }
            }).then((result) => {
                if (!isSelected(patientId)) return;
                appendBundles(result.bundles);
                // Oldest first (_sort=date): the last row of each measure is its latest value.
                // The older ones stay in the table, hidden until Show all.
                const values = [];
                result.entries.forEach((vitalsigns) => {
                    observationRows(vitalsigns.resource).forEach((v) => values.push(v));
                });
                const latest = new Map();
                values.forEach((v, i) => latest.set(v[0], i));
                const rows = values.map((v, i) => textRow(v, 3).toggleClass('vital-history d-none', latest.get(v[0]) !== i));
                cardLoaded('vitalsigns', result.first.total || 0);
                $("#vitalSignsTable tbody").append(rows);
                const history = values.length - latest.size;
                $("#vitalsShowAll").toggleClass('d-none', history === 0).attr('aria-expanded', 'false')
                    .text('Show all (' + values.length + ')');
            })
            .catch((err) => {
                if (isSelected(patientId)) cardError('vitalsigns', patientId, err);
            });
    };

    window.laboratory = function (patientId) {
        cardLoading('laboratory');
        resetLabChart();
        searchAll({
                type: 'Observation',
                query: {
                    patient: patientId,
                    category: 'laboratory',
                    _sort: 'date'
                }
            }).then((result) => {
                if (!isSelected(patientId)) return;

                appendBundles(result.bundles);
                // Grouped by day, the latest day first; a row per test, its value flagged High or Low
                const days = new Map();
                labTests = new Map();
                result.entries.forEach((laboratory) => {
                    labRows(laboratory.resource).forEach((lab) => {
                        const day = lab.date.slice(0, 10);
                        if (!days.has(day)) days.set(day, []);
                        days.get(day).push(lab);
                        if (lab.code) labTests.set(lab.code, { unit: lab.unit, range: lab.range });
                    });
                });
                const rows = [];
                Array.from(days.keys()).reverse().forEach((day) => {
                    const labs = days.get(day);
                    rows.push($('<tr class="lab-date">').append(
                        $('<th scope="colgroup" colspan="4">').text(readableDate(labs[0].date) || 'No date').attr('title', labs[0].date)
                    ));
                    labs.forEach((lab) => {
                        const value = $('<td>').text(lab.value);
                        if (lab.flag) {
                            value.addClass('value-abnormal').append(
                                $('<span class="value-flag">').append(
                                    $('<span aria-hidden="true">').text(lab.flag === 'High' ? ' \u2191' : ' \u2193'),
                                    $('<span class="value-flag-text">').text(' ' + lab.flag)
                                )
                            );
                        }
                        rows.push($('<tr>').append($('<td>').text(lab.name), value, $('<td>').text(lab.unit), $('<td>').text(rangeText(lab.range))));
                    });
                });
                cardLoaded('laboratory', result.first.total || 0);
                $("#laboratoryTable tbody").append(rows);
                if (result.entries.length > 0) loadLabOptions(patientId);
            })
            .catch((err) => {
                if (isSelected(patientId)) cardError('laboratory', patientId, err);
            });
    };

    // ---- Lab chart of the Laboratory card: the tests and values come from /fhir/api (SQL, article 4),
    // drawn with Chart.js 4; the unit and reference range come from the FHIR results of the card (labTests)

    // The theme (theme.min.js) sets its font as a Chart.js 2 global, which Chart.js 4 ignores
    if (window.Chart) {
        Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Fira Sans", "Helvetica Neue", "Apple Color Emoji", sans-serif';
        // Numbers and dates on the axes in English, like the rest of the interface
        Chart.defaults.locale = 'en-US';
    }

    // One chart at a time: the previous one is destroyed before drawing the next
    let chart = null;
    // Only the latest request may draw: an older response arriving late is ignored
    let latestLabRequest = 0;

    // A failed /fhir/api call: 401 means the session ended (back to the login, once, like the list);
    // anything else is a toast "Could not load <what> (HTTP <status>)"
    function apiFailed(what, jqXHR) {
        if (unloading) return;
        const status = jqXHR && typeof jqXHR.status === 'number' ? jqXHR.status : null;
        if (status === 401) {
            if (!sessionStorage.getItem(redirectKey)) {
                sessionStorage.setItem(redirectKey, '1');
                window.location.href = entryPage;
                return;
            }
            sessionStorage.removeItem(redirectKey);
            toastError('The FHIR API refused the request (HTTP 401). Check the /fhir/api configuration.');
        } else if (status === 0) {
            toastError('Could not load ' + what + ' (no response from the server)');
        } else if (status) {
            toastError('Could not load ' + what + ' (HTTP ' + status + ')');
        } else {
            console.error('Could not load ' + what, jqXHR);
            toastError('Could not load ' + what);
        }
    }

    function resetLabChart() {
        latestLabRequest++;
        if (chart) {
            chart.destroy();
            chart = null;
        }
        $("#labChartSection").addClass('d-none');
        $("#labtest").empty();
        $("#testName, #chartEmpty").text('');
        $("#chartEmpty").addClass('d-none');
        // No space for the chart until a test is drawn
        $("#chartBox").addClass('d-none');
        describeChart('', []);
    }

    // The tests of the patient, from /fhir/api/laboptions; choosing one draws its chart
    function loadLabOptions(patientId) {
        $.getJSON('/fhir/api/laboptions/' + encodeURIComponent(patientId), function (options) {
            if (!isSelected(patientId)) return;
            $("#labtest").empty().append($('<option value="">').text('Choose a test…'),
                options.map((o) => $('<option>').val(o.code).text(o.name)));
            $("#labChartSection").toggleClass('d-none', options.length === 0);
        }).fail(function (jqXHR) {
            if (isSelected(patientId)) apiFailed('lab tests', jqXHR);
        });
    }

    $("#labtest").on('change', function () {
        if ($(this).val()) drawLabChart(selectedPatientId, $(this).val(), $(this).find('option:selected').text());
    });

    // Text alternative of the chart: its name on the canvas and every plotted point in a table only screen readers see
    function describeChart(label, points) {
        $("#myChart").attr('aria-label', label
            ? 'Lab results chart of ' + label + ', ' + points.length + ' results, listed in the table below'
            : 'Lab results chart');
        $("#labTable caption").text(label);
        $("#labTable tbody").empty().append(points.map((e) => $('<tr>').append($('<td>').text(e.date), $('<td>').text(e.value))));
    }

    function drawLabChart(patientId, code, label) {
        const request = ++latestLabRequest;
        $.getJSON('/fhir/api/patient/' + encodeURIComponent(patientId) + '/lab/' + encodeURIComponent(code), function (results) {
            if (request !== latestLabRequest || !isSelected(patientId)) return;
            // Only numeric results can be plotted
            const points = results.filter((e) => e.value !== null && e.value !== '' && !isNaN(Number(e.value)));
            const test = labTests.get(code) || {};
            if (chart) {
                chart.destroy();
                chart = null;
            }
            $("#testName").text(label);
            describeChart(label, points);
            $("#chartEmpty").toggleClass('d-none', points.length > 0).text(points.length ? '' : label + ' has no numeric results to chart.');
            $("#chartBox").toggleClass('d-none', points.length === 0);
            if (!points.length) return;

            const data = points.map((e) => ({ x: e.date, y: Number(e.value) }));
            const datasets = [{
                label: label,
                data: data,
                borderColor: 'rgb(52, 108, 176)',
                backgroundColor: 'rgba(52, 108, 176, 0.15)',
                fill: true
            }];
            // The reference range as a band behind the line, from the first to the last date
            const range = test.range || {};
            const low = range.low && range.low.value;
            const high = range.high && range.high.value;
            if (typeof low === 'number' && typeof high === 'number') {
                const edges = [data[0].x, data[data.length - 1].x];
                const band = { pointRadius: 0, borderWidth: 0, borderColor: 'transparent' };
                datasets.push(Object.assign({ label: 'Reference low', data: edges.map((x) => ({ x: x, y: low })), fill: false }, band));
                datasets.push(Object.assign({ label: 'Reference range', data: edges.map((x) => ({ x: x, y: high })), fill: '-1', backgroundColor: 'rgba(0, 162, 138, 0.12)' }, band));
            }
            chart = new Chart(document.getElementById('myChart'), {
                type: 'line',
                data: { datasets: datasets },
                options: {
                    // No legend: the heading above names the test
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { type: 'time' },
                        y: { title: { display: Boolean(test.unit), text: test.unit || '' } }
                    }
                }
            });
        }).fail(function (jqXHR) {
            if (request === latestLabRequest) apiFailed('lab results', jqXHR);
        });
    }

    // ---- Timeline: every dated event of the patient, from one call to Patient/$everything

    // The tab that is shown: the clinical cards (chart) or the timeline. The timeline loads the first time it is opened.
    let timelineFor = null;

    function showTab(tab) {
        const timeline = tab === 'timeline';
        $("#tabChart").toggleClass('active', !timeline).attr({ 'aria-selected': String(!timeline), tabindex: timeline ? '-1' : '0' });
        $("#tabTimeline").toggleClass('active', timeline).attr({ 'aria-selected': String(timeline), tabindex: timeline ? '0' : '-1' });
        $("#chartView").toggleClass('d-none', timeline);
        $("#timelineView").toggleClass('d-none', !timeline);
        if (timeline && timelineFor !== selectedPatientId) loadTimeline(selectedPatientId);
    }

    $("#tabChart").click(() => showTab('chart'));
    $("#tabTimeline").click(() => showTab('timeline'));
    // Arrow keys move between the two tabs (the tab pattern)
    $(".chart-tabs").on('keydown', '.nav-link', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const other = this.id === 'tabChart' ? '#tabTimeline' : '#tabChart';
        $(other).trigger('click').trigger('focus');
    });

    // The event a resource stands for: its type, its date and what to call it; null when it has no date
    const TIMELINE_TYPES = {
        Encounter: { label: 'Encounters', date: (r) => r.period && r.period.start, text: (r) => conceptText((r.type || [])[0]) || (r.class && (r.class.display || r.class.code)) || 'Encounter' },
        Condition: { label: 'Conditions', date: (r) => r.onsetDateTime || (r.onsetPeriod && r.onsetPeriod.start) || r.recordedDate, text: (r) => conceptText(r.code) },
        Procedure: { label: 'Procedures', date: (r) => r.performedDateTime || (r.performedPeriod && r.performedPeriod.start), text: (r) => conceptText(r.code) },
        Immunization: { label: 'Immunizations', date: (r) => r.occurrenceDateTime, text: (r) => conceptText(r.vaccineCode) },
        MedicationRequest: { label: 'Medications', date: (r) => r.authoredOn, text: (r) => conceptText(r.medicationCodeableConcept) || (r.medicationReference && r.medicationReference.display) || 'Medication' },
        DiagnosticReport: { label: 'Reports', date: (r) => r.effectiveDateTime || (r.effectivePeriod && r.effectivePeriod.start) || r.issued, text: (r) => conceptText(r.code) }
    };

    function timelineEvent(resource) {
        const type = TIMELINE_TYPES[resource.resourceType];
        const date = type && type.date(resource);
        return date ? { type: resource.resourceType, date: date, text: type.text(resource) || resource.resourceType } : null;
    }

    // Every page of $everything, following link[next] (the IRIS server answers with one page today)
    function everything(patientId) {
        const resources = [];
        const seen = new Set();
        const page = (url) => $.ajax({ url: url, headers: { Accept: 'application/fhir+json' }, dataType: 'json' }).then((bundle) => {
            entries(bundle).forEach((e) => resources.push(e.resource));
            const next = bundleLink(bundle, 'next');
            if (next && !seen.has(next)) {
                seen.add(next);
                // Same host as the page, where the session cookie applies
                const u = new URL(next, window.location.origin);
                return page(u.pathname + u.search);
            }
            return resources;
        });
        return page('/fhir/r4/Patient/' + encodeURIComponent(patientId) + '/$everything');
    }

    function timelineState(content) {
        $("#timelineFilters").empty();
        $("#timelineBody").empty().append(content);
    }

    function loadTimeline(patientId) {
        timelineFor = patientId;
        $("#timelineBody").attr('aria-busy', 'true');
        timelineState([$('<span class="skeleton-line" aria-hidden="true">'), $('<span class="skeleton-line short" aria-hidden="true">')]);
        everything(patientId).then((resources) => {
            if (!isSelected(patientId) || timelineFor !== patientId) return;
            $("#timelineBody").removeAttr('aria-busy');
            const events = resources.map(timelineEvent).filter((e) => e);
            // Latest first: ISO dates sort as text
            events.sort((a, b) => b.date.localeCompare(a.date));
            if (!events.length) {
                timelineState($('<p class="text-muted mb-0">').text('No events recorded.'));
                return;
            }
            renderTimeline(events);
        }, (jqXHR) => {
            if (!isSelected(patientId) || timelineFor !== patientId) return;
            $("#timelineBody").removeAttr('aria-busy');
            timelineFor = null;
            showError('the timeline', { error: jqXHR });
            timelineState($('<p class="mb-0">').append(
                document.createTextNode("Couldn't load the timeline. "),
                $('<button type="button" class="btn btn-link btn-sm p-0 card-retry">').text('Try again').on('click', () => loadTimeline(patientId))
            ));
        });
    }

    function renderTimeline(events) {
        // One filter button per type present, with its count; all pressed at first
        const counts = {};
        events.forEach((e) => { counts[e.type] = (counts[e.type] || 0) + 1; });
        $("#timelineFilters").empty().append(Object.keys(TIMELINE_TYPES).filter((t) => counts[t]).map((t) =>
            $('<button type="button" class="btn btn-sm btn-outline-primary timeline-filter active" aria-pressed="true">')
                .attr('data-type', t).text(TIMELINE_TYPES[t].label + ' (' + counts[t] + ')')
                .on('click', function () {
                    const on = $(this).attr('aria-pressed') !== 'true';
                    $(this).attr('aria-pressed', String(on)).toggleClass('active', on);
                    filterTimeline();
                })
        ));
        // Grouped by year, latest year first
        const years = new Map();
        events.forEach((e) => {
            const year = e.date.slice(0, 4);
            if (!years.has(year)) years.set(year, []);
            years.get(year).push(e);
        });
        $("#timelineBody").empty().append(Array.from(years.keys()).map((year) => $('<section class="timeline-year">').append(
            $('<h3 class="h6 timeline-year-title">').text(year),
            $('<ol class="timeline-events list-unstyled mb-0">').append(years.get(year).map((e) =>
                $('<li class="timeline-event">').attr('data-type', e.type).append(
                    $('<span class="timeline-date">').text(readableDate(e.date)).attr('title', e.date),
                    $('<span class="timeline-type">').text(TIMELINE_TYPES[e.type].label),
                    $('<span class="timeline-text">').text(e.text)
                )
            ))
        )));
    }

    // Only the event types whose button is pressed; a year with nothing left to show goes away
    function filterTimeline() {
        const shown = new Set($("#timelineFilters .timeline-filter[aria-pressed='true']").map((i, b) => $(b).attr('data-type')).get());
        $("#timelineBody .timeline-event").each(function () {
            $(this).toggleClass('d-none', !shown.has($(this).attr('data-type')));
        });
        $("#timelineBody .timeline-year").each(function () {
            $(this).toggleClass('d-none', $(this).find('.timeline-event:not(.d-none)').length === 0);
        });
    }

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
        }).then(function (res) {
            saveToast(true);
            showMaskedSSN();
            $("#updateData").prop('disabled', false).text('Save');
            // The server's copy (a new meta.versionId) feeds the summary and the FHIR JSON panel
            if (res && res.data && res.data.resourceType === 'Patient') {
                objPatient.resource = res.data;
            }
            showSummary(objPatient.resource);
            $('#fhirdatasource').val(patientJSON(objPatient.resource));
            $("#editModal").modal('hide');
        }, function () {
            // The modal stays open with what was typed, and says what happened
            saveToast(false);
            $("#editError").removeClass('d-none').text("Couldn't save the patient. Try again.");
            $("#updateData").prop('disabled', false).text('Save');
        });
    };

});