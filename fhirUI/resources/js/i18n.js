// Interface texts in English (the default, as in the articles) and Brazilian Portuguese.
// Only the interface is translated: clinical data from FHIR is shown as the server sends it.
// The language is kept in this browser; changing it reloads the page, so every part starts in it.
(function () {
    const TEXTS = {
        en: {
            'header.user': 'Logged in user',
            'header.logout': 'Log out',
            'header.language': 'Language',
            'list.title': 'Patients',
            'list.search': 'Find Patients (press /)',
            'list.searchLabel': 'Find patients by name or FHIR ID',
            'list.clear': 'Clear search',
            'list.reload': 'Reload the patient list',
            'list.noMatch': 'No patients match "{term}".',
            'list.item': '{name}, FHIR Patient ID {id}',
            'noName': '(no name)',
            'years': '{n} years',
            'chart.label': 'Patient chart',
            'back': 'Back to patients',
            'emptyState': 'Select a patient to see their chart.',
            'summary.born': 'Born {date}',
            'summary.allergies.one': '{n} allergy',
            'summary.allergies.other': '{n} allergies',
            'summary.conditions.one': '{n} active condition',
            'summary.conditions.other': '{n} active conditions',
            'gender.male': 'Male',
            'gender.female': 'Female',
            'gender.other': 'Other',
            'gender.unknown': 'Unknown',
            'reveal': 'Reveal',
            'edit': 'Edit',
            'tab.chart': 'Chart',
            'tab.timeline': 'Timeline',
            'timeline.title': 'Timeline',
            'timeline.filters': 'Show event types',
            'timeline.empty': 'No events recorded.',
            'source.fhir': 'Loaded with fhir.js from /fhir/r4',
            'source.sql': 'Loaded with SQL from /fhir/api',
            'source.everything': 'Loaded with one call to Patient/$everything on /fhir/r4',
            'card.allergies': 'Allergies',
            'card.conditions': 'Conditions',
            'card.vitals': 'Vital signs',
            'card.lab': 'Laboratory',
            'card.immunizations': 'Immunizations',
            'card.medications': 'Medications',
            'col.medication': 'Medication',
            'col.dose': 'Dose',
            'empty.medication': 'No medications recorded.',
            'what.medication': 'medications',
            'meds.noActive': 'No active medications.',
            'dose.asNeeded': 'as needed',
            'dose.timing': '{frequency}× every {period} {unit}',
            'medStatus.active': 'Active',
            'medStatus.on-hold': 'On hold',
            'medStatus.cancelled': 'Cancelled',
            'medStatus.completed': 'Completed',
            'medStatus.stopped': 'Stopped',
            'medStatus.draft': 'Draft',
            'medStatus.entered-in-error': 'Entered in error',
            'medStatus.unknown': 'Unknown',
            'col.allergy': 'Allergy',
            'col.type': 'Type',
            'col.category': 'Category',
            'col.criticality': 'Criticality',
            'col.condition': 'Condition',
            'col.status': 'Status',
            'col.onset': 'Onset',
            'col.resolved': 'Resolved',
            'col.measure': 'Measure',
            'col.value': 'Value',
            'col.unit': 'Unit',
            'col.date': 'Date',
            'col.test': 'Test',
            'col.range': 'Reference range',
            'col.vaccine': 'Vaccine',
            'vitals.hint': 'The latest value of each measure; Show all lists the history.',
            'showAll': 'Show all ({n})',
            'showLatest': 'Show latest',
            'chart.pick': 'Chart a test',
            'chart.choose': 'Choose a test…',
            'chart.aria': 'Lab results chart',
            'chart.ariaOf': 'Lab results chart of {label}, {n} results, listed in the table below',
            'chart.noNumeric': '{label} has no numeric results to chart.',
            'lab.noDate': 'No date',
            'flag.High': 'High',
            'flag.Low': 'Low',
            'empty.allergy': 'No allergies recorded.',
            'empty.condition': 'No conditions recorded.',
            'empty.vitalsigns': 'No vital signs recorded.',
            'empty.laboratory': 'No lab results recorded.',
            'empty.immunization': 'No immunizations recorded.',
            'what.allergy': 'allergies',
            'what.condition': 'conditions',
            'what.vitalsigns': 'vital signs',
            'what.laboratory': 'laboratory results',
            'what.immunization': 'immunizations',
            'what.patient': 'patient',
            'what.patientList': 'the patient list',
            'what.timeline': 'the timeline',
            'what.labTests': 'lab tests',
            'what.labResults': 'lab results',
            'error.card': "Couldn't load {what}.",
            'error.load': 'Could not load {what}',
            'error.loadStatus': 'Could not load {what} (HTTP {status})',
            'error.noResponse': 'Could not load {what} (no response from the server)',
            'error.fhirRefused': 'The FHIR server refused the request (HTTP {status}). Check the /fhir/r4 configuration.',
            'error.apiRefused': 'The FHIR API refused the request (HTTP 401). Check the /fhir/api configuration.',
            'tryAgain': 'Try again',
            'type.Encounter': 'Encounters',
            'type.Condition': 'Conditions',
            'type.Procedure': 'Procedures',
            'type.Immunization': 'Immunizations',
            'type.MedicationRequest': 'Medications',
            'type.DiagnosticReport': 'Reports',
            'status.active': 'Active',
            'status.recurrence': 'Recurrence',
            'status.relapse': 'Relapse',
            'status.inactive': 'Inactive',
            'status.remission': 'Remission',
            'status.resolved': 'Resolved',
            'copied': 'Copied.',
            'copy': 'Copy',
            'saved': 'Saved.',
            'saveError': "Couldn't save the patient. Try again.",
            'saving': 'Saving…',
            'save': 'Save',
            'cancel': 'Cancel',
            'close': 'Close',
            'edit.title': 'Edit patient',
            'form.fhirId': 'FHIR Patient ID',
            'form.first': 'First name',
            'form.last': 'Last name',
            'form.dob': 'Date of Birth',
            'form.gender': 'Gender',
            'form.choose': 'Choose...',
            'form.address': 'Address',
            'form.city': 'City',
            'form.state': 'State',
            'form.country': 'Country'
        },
        'pt-BR': {
            'header.user': 'Usuário conectado',
            'header.logout': 'Sair',
            'header.language': 'Idioma',
            'list.title': 'Pacientes',
            'list.search': 'Buscar pacientes (tecle /)',
            'list.searchLabel': 'Buscar pacientes por nome ou FHIR ID',
            'list.clear': 'Limpar busca',
            'list.reload': 'Recarregar a lista de pacientes',
            'list.noMatch': 'Nenhum paciente corresponde a "{term}".',
            'list.item': '{name}, FHIR ID do paciente {id}',
            'noName': '(sem nome)',
            'years': '{n} anos',
            'chart.label': 'Prontuário do paciente',
            'back': 'Voltar aos pacientes',
            'emptyState': 'Selecione um paciente para ver o prontuário.',
            'summary.born': 'Nascimento: {date}',
            'summary.allergies.one': '{n} alergia',
            'summary.allergies.other': '{n} alergias',
            'summary.conditions.one': '{n} condição ativa',
            'summary.conditions.other': '{n} condições ativas',
            'gender.male': 'Masculino',
            'gender.female': 'Feminino',
            'gender.other': 'Outro',
            'gender.unknown': 'Desconhecido',
            'reveal': 'Revelar',
            'edit': 'Editar',
            'tab.chart': 'Prontuário',
            'tab.timeline': 'Linha do tempo',
            'timeline.title': 'Linha do tempo',
            'timeline.filters': 'Mostrar tipos de evento',
            'timeline.empty': 'Nenhum evento registrado.',
            'source.fhir': 'Carregado com fhir.js de /fhir/r4',
            'source.sql': 'Carregado com SQL de /fhir/api',
            'source.everything': 'Carregado com uma chamada a Patient/$everything em /fhir/r4',
            'card.allergies': 'Alergias',
            'card.conditions': 'Condições',
            'card.vitals': 'Sinais vitais',
            'card.lab': 'Laboratório',
            'card.immunizations': 'Vacinas',
            'card.medications': 'Medicações',
            'col.medication': 'Medicação',
            'col.dose': 'Dose',
            'empty.medication': 'Nenhuma medicação registrada.',
            'what.medication': 'medicações',
            'meds.noActive': 'Nenhuma medicação ativa.',
            'dose.asNeeded': 'se necessário',
            'dose.timing': '{frequency}× a cada {period} {unit}',
            'medStatus.active': 'Ativa',
            'medStatus.on-hold': 'Em espera',
            'medStatus.cancelled': 'Cancelada',
            'medStatus.completed': 'Concluída',
            'medStatus.stopped': 'Suspensa',
            'medStatus.draft': 'Rascunho',
            'medStatus.entered-in-error': 'Registrada por engano',
            'medStatus.unknown': 'Desconhecida',
            'col.allergy': 'Alergia',
            'col.type': 'Tipo',
            'col.category': 'Categoria',
            'col.criticality': 'Criticidade',
            'col.condition': 'Condição',
            'col.status': 'Situação',
            'col.onset': 'Início',
            'col.resolved': 'Resolução',
            'col.measure': 'Medida',
            'col.value': 'Valor',
            'col.unit': 'Unidade',
            'col.date': 'Data',
            'col.test': 'Exame',
            'col.range': 'Faixa de referência',
            'col.vaccine': 'Vacina',
            'vitals.hint': 'O último valor de cada medida; Mostrar tudo lista o histórico.',
            'showAll': 'Mostrar tudo ({n})',
            'showLatest': 'Mostrar os últimos',
            'chart.pick': 'Gráfico do exame',
            'chart.choose': 'Escolha um exame…',
            'chart.aria': 'Gráfico de resultados de exames',
            'chart.ariaOf': 'Gráfico de {label}, {n} resultados, listados na tabela abaixo',
            'chart.noNumeric': '{label} não tem resultados numéricos para o gráfico.',
            'lab.noDate': 'Sem data',
            'flag.High': 'Alto',
            'flag.Low': 'Baixo',
            'empty.allergy': 'Nenhuma alergia registrada.',
            'empty.condition': 'Nenhuma condição registrada.',
            'empty.vitalsigns': 'Nenhum sinal vital registrado.',
            'empty.laboratory': 'Nenhum resultado de exame registrado.',
            'empty.immunization': 'Nenhuma vacina registrada.',
            'what.allergy': 'alergias',
            'what.condition': 'condições',
            'what.vitalsigns': 'sinais vitais',
            'what.laboratory': 'resultados de exames',
            'what.immunization': 'vacinas',
            'what.patient': 'o paciente',
            'what.patientList': 'a lista de pacientes',
            'what.timeline': 'a linha do tempo',
            'what.labTests': 'os exames',
            'what.labResults': 'os resultados do exame',
            'error.card': 'Não foi possível carregar {what}.',
            'error.load': 'Não foi possível carregar {what}',
            'error.loadStatus': 'Não foi possível carregar {what} (HTTP {status})',
            'error.noResponse': 'Não foi possível carregar {what} (sem resposta do servidor)',
            'error.fhirRefused': 'O servidor FHIR recusou a requisição (HTTP {status}). Verifique a configuração do /fhir/r4.',
            'error.apiRefused': 'A API FHIR recusou a requisição (HTTP 401). Verifique a configuração do /fhir/api.',
            'tryAgain': 'Tentar de novo',
            'type.Encounter': 'Encontros',
            'type.Condition': 'Condições',
            'type.Procedure': 'Procedimentos',
            'type.Immunization': 'Vacinas',
            'type.MedicationRequest': 'Medicações',
            'type.DiagnosticReport': 'Laudos',
            'status.active': 'Ativa',
            'status.recurrence': 'Recorrência',
            'status.relapse': 'Recaída',
            'status.inactive': 'Inativa',
            'status.remission': 'Remissão',
            'status.resolved': 'Resolvida',
            'copied': 'Copiado.',
            'copy': 'Copiar',
            'saved': 'Salvo.',
            'saveError': 'Não foi possível salvar o paciente. Tente de novo.',
            'saving': 'Salvando…',
            'save': 'Salvar',
            'cancel': 'Cancelar',
            'close': 'Fechar',
            'edit.title': 'Editar paciente',
            'form.fhirId': 'FHIR ID do paciente',
            'form.first': 'Nome',
            'form.last': 'Sobrenome',
            'form.dob': 'Data de nascimento',
            'form.gender': 'Sexo',
            'form.choose': 'Escolha...',
            'form.address': 'Endereço',
            'form.city': 'Cidade',
            'form.state': 'Estado',
            'form.country': 'País'
        }
    };

    // Dates are written from their own digits (no time zone shift): "Sep 3, 2014" or "3 de set. de 2014"
    const DATES = {
        en: {
            months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            day: (d, m, y) => m + ' ' + d + ', ' + y,
            month: (m, y) => m + ' ' + y
        },
        'pt-BR': {
            months: ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'],
            day: (d, m, y) => d + ' de ' + m + ' de ' + y,
            month: (m, y) => m + ' de ' + y
        }
    };

    const STORE = 'fhirPortalLang';
    let lang = 'en';
    try {
        const saved = localStorage.getItem(STORE);
        if (TEXTS[saved]) lang = saved;
    } catch (e) {
        // No storage (private window, blocked): English
    }
    document.documentElement.lang = lang;

    // The text of a key in the language, with {name} placeholders filled; English when a key is missing
    function t(key, params) {
        let text = TEXTS[lang][key];
        if (text === undefined) text = TEXTS.en[key];
        if (text === undefined) return key;
        return params ? text.replace(/\{(\w+)\}/g, (match, name) => (params[name] === undefined ? match : String(params[name]))) : text;
    }

    // One or more: "1 allergy", "2 allergies"
    function plural(key, n) {
        return t(key + (n === 1 ? '.one' : '.other'), { n: n });
    }

    function readableDate(value) {
        const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(value || '');
        if (!m) return value || '';
        if (!m[2]) return m[1];
        const format = DATES[lang];
        const month = format.months[Number(m[2]) - 1];
        return m[3] ? format.day(Number(m[3]), month, m[1]) : format.month(month, m[1]);
    }

    // At most two decimals, with the separators of the language ("6.72" or "6,72")
    function formatNumber(value) {
        return new Intl.NumberFormat(lang === 'pt-BR' ? 'pt-BR' : 'en-US', { maximumFractionDigits: 2 }).format(Number(value));
    }

    // Fill the static texts: data-i18n="key" sets the text, data-i18n-attr="attr:key;attr:key" the attributes
    function apply(root) {
        (root || document).querySelectorAll('[data-i18n]').forEach((el) => {
            el.textContent = t(el.getAttribute('data-i18n'));
        });
        (root || document).querySelectorAll('[data-i18n-attr]').forEach((el) => {
            el.getAttribute('data-i18n-attr').split(';').forEach((pair) => {
                const [attr, key] = pair.split(':');
                if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
            });
        });
    }

    function setLang(next) {
        try {
            localStorage.setItem(STORE, next);
        } catch (e) {
            // Not kept: the page still changes until it is reloaded
        }
    }

    // The date picker of the Edit form speaks the language too (its pt locale is in the vendor manifest)
    if (lang === 'pt-BR' && window.flatpickr && flatpickr.l10ns && flatpickr.l10ns.pt) {
        flatpickr.localize(flatpickr.l10ns.pt);
    }

    window.I18N = {
        lang: lang,
        locale: lang === 'pt-BR' ? 'pt-BR' : 'en-US',
        t: t,
        plural: plural,
        readableDate: readableDate,
        formatNumber: formatNumber,
        apply: apply,
        setLang: setLang
    };
    apply(document);
})();
