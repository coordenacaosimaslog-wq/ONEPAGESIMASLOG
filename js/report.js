/**
 * Simas Group - One Page Report Logic
 * Handles Multi-Operation data persistence and rendering.
 */

const ReportApp = {
    // Current State
    currentOp: 'MATRIZ',
    currentDateYMD: new Date().toISOString().split('T')[0],
    data: {},
    fkCharts: [],
    waterChartInstance: null,
    maintChartInstances: [],
    complaintsChartInstance: null,
    // Institutional Color Palette
    colors: {
        blueMain: '#30388F',
        blueScale: ['#30388F', '#4F63C6', '#7C8FEA', '#A9B7F5', '#D9E1FF'],
        status: {
            green: '#2FBF71',
            yellow: '#F5B700',
            red: '#E5533D'
        },
        grid: '#f1f5f9',
        text: '#475569'
    },
    complaintsStatusChartInstance: null,
    ncChartInstance: null,
    dqChartInstance: null,
    ncStatusChartInstance: null,
    dqStatusChartInstance: null,
    trainingChartInstance: null,
    trainingObjChartInstance: null,
    trainingModChartInstance: null,
    donoRuaTop5ChartInstance: null,
    galpaoDonutChartInstance: null,
    lupsChartInstance: null,
    currentWaterMonthKey: null,

    // Default Template for new Operations
    defaultTemplate: {
        manager: '',
        area: 'Qualidade',
        version: '1.0',
        date: new Date().toLocaleDateString('pt-BR'),
        intro: '',
        licenses: Array(4).fill({ name: '', date: '' }),
        safety: {
            status: 'sem_acidente',
            month: new Date().getMonth().toString(),
            year: '2026',
            indicator: '0',
            record: '0',
            current_days: '0',
            lost_time: '0',
            no_lost_time: '0',
            last_accident_date: '',
            cross: {},
            obs: '',
            images: ['', '', ''],
            sc_open: '0',
            sc_closed: '0',
            sc_rejected: '0',
            sc_total: '0'
        },
        qm: {
            reclamacoes: 0,
            solucionadas: 0,
            nao_solucionadas: 0,
            month: new Date().getMonth().toString(),
            year: '2026',
            complaints: Array(5).fill({ type: '', qty: 0 }),
            complaintsStatus: { open: 0, closed: 0, invalid: 0 },
            nonConformities: {
                nc: Array(12).fill(0),
                dq: Array(12).fill(0),
                ncStatus: { open: 0, closed: 0 },
                dqStatus: { open: 0, closed: 0 }
            }
        },
        top3: [
            { desc: '', crit: 'baixa', resp: '', evol: 0 },
            { desc: '', crit: 'baixa', resp: '', evol: 0 },
            { desc: '', crit: 'baixa', resp: '', evol: 0 }
        ],
        trainings: {
            monthlyProg: Array(12).fill(0),
            monthlyReal: Array(12).fill(0),
            objective: { dev: 0, rec: 0, hom: 0 },
            modality: { ead: 0, ext: 0, pres: 0 },
            kpi: { prog: 0, real: 0, atras: 0 }
        },
        forklifts: [
            {
                series: 'SÉRIE 01',
                monthlyHours: Array(12).fill(0),
                monthlyChecklist: Array(12).fill(0),
                maint: { last: 0, now: 0, next: 0 }
            },
            {
                series: 'SÉRIE 02',
                monthlyHours: Array(12).fill(0),
                monthlyChecklist: Array(12).fill(0),
                maint: { last: 0, now: 0, next: 0 }
            }
        ],
        forkliftWater: [0, 0, 0, 0],
        donoRua: {
            names: ['', '', '', '', ''],
            scores: [0, 0, 0, 0, 0]
        },
        galpao: {
            insatisfatorio: 0,
            toleravel: 0,
            satisfatorio: 0
        },
        performance: {
            best: { name: '', score: 0, gender: 'male' },
            worst: { name: '', score: 0, gender: 'male' }
        },
        lups: [],
        melhorias: [],
        birdPyramid: {
            levels: ['1', '10', '30', '600', '1000', '10000'],
            labels: [
                'ACIDENTES GRAVES OU FATAIS',
                'ACIDENTES COM AFASTAMENTO',
                'ACIDENTES COM LESÃO LEVE',
                'INCIDENTES SEM LESÃO',
                'DESVIOS COMPORTAMENTAIS',
                'ATOS / CONDIÇÕES INSEGURAS'
            ]
        }
    },

    init: async function () {
        // Set date picker to today or param
        const urlParams = new URLSearchParams(window.location.search);
        const paramDate = urlParams.get('date');
        this.currentDateYMD = paramDate || new Date().toISOString().split('T')[0];
        if(document.getElementById('reportDatePicker')) document.getElementById('reportDatePicker').value = this.currentDateYMD;

        // Update display dates
        const [y, m, d] = this.currentDateYMD.split('-');
        if (document.getElementById('currentDate')) document.getElementById('currentDate').textContent = `${d}/${m}/${y}`;
        if (document.getElementById('yearDisplay')) document.getElementById('yearDisplay').textContent = y;
        const cpEl = document.getElementById('currentDatePaper');
        if (cpEl) cpEl.textContent = `${d}/${m}/${y}`;

        // Load Data from Firebase
        if (window.firebaseDB) {
            try {
                const snapshot = await window.firebaseDB.ref('simas_report_data').once('value');
                const saved = snapshot.val();
                if (saved) {
                    this.data = saved;
                    this.migrateData(); // Convert old format if necessary
                } else {
                    // Firebase is empty, check if we have local data to upload
                    this.data = this.loadFromLocalStorageFallback();
                    this.migrateData();
                    this.saveToLocalStorage(true, true); // Push migrated/full local data to Firebase
                }
            } catch (e) { 
                console.error("Firebase load error", e);
                this.data = this.loadFromLocalStorageFallback();
                this.migrateData(); }
        } else {
            // Fallback to localStorage if Firebase not initialized
            this.data = this.loadFromLocalStorageFallback();
            this.migrateData();
        }


        const paramOp = urlParams.get('op');
        if (paramOp) {
            // Case-insensitive match for predefined operations
            const ops = ["Matriz", "Funeas", "Sorocaba", "São Roque", "Prefeitura SJP", "Camaçari", "Patrimônio"];
            const match = ops.find(o => o.toLowerCase() === paramOp.toLowerCase());
            this.currentOp = match || paramOp;
        } else {
            this.currentOp = 'Matriz';
        }

        // Set the display title
        const titleEl = document.getElementById('operationTitle');
        if (titleEl) titleEl.textContent = this.currentOp.toUpperCase();

        this.render();

        // debounced auto save
        let autoSaveTimeout;
        document.addEventListener('input', (e) => {
            const tag = e.target.tagName;
            const isContentEditable = e.target.getAttribute('contenteditable') === 'true' || e.target.closest('[contenteditable="true"]');
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || isContentEditable) {
                clearTimeout(autoSaveTimeout);
                autoSaveTimeout = setTimeout(() => {
                    this.saveData(true);
                }, 5000);
            }
        });

        // Global Event Listeners for direct changes (selects)
        document.addEventListener('change', (e) => {
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
                this.saveData(true);
            }
        });

        // Save immediately when clicking outside a contenteditable element
        document.addEventListener('focusout', (e) => {
            const isContentEditable = e.target.getAttribute('contenteditable') === 'true' || e.target.closest('[contenteditable="true"]');
            if (isContentEditable) {
                this.saveData(true, true);
            }
        });

        // Focus listeners for textareas (auto-resize)
        document.querySelectorAll('textarea').forEach(tx => {
            tx.addEventListener('input', function () {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
        });

        this.setupValidation();

        // Run background migration for existing bloated images
        this.migrateExistingImages();
    },

    triggerUpload: function (index) {
        const el = document.getElementById(`file-${index}`);
        if (el) el.click();
    },

    loadFromLocalStorageFallback: function () {
        let localData = {};
        
        // 1. Read from the unified key (older data format)
        try {
            const saved = localStorage.getItem('simas_report_data');
            if (saved) {
                localData = JSON.parse(saved);
            }
        } catch (e) { 
            console.error("Erro ao carregar do localStorage unificado:", e); }
        
        // 2. Read and merge individual operation keys (newer optimized format)
        const operations = ["Matriz", "Funeas", "Sorocaba", "São Roque", "Prefeitura SJP", "Camaçari", "Patrimônio"];
        for (let op of operations) {
            try {
                const opSaved = localStorage.getItem('simas_report_data_' + op);
                if (opSaved) {
                    localData[op] = JSON.parse(opSaved);
                }
            } catch (e) { 
                console.error(`Erro ao carregar filial ${op} do localStorage:`, e); }
        }
        
        return localData;
    },

    migrateData: function () {
        let migrated = false;
        for (let opName in this.data) {
            if (!this.data[opName].global && !this.data[opName].daily) {
                const oldContent = JSON.parse(JSON.stringify(this.data[opName]));
                this.data[opName] = {
                    global: oldContent,
                    daily: {},
                    monthly: {}
                };
                // Safety cross and water moved to monthly
                const currentMonth = new Date().toISOString().slice(0, 7);
                this.data[opName].monthly[currentMonth] = {
                    cross: oldContent.safety?.cross || {},
                    forkliftWater: oldContent.forkliftWater || [0, 0, 0, 0],
                    qm: oldContent.qm || {}
                };
                migrated = true;
            }
        }
        if (migrated) this.saveToLocalStorage(true, true);
    },

    saveTimeout: null,
    saveToLocalStorage: function (forceImmediate = false, saveFullOp = false) {
        const opToSave = this.currentOp;
        const dateYMD = this.currentDateYMD;
        
        const saveFn = () => {
            // 1. Save to Firebase
            if (window.firebaseDB && this.data[opToSave]) { try {
                const opRef = window.firebaseDB.ref('simas_report_data/' + opToSave);
                if (saveFullOp) {
                    console.log(`[Firebase] Salvando filial completa para persistência global: ${opToSave}`);
                    const dataToSave = JSON.parse(JSON.stringify(this.data[opToSave]));
                    opRef.set(dataToSave).catch(e => console.warn('Firebase fail'));
                } else {
                    console.log(`[Firebase] Salvando alterações ativas da filial ${opToSave} (${dateYMD})`);
                    
                    // Daily node for current date
                    if (this.data[opToSave].daily && this.data[opToSave].daily[dateYMD]) {
                        opRef.child('daily/' + dateYMD).set(this.data[opToSave].daily[dateYMD]).catch(e => console.warn('Firebase fail'));
                    }
                    
                    // Monthly node for current month
                    const mEl = document.getElementById('safetyMonth');
                    const yEl = document.getElementById('safetyYear');
                    const m = mEl ? parseInt(mEl.value) : new Date().getMonth();
                    const y = yEl ? parseInt(yEl.value) : new Date().getFullYear();
                    const monthKey = `${y}-${(m + 1).toString().padStart(2, '0')}`;
                    if (this.data[opToSave].monthly && this.data[opToSave].monthly[monthKey]) {
                        opRef.child('monthly/' + monthKey).set(this.data[opToSave].monthly[monthKey]).catch(e => console.warn('Firebase fail'));
                    }
                    
                    // Global node
                    if (this.data[opToSave].global) {
                        opRef.child('global').set(this.data[opToSave].global).catch(e => console.warn('Firebase fail'));
                    }
                } } catch(fe) { console.warn("Firebase Error", fe); }
            }
            
            // 2. Save to localStorage
            try {
                // Save current operation data under its own key (fast and bypasses localStorage limit constraints)
                if (this.data[opToSave]) {
                    localStorage.setItem('simas_report_data_' + opToSave, JSON.stringify(this.data[opToSave]));
                }
                // Save global key as fallback (if it fails due to size limit, individual key remains safe)
                localStorage.setItem('simas_report_data', JSON.stringify(this.data));
            } catch (e) { 
                console.error("Erro ao salvar no localStorage (limite excedido?):", e);
                console.warn("Limite de memoria atingido"); }
        };

        if (forceImmediate) {
            clearTimeout(this.saveTimeout);
            saveFn();
        } else {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(saveFn, 300); // 300ms debounce
        }
    },

    changeOperation: function (newOp) {
        this.saveData(true, true);
        if (newOp) this.currentOp = newOp;
        this.render();
    },

    changeDate: function () {
        this.saveData(true, true);
        this.currentDateYMD = document.getElementById('reportDatePicker')?.value;

        // Update display
        const [yStr, mStr, dStr] = this.currentDateYMD.split('-');
        if (document.getElementById('currentDate')) document.getElementById('currentDate').textContent = `${dStr}/${mStr}/${yStr}`;
        if (document.getElementById('yearDisplay')) document.getElementById('yearDisplay').textContent = yStr;
        const cpEl = document.getElementById('currentDatePaper');
        if (cpEl) cpEl.textContent = `${dStr}/${mStr}/${yStr}`;

        // Automatically sync the safety/water dropdowns to match the history date's month and year
        const safetyMonthEl = document.getElementById('safetyMonth');
        const safetyYearEl = document.getElementById('safetyYear');
        if (safetyMonthEl && safetyYearEl) {
            safetyMonthEl.value = (parseInt(mStr, 10) - 1).toString();
            safetyYearEl.value = yStr;
        }

        this.render();
    },

    getDataForOp: function (opName, dateYMD) {
        if (!dateYMD) dateYMD = this.currentDateYMD;
        if (!this.data[opName]) {
            this.data[opName] = {
                global: JSON.parse(JSON.stringify(this.defaultTemplate)),
                daily: {},
                monthly: {}
            };
        }

        const op = this.data[opName];
        const monthKey = dateYMD.slice(0, 7);
        const combined = JSON.parse(JSON.stringify(op.global || {}));

        if (!combined.qm) combined.qm = {};
        if (!combined.safety) combined.safety = {};

        // Apply Monthly Overrides
        if (op.monthly && op.monthly[monthKey]) {
            if (op.monthly[monthKey].forkliftWater) combined.forkliftWater = op.monthly[monthKey].forkliftWater;
            if (op.monthly[monthKey].qm) Object.assign(combined.qm, op.monthly[monthKey].qm);
            if (op.monthly[monthKey].cross) combined.safety.cross = op.monthly[monthKey].cross;
        } else {
            // Defaults or carrying from previous? User says "Resetar somente quando mudar o mês"
            combined.forkliftWater = [0, 0, 0, 0];
            combined.qm.reclamacoes = 0;
            combined.qm.solucionadas = 0;
            combined.qm.nao_solucionadas = 0;
        }

        // Apply Daily Overrides
        if (op.daily && op.daily[dateYMD]) {
            const dailyData = op.daily[dateYMD];
            for (let key in dailyData) {
                if (key === 'safety') {
                    Object.assign(combined.safety, dailyData.safety);
                } else if (key === 'donoRua') {
                    if (!combined.donoRua) combined.donoRua = {};
                    Object.assign(combined.donoRua, dailyData.donoRua);
                } else if (key === 'lup') {
                    if (!combined.lup) combined.lup = [];
                    combined.lup = dailyData.lup;
                } else if (key === 'qm') {
                    Object.assign(combined.qm, dailyData.qm);
                } else {
                    combined[key] = dailyData[key];
                }
            }
            if (dailyData.safety) {
                // Sincroniza apenas as propriedades específicas do dia, mantendo os indicadores globais da filial
                combined.safety.status = dailyData.safety.status || 'sem_acidente';
                combined.safety.images = dailyData.safety.images || ['', '', ''];
                combined.safety.sc_open = dailyData.safety.sc_open || '0';
                combined.safety.sc_closed = dailyData.safety.sc_closed || '0';
                combined.safety.sc_rejected = dailyData.safety.sc_rejected || '0';
                combined.safety.sc_total = dailyData.safety.sc_total || '0';
                combined.safety.obs = dailyData.safety.obs || '';
            }
        } else {
            // Day Resets (Mantém os indicadores globais da filial intocados)
            combined.intro = '';
            combined.safety.status = 'sem_acidente';
            combined.safety.images = ['', '', ''];
            combined.safety.sc_open = '0';
            combined.safety.sc_closed = '0';
            combined.safety.sc_rejected = '0';
            combined.safety.sc_total = '0';
            combined.donoRua = { names: ['', '', '', '', ''], scores: [0, 0, 0, 0, 0] };
        }
        return combined;
    },

    render: function () {
        try {
            const opData = this.getDataForOp(this.currentOp);
            if (!opData) return;

            // 1. Meta & Header
            this.safeSet('operationTitle', this.currentOp, 'text');
            this.safeSet('managerName', opData.manager || '');
            this.safeSet('areaName', opData.area || 'Qualidade');
            this.safeSet('reportVersion', opData.version || '1.0');
            this.safeSet('introText', opData.intro || '');

            // Sync Filial Identity Block
            this.safeSet('filialTitle', this.currentOp.toUpperCase(), 'text');


            // 1.1 Licenses
            const licenses = opData.licenses || Array(4).fill({ name: '', date: '', status: 'regular' });
            const licTbody = document.getElementById('licenses_tbody');
            if (licTbody) {
                licTbody.innerHTML = '';
                licenses.forEach((lic, idx) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>
                            <div class="lic-name-cell">
                                <i class="fas fa-file-alt"></i>
                                <input type="text" id="lic_name_${idx}" value="${lic.name || ''}" placeholder="Nome da licença ou órgão...">
                            </div>
                        </td>
                        <td>
                            <input type="date" id="lic_date_${idx}" value="${lic.date || ''}" style="text-align: center; font-weight: 600;">
                        </td>
                        <td style="position: relative;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <div class="status-badge-wrapper">
                                    <i class="fas fa-check-circle status-badge-icon"></i>
                                    <select id="lic_status_${idx}" onchange="updateRowStatusColor(this)">
                                        <option value="regular" ${lic.status==='regular'?'selected':''}>Regular</option>
                                        <option value="alert" ${lic.status==='alert'?'selected':''}>Alerta</option>
                                        <option value="critical" ${lic.status==='critical'?'selected':''}>Crítica</option>
                                    </select>
                                    <i class="fas fa-chevron-down status-badge-chevron"></i>
                                </div>
                                <button onclick="ReportApp.removeLicense(${idx})" style="background:transparent; border:none; color:#dc2626; cursor:pointer;" title="Remover"><i class="fas fa-trash-alt"></i></button>
                            </div>
                        </td>
                    `;
                    licTbody.appendChild(tr);
                    const sel = document.getElementById(`lic_status_${idx}`);
                    if (sel && typeof updateRowStatusColor === 'function') updateRowStatusColor(sel);
                });
            } else {
                licenses.forEach((lic, idx) => {
                    this.safeSet(`lic_name_${idx}`, lic.name || '');
                    this.safeSet(`lic_date_${idx}`, lic.date || '');
                    this.safeSet(`lic_status_${idx}`, lic.status || 'regular');
                    const sel = document.getElementById(`lic_status_${idx}`);
                    if (sel && typeof updateRowStatusColor === 'function') updateRowStatusColor(sel);
                });
            }
            // Badges are auto-calculated by updateLicenseBadges
            if (typeof updateLicenseBadges === 'function') {
                updateLicenseBadges();
            }

            // 2. Safety Section
            const sd = opData.safety || this.defaultTemplate.safety;
            const now = new Date();

            // Sync safety month/year with the current report date
            const dateParts = this.currentDateYMD.split('-');
            const repYear = dateParts[0];
            const repMonth = (parseInt(dateParts[1]) - 1).toString();

            this.safeSet('safetyMonth', repMonth);
            this.safeSet('safetyYear', repYear);
            this.safeSet('safetyStatus', sd.status || 'sem_acidente');
            this.safeSet('safetyIndicator', sd.indicator || '0');
            this.safeSet('safetyRecord', sd.record || '0');
            this.safeSet('safetyCurrent', sd.current_days || '0');
            this.safeSet('safetyLastAccident', sd.last_accident_date || '');
            this.safeSet('safetyLostTime', sd.lost_time || '0');
            this.safeSet('safetyNoLostTime', sd.no_lost_time || '0');

            this.calculateSafetyDays();

            // Update remaining display elements
            this.safeSet('safetyLostTime_display', sd.lost_time || '0', 'text');
            this.safeSet('safetyNoLostTime_display', sd.no_lost_time || '0', 'text');

            this.safeSet('safetyObs', sd.obs || '');

            // Safety Cards Chart Values
            this.safeSet('sc_open', sd.sc_open || '0');
            this.safeSet('sc_closed', sd.sc_closed || '0');
            this.safeSet('sc_rejected', sd.sc_rejected || '0');
            this.safeSet('sc_total', sd.sc_total || '0');

            this.updateSafetyVisuals();
            this.renderSafetyCross();
            this.renderSafetyImages();
            this.updateSafetyChart();

            // 3. Forklift Section
            const fkGrid = document.getElementById('forkliftGrid');
            if (fkGrid) {
                fkGrid.innerHTML = '';
                // Clear existing charts to force re-render
                this.fkCharts = [];
                this.maintChartInstances = [];
                const fkData = opData.forklifts || this.defaultTemplate.forklifts;
                fkData.forEach((f, i) => {
                    this.createForkliftCard(fkGrid, f, i);
                });
                this.updateForkliftCharts();
            }

            // 4. QM Section
            const qm = opData.qm || this.defaultTemplate.qm;
            
            // Sync QM month/year with the current report date
            const qmDateParts = this.currentDateYMD.split('-');
            const qmRepYear = qmDateParts[0];
            const qmRepMonth = (parseInt(qmDateParts[1]) - 1).toString();
            
            this.safeSet('qm_month', qmRepMonth);
            this.safeSet('qm_year', qmRepYear);

            ['reclamacoes', 'solucionadas', 'nao_solucionadas'].forEach(f => {
                this.safeSet(`qm_${f}`, qm[f] || 0);
            });

            // Populate Complaints Inputs
            const compData = qm.complaints || this.defaultTemplate.qm.complaints;
            compData.forEach((c, i) => {
                this.safeSet(`comp_type_${i}`, c.type || '');
                this.safeSet(`comp_qty_${i}`, c.qty || 0);
            });
            this.updateComplaintsChart();

            // Populate Status Inputs
            const statusData = qm.complaintsStatus || this.defaultTemplate.qm.complaintsStatus;
            this.safeSet('comp_status_open', statusData.open || 0);
            this.safeSet('comp_status_closed', statusData.closed || 0);
            this.safeSet('comp_status_invalid', statusData.invalid || 0);
            this.updateComplaintsStatusChart();

            // Populate NC/DQ Inputs
            const ncData = qm.nonConformities || this.defaultTemplate.qm.nonConformities;
            (ncData.nc || Array(12).fill(0)).forEach((val, i) => {
                this.safeSet(`nc_val_${i}`, val);
            });
            (ncData.dq || Array(12).fill(0)).forEach((val, i) => {
                this.safeSet(`dq_val_${i}`, val);
            });
            this.updateNCCharts();

            // Populate NC/DQ Status Inputs
            const ncStatus = ncData.ncStatus || this.defaultTemplate.qm.nonConformities.ncStatus;
            const dqStatus = ncData.dqStatus || this.defaultTemplate.qm.nonConformities.dqStatus;
            this.safeSet('nc_status_open', ncStatus.open || 0);
            this.safeSet('nc_status_closed', ncStatus.closed || 0);
            this.safeSet('dq_status_open', dqStatus.open || 0);
            this.safeSet('dq_status_closed', dqStatus.closed || 0);
            this.updateNCStatusCharts();

            // 4. Top 3
            const t3 = opData.top3 || this.defaultTemplate.top3;
            t3.forEach((item, i) => {
                this.safeSet(`prob_desc_${i}`, item.desc || '');
                this.safeSet(`prob_resp_${i}`, item.resp || '');
                this.safeSet(`prob_evol_${i}`, item.evol || 0);
                const critEl = document.getElementById(`prob_crit_${i}`);
                if (critEl) {
                    critEl.value = item.crit || 'baixa';
                    this.updateCriticidade(critEl);
                }
                this.updateEvolutionBar(i);
            });

            // 5. Training Charts Mapping
            const tr = opData.trainings || this.defaultTemplate.trainings;
            const trMonthlyProg = tr.monthlyProg || Array(12).fill(0);
            const trMonthlyReal = tr.monthlyReal || Array(12).fill(0);
            trMonthlyProg.forEach((val, i) => this.safeSet(`tr_prog_${i}`, val));
            trMonthlyReal.forEach((val, i) => this.safeSet(`tr_real_${i}`, val));

            const trKpi = tr.kpi || { prog: 0, real: 0, atras: 0 };
            this.safeSet('train_prog', trKpi.prog || 0);
            this.safeSet('train_real', trKpi.real || 0);
            this.safeSet('train_atras', trKpi.atras || 0);

            const trObj = tr.objective || { dev: 0, rec: 0, hom: 0 };
            this.safeSet('train_obj_dev', trObj.dev || 0);
            this.safeSet('train_obj_rec', trObj.rec || 0);
            this.safeSet('train_obj_hom', trObj.hom || 0);

            const trMod = tr.modality || { ead: 0, ext: 0, pres: 0 };
            this.safeSet('train_mod_ead', trMod.ead || 0);
            this.safeSet('train_mod_ext', trMod.ext || 0);
            this.safeSet('train_mod_pres', trMod.pres || 0);
            this.updateTrainingCharts();

            // 8. Forklift Water Section
            const mEl = document.getElementById('safetyMonth');
            const yEl = document.getElementById('safetyYear');
            const m = mEl ? parseInt(mEl.value) : new Date().getMonth();
            const y = yEl ? parseInt(yEl.value) : new Date().getFullYear();
            const waterMonthKey = `${y}-${(m + 1).toString().padStart(2, '0')}`;
            this.currentWaterMonthKey = waterMonthKey;

            const opForWater = this.data[this.currentOp] || { monthly: {} };
            const monthlyData = (opForWater.monthly && opForWater.monthly[waterMonthKey]) ? opForWater.monthly[waterMonthKey] : {};
            const water = monthlyData.forkliftWater || this.defaultTemplate.forkliftWater || [0, 0, 0, 0];

            water.forEach((val, idx) => {
                this.safeSet(`water_w${idx + 1}`, val);
            });
            this.updateWaterChart();

            // 8.1 Bird Pyramid Section
            const bp = opData.birdPyramid || this.defaultTemplate.birdPyramid || { levels: [], labels: [] };
            for (let i = 0; i < 6; i++) {
                const lvlEl = document.getElementById(`bird_level_${i}`);
                if (lvlEl) lvlEl.innerHTML = `<span>${bp.levels[i] || ''}</span>`;
                const lblEl = document.getElementById(`bird_label_${i}`);
                if (lblEl) lblEl.innerText = bp.labels[i] || '';
            }

            // 8.2 Forklift Water Month & Year Dropdowns Sync
            this.safeSet('waterCardMonth', m.toString());
            this.safeSet('waterCardYear', y.toString());
            this.safeSet('waterPanelMonth', m.toString());
            this.safeSet('waterPanelYear', y.toString());

            // 9. Dono da Rua / 5S
            const donoRua = opData.donoRua || this.defaultTemplate.donoRua;
            (donoRua.names || []).forEach((name, idx) => {
                this.safeSet(`dono_name_${idx}`, name || '');
            });
            (donoRua.scores || []).forEach((score, idx) => {
                this.safeSet(`dono_score_${idx}`, score || 0);
            });
            this.updateDonoRuaCharts();

            // 11. Performance Figures
            const perf = opData.performance || this.defaultTemplate.performance;
            this.safeSet('perf_best_name', perf.best?.name || '');
            this.safeSet('perf_best_score', perf.best?.score || 0);
            this.safeSet('perf_best_gender', perf.best?.gender || 'male');
            this.safeSet('perf_worst_name', perf.worst?.name || '');
            this.safeSet('perf_worst_score', perf.worst?.score || 0);
            this.safeSet('perf_worst_gender', perf.worst?.gender || 'male');
            this.updatePerformanceFigures();

            // 10. Galpão Evaluation
            const galpao = opData.galpao || this.defaultTemplate.galpao;
            this.safeSet('galpao_insatisfatorio', galpao.insatisfatorio || 0);
            this.safeSet('galpao_toleravel', galpao.toleravel || 0);
            this.safeSet('galpao_satisfatorio', galpao.satisfatorio || 0);
            this.updateGalpaoChart();

            // 12. LUPS (LOP Cards)
            this.renderLupCards();

            // 13. Melhorias (Improvements Section)
            this.renderMelhoriaCards();

            this.updateWaterChart();

        } catch (e) {  console.error("Render failed:", e); }
    },

    // Helper to set values safely
    safeSet: function (id, val, type = 'value') {
        const el = document.getElementById(id);
        if (!el) return;
        if (type === 'value') el.value = val;
        else if (type === 'text') el.textContent = val;
        else if (type === 'html') el.innerHTML = val;
    },


    createForkliftCard: function (container, data, index) {
        const card = document.createElement('div');
        card.className = 'safety-chart-card';
        card.style.cssText = 'background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); position: relative; display: flex; flex-direction: column; overflow: hidden; min-height: 480px;';

        const mIdx = parseInt(document.getElementById('safetyMonth')?.value) || 0;
        let hVal = (data.monthlyHours && data.monthlyHours[mIdx]) ? data.monthlyHours[mIdx] : 0;
        let cVal = (data.monthlyChecklist && data.monthlyChecklist[mIdx]) ? data.monthlyChecklist[mIdx] : 0;

        // Carry over from previous months if empty (to maintain continuous history)
        if (hVal === 0 && mIdx > 0) {
            for (let j = mIdx - 1; j >= 0; j--) {
                if (data.monthlyHours[j] > 0) {
                    hVal = data.monthlyHours[j];
                    break;
                }
            }
        }
        if (cVal === 0 && mIdx > 0) {
            for (let j = mIdx - 1; j >= 0; j--) {
                if (data.monthlyChecklist[j] > 0) {
                    cVal = data.monthlyChecklist[j];
                    break;
                }
            }
        }

        const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

        card.innerHTML = `
            <div style="font-size: 0.85rem; font-weight: 800; color: #0f1a36; margin-bottom: 1rem; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                <span style="display: flex; align-items: center; gap: 0.5rem; flex: 1;"><i class="fas fa-truck-loading"></i>
                    <input type="text" id="fk_series_${index}" value="${data.series}" 
                        style="font-size: 0.85rem; font-weight: 800; color: #0f1a36; border: none; background: transparent; width: 100%; text-transform: uppercase;">
                </span>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
                    <button onclick="ReportApp.toggleForkliftPanel(${index})" title="Alimentar Equipamento"
                        style="background: transparent; border: none; font-size: 0.9rem; color: #94a3b8; cursor: pointer; transition: color 0.2s;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="ReportApp.removeForklift(${index})" title="Remover Equipamento"
                        style="background: transparent; border: none; font-size: 0.9rem; color: #ef4444; cursor: pointer; transition: color 0.2s;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>

            <!-- Forklift Input Panel (Simplified Current Month) -->
            <div id="fk_panel_${index}" style="display: none; position: absolute; top: 0; left: 0; width: 100%; min-height: 100%; background: white; border-radius: 8px; border: 2px solid #3b82f6; z-index: 20; padding: 1.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                    <div style="font-size: 0.85rem; font-weight: 800; color: #1e293b; text-transform: uppercase;">
                        <i class="fas fa-edit"></i> Dados ${data.series}
                    </div>
                    <button onclick="event.stopPropagation(); ReportApp.toggleForkliftPanel(${index})"
                        style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; cursor: pointer;">
                        CONCLUIR
                    </button>
                </div>
                
                <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 1rem;">
                    <div style="font-size: 0.65rem; font-weight: 800; color: #64748b; margin-bottom: 0.75rem; text-transform: uppercase; text-align: center;">Mês de Referência: ${months[mIdx]}</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div>
                            <label style="display: block; font-size: 0.6rem; font-weight: 700; color: #64748b; margin-bottom: 0.25rem;">HORAS TRAB.</label>
                            <input type="number" id="fk_hours_${index}" value="${hVal}" oninput="ReportApp.updateForkliftCharts()" 
                                style="width: 100%; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 700; font-size: 1rem; text-align: center; color: #1e3a8a;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.6rem; font-weight: 700; color: #64748b; margin-bottom: 0.25rem;">CHECKLIST %</label>
                            <input type="number" id="fk_check_${index}" value="${cVal}" oninput="ReportApp.updateForkliftCharts()" 
                                style="width: 100%; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 700; font-size: 1rem; text-align: center; color: #1e3a8a;">
                        </div>
                    </div>
                </div>

                <div style="text-align: center; margin-bottom: 1rem;">
                   <button onclick="ReportApp.toggleForkliftHistoryPanel(${index})" 
                        style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; padding: 6px 12px; border-radius: 4px; font-size: 0.65rem; font-weight: 800; cursor: pointer; width: 100%;">
                        <i class="fas fa-history"></i> PREENCHER MESES PASSADOS
                   </button>
                </div>

                <div style="font-weight: 800; font-size: 0.65rem; color: #1e293b; text-transform: uppercase; margin: 0.75rem 0 0.5rem 0; border-top: 1px solid #f1f5f9; padding-top: 0.75rem;">Manutenção Preventiva (Odrômetro/Horímetro)</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem;">
                    <div>
                        <label style="display: block; font-size: 0.5rem; font-weight: 800; color: #64748b; margin-bottom: 0.2rem;">ÚLTIMA</label>
                        <input type="number" id="maint_last_${index}" value="${data.maint?.last || 0}" oninput="ReportApp.updateMaintChart(${index})" 
                            style="width: 100%; padding: 0.3rem; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.8rem; font-weight: 700;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.5rem; font-weight: 800; color: #64748b; margin-bottom: 0.2rem;">ATUAL</label>
                        <input type="number" id="maint_now_${index}" value="${data.maint?.now || 0}" oninput="ReportApp.updateMaintChart(${index})" 
                            style="width: 100%; padding: 0.3rem; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.8rem; font-weight: 700;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.5rem; font-weight: 800; color: #64748b; margin-bottom: 0.2rem;">PRÓXIMA</label>
                        <input type="number" id="maint_next_${index}" value="${data.maint?.next || 0}" oninput="ReportApp.updateMaintChart(${index})" 
                            style="width: 100%; padding: 0.3rem; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.8rem; font-weight: 700;">
                    </div>
                </div>
            </div>

            <!-- Forklift History Panel (12 Months Table) -->
            <div id="fk_history_panel_${index}" style="display: none; position: absolute; top: 0; left: 0; width: 100%; min-height: 100%; background: white; border-radius: 8px; border: 2px solid #0f172a; z-index: 30; padding: 1.25rem; box-shadow: 0 10px 25px rgba(0,0,0,0.2); overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <div style="font-size: 0.75rem; font-weight: 800; color: #0f172a; text-transform: uppercase;">
                        <i class="fas fa-calendar-alt"></i> Histórico Anual ${data.series}
                    </div>
                    <button onclick="ReportApp.toggleForkliftHistoryPanel(${index})"
                        style="background: #0f172a; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 0.6rem; font-weight: 800; cursor: pointer;">
                        FECHAR
                    </button>
                </div>
                
                <table style="width: 100%; font-size: 0.65rem; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f1f5f9; color: #475569; border-bottom: 2px solid #e2e8f0;">
                            <th style="padding: 4px; text-align: left;">MÊS</th>
                            <th style="padding: 4px; text-align: center;">HORAS</th>
                            <th style="padding: 4px; text-align: center;">% CHK</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${months.map((m, mIdxLoop) => `
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 3px 4px; font-weight: 800; color: #64748b;">${m}</td>
                                <td style="padding: 2px;">
                                    <input type="number" id="fk_h_his_${index}_${mIdxLoop}" value="${data.monthlyHours[mIdxLoop] || 0}" 
                                        oninput="ReportApp.updateForkliftCharts(); if(${mIdxLoop}===${mIdx}) if(document.getElementById('fk_hours_${index}')) document.getElementById('fk_hours_${index}').value = this.value;"
                                        style="width: 100%; border: 1px solid #e2e8f0; border-radius: 2px; text-align: center; padding: 2px; font-weight: 700;">
                                </td>
                                <td style="padding: 2px;">
                                    <input type="number" id="fk_c_his_${index}_${mIdxLoop}" value="${data.monthlyChecklist[mIdxLoop] || 0}" 
                                        oninput="ReportApp.updateForkliftCharts(); if(${mIdxLoop}===${mIdx}) if(document.getElementById('fk_check_${index}')) document.getElementById('fk_check_${index}').value = this.value;"
                                        style="width: 100%; border: 1px solid #e2e8f0; border-radius: 2px; text-align: center; padding: 2px; font-weight: 700;">
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="height: 150px; margin-bottom: 0.5rem; position: relative;">
                <canvas id="fk_chart_${index}"></canvas>
            </div>

            <div style="border-top: 1px dashed #e2e8f0; padding-top: 0.75rem; margin-top: auto;">
                <div style="font-size: 0.6rem; font-weight: 800; color: #64748b; text-transform: uppercase; text-align: center; margin-bottom: 0.5rem;">Manutenção Preventiva</div>
                <div style="height: 100px; position: relative;">
                    <canvas id="maintChart_${index}"></canvas>
                    <div id="maintPercent_${index}" style="position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); font-size: 0.7rem; font-weight: 900; color: #1e3a8a;">0%</div>
                </div>
            </div>
        `;
        container.appendChild(card);
    },

    addForklift: function () {
        const opData = this.getDataForOp(this.currentOp);
        if (!opData.forklifts) opData.forklifts = [...this.defaultTemplate.forklifts];

        opData.forklifts.push({
            series: `SÉRIE 0${opData.forklifts.length + 1}`,
            monthlyHours: Array(12).fill(0),
            monthlyChecklist: Array(12).fill(0),
            maint: { last: 0, now: 0, next: 0 }
        });

        this.render();
    },

    addForklift: function () {
        if (!this.data[this.currentOp]) {
            this.data[this.currentOp] = { global: JSON.parse(JSON.stringify(this.defaultTemplate)), daily: {}, monthly: {} };
        }
        const opGlobal = this.data[this.currentOp].global;
        if (!opGlobal.forklifts) {
            opGlobal.forklifts = [];
        }
        
        opGlobal.forklifts.push({
            series: 'NOVA SÉRIE',
            monthlyHours: Array(12).fill(0),
            monthlyChecklist: Array(12).fill(0),
            maint: { last: 0, now: 0, next: 0 }
        });
        
        this.saveData(true);
        this.render();
    },

    removeForklift: function (index) {
        if (!confirm('Deseja realmente remover este equipamento?')) return;
        const opGlobal = this.data[this.currentOp].global;
        if (opGlobal && opGlobal.forklifts && opGlobal.forklifts.length > 0) {
            opGlobal.forklifts.splice(index, 1);
            this.saveData(true);
            this.render();
        }
    },

    addLicense: function() {
        // Sync DOM inputs first to preserve any unsaved typing
        this.gatherDataFromDOM();

        if (!this.data[this.currentOp]) {
            this.data[this.currentOp] = { global: JSON.parse(JSON.stringify(this.defaultTemplate)), daily: {}, monthly: {} };
        }
        const opGlobal = this.data[this.currentOp].global;
        if (!opGlobal.licenses) {
            opGlobal.licenses = Array(4).fill({ name: '', date: '', status: 'regular' });
        }
        opGlobal.licenses.push({ name: '', date: '', status: 'regular' });
        
        // Save directly to bypass redundant/buggy gatherDataFromDOM on obsolete elements
        this.saveToLocalStorage(true, true);
        this.render();
    },

    removeLicense: function(index) {
        if (!confirm('Deseja realmente remover esta licença?')) return;
        
        // Sync DOM inputs first to preserve any unsaved typing
        this.gatherDataFromDOM();

        const opGlobal = this.data[this.currentOp].global;
        if (opGlobal && opGlobal.licenses) {
            opGlobal.licenses.splice(index, 1);
            
            // Save directly to bypass gatherDataFromDOM reading from obsolete DOM elements before rendering
            this.saveToLocalStorage(true, true);
            this.render();
        }
    },

    toggleConsolidated: function () {
        this.gatherDataFromDOM(); // Save current work first

        const main = document.getElementById('mainReportPaper');
        const cons = document.getElementById('consolidatedPaper');

        if (cons.style.display === 'none') {
            // Show Consolidated logic
            main.style.display = 'none';
            cons.style.display = 'block';
            this.renderConsolidatedView();
        } else {
            // Hide Consolidated
            cons.style.display = 'none';
            main.style.display = 'block';
        }
    },

    renderConsolidatedView: function () {
        const tbody = document.getElementById('consolidatedBody');
        tbody.innerHTML = '';

        let totalNC = 0;
        let totalTrain = 0;

        // Iterate over keys found in data, or default operation list
        const operations = ["Matriz", "Funeas", "Sorocaba", "São Roque", "Prefeitura SJP", "Camaçari", "Patrimônio"];

        operations.forEach(op => {
            const opCombined = this.getDataForOp(op);
            if (!opCombined) return;

            // Aggregations
            const nc = parseInt(opCombined.qm?.reclamacoes || 0);
            const train = parseInt(opCombined.trainings?.kpi?.real || 0);
            totalNC += nc;
            totalTrain += train;

            const safetyStatus = opCombined.safety?.status === 'sem_acidente'
                ? '<span style="color:#16a34a; font-weight:700;">✅ OK</span>'
                : '<span style="color:#dc2626; font-weight:700;">⚠️ ACIDENTE</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:1rem; font-weight:600; border-bottom:1px solid #e2e8f0;">${op}</td>
                <td style="padding:1rem; border-bottom:1px solid #e2e8f0;">${safetyStatus}</td>
                <td style="padding:1rem; border-bottom:1px solid #e2e8f0; font-weight:bold;">${nc}</td>
                <td style="padding:1rem; border-bottom:1px solid #e2e8f0; font-weight:bold; color:#166534;">${train}</td>
                <td style="padding:1rem; border-bottom:1px solid #e2e8f0; font-size:0.8rem; text-align:left; max-width:200px;">
                    ${opCombined.safety?.obs ? opCombined.safety.obs.substring(0, 50) + '...' : '-'}
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('global_nc').textContent = totalNC;
        document.getElementById('global_train').textContent = totalTrain;
    },

    calculateSafetyDays: function () {
        const startDate = new Date(2026, 0, 1);

        const reportDateStr = document.getElementById('reportDatePicker')?.value;
        let reportDate = new Date();
        if (reportDateStr) {
            const [y, m, d] = reportDateStr.split('-');
            reportDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        }

        const lastAccidentStr = document.getElementById('safetyLastAccident')?.value;
        let lastAccidentDate = null;
        if (lastAccidentStr) {
            const [y, m, d] = lastAccidentStr.split('-');
            const yearVal = parseInt(y, 10);
            if (yearVal > 1900) {
                lastAccidentDate = new Date(yearVal, parseInt(m, 10) - 1, parseInt(d, 10));
            }
        }

        const msPerDay = 1000 * 60 * 60 * 24;
        let currentDays = 0;

        if (lastAccidentDate && lastAccidentDate <= reportDate) {
            currentDays = Math.round((reportDate - lastAccidentDate) / msPerDay);
        } else {
            currentDays = Math.round((reportDate - startDate) / msPerDay);
        }

        if (currentDays < 0) currentDays = 0;

        // Recupera o recorde existente do DOM
        const recInput = document.getElementById('safetyRecord');
        let recordDays = recInput ? parseInt(recInput.value, 10) : 0;
        if (isNaN(recordDays)) recordDays = 0;

        // Bateu o recorde?
        if (currentDays > recordDays) {
            recordDays = currentDays;
        }

        // Displays
        const recDisplay = document.getElementById('safetyRecord_display');
        const curDisplay = document.getElementById('safetyCurrent_display');
        if (recDisplay) recDisplay.textContent = recordDays;
        if (curDisplay) curDisplay.textContent = currentDays;

        if (recInput) recInput.value = recordDays;
        const curHidden = document.getElementById('safetyCurrent');
        if (curHidden) curHidden.value = currentDays;
    },

    updateSafetyVisuals: function () {
        const card = document.getElementById('safety-card');

        // Em vez de safetyStatus, avaliamos dinamicamente: se currentDays estiver zerado E a data de acidente recente bater, então é alerta vermelho.
        const currentHidden = document.getElementById('safetyCurrent');
        const val = currentHidden && currentHidden.value === '0' && document.getElementById('safetyLastAccident')?.value ? 'com_acidente' : 'sem_acidente';

        // Update other displays
        this.safeSet('safetyLostTime_display', document.getElementById('safetyLostTime')?.value || 0, 'text');
        this.safeSet('safetyNoLostTime_display', document.getElementById('safetyNoLostTime')?.value || 0, 'text');

        this.safeSet('safetyLostTime_val', document.getElementById('safetyLostTime')?.value || 0, 'text');

        if (card) {
            if (val === 'sem_acidente') {
                card.style.borderLeftColor = '#16a34a'; // Green
                card.style.backgroundColor = '#ffffff'; // Restaura o fundo branco base do card
            } else {
                card.style.borderLeftColor = '#dc2626'; // Red
                card.style.backgroundColor = '#fef2f2'; // Fundo levemente vermelho p/ alerta
            }
        }
    },

    updateSafetyChart: function () {
        const oInput = document.getElementById('sc_open');
        const cInput = document.getElementById('sc_closed');
        const rInput = document.getElementById('sc_rejected');
        const tInput = document.getElementById('sc_total');
        const totalDisplay = document.getElementById('safety_total_display');

        if (!oInput || !cInput || !rInput) return;

        const o = parseInt(oInput.value) || 0;
        const c = parseInt(cInput.value) || 0;
        const r = parseInt(rInput.value) || 0;
        const total = o + c + r;

        if (tInput) tInput.value = total;
        if (totalDisplay) totalDisplay.textContent = total;

        const ctx = document.getElementById('safetyCardsDonutChart');
        if (!ctx) return;

        const dataVals = [o, c, r];
        const hasData = total > 0;

        const dynLabels = hasData ? [`${o} Abertos`, `${c} Fechados`, `${r} Indeferidos`] : ['Sem Dados'];

        if (this.safetyDonutChart) {
            this.safetyDonutChart.data.labels = dynLabels;
            this.safetyDonutChart.data.datasets[0].data = hasData ? dataVals : [1];
            this.safetyDonutChart.data.datasets[0].backgroundColor = hasData ? ['#30388F', '#4F63C6', '#7C8FEA'] : [this.colors.grid];
            this.safetyDonutChart.update();
        } else {
            // Plugin para desenhar o Total exatamente no centro do Donut descontando o espaco da legenda
            const donutCenterTextPlugin = {
                id: 'donutCenterTextPlugin',
                beforeDraw: function (chart) {
                    if (!chart.getDatasetMeta(0).data[0]) return;
                    const { ctx, chartArea: { top, bottom, left, right, width, height } } = chart;

                    // The center of the drawn arcs can be found using the first arc's coordinates
                    const arc = chart.getDatasetMeta(0).data[0];
                    if (!arc) return;

                    const centerX = arc.x;
                    const centerY = arc.y;

                    ctx.save();
                    // Text "TOTAL"
                    ctx.font = '800 0.6rem "Inter", sans-serif';
                    ctx.fillStyle = '#94a3b8';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('TOTAL', centerX, centerY - 12);

                    // Text Value
                    const tInput = document.getElementById('sc_total');
                    const totValue = tInput ? tInput.value : '0';
                    ctx.font = '900 1.8rem "Inter", sans-serif';
                    ctx.fillStyle = '#0F2E5A';
                    ctx.fillText(totValue, centerX, centerY + 8);

                    ctx.restore();
                }
            };

            this.safetyDonutChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: dynLabels,
                    datasets: [{
                        data: hasData ? dataVals : [1],
                        backgroundColor: hasData ? ['#30388F', '#4F63C6', '#7C8FEA'] : [this.colors.grid],
                        borderWidth: 0,
                        cutout: '75%'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'right',
                            align: 'center',
                            labels: {
                                boxWidth: 12,
                                padding: 15,
                                font: {
                                    size: 11,
                                    weight: 'bold',
                                    family: "'Inter', sans-serif"
                                }
                            }
                        },
                        tooltip: {
                            enabled: hasData,
                            callbacks: {
                                label: function (context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed !== null) {
                                        label += context.parsed;
                                    }
                                    return label;
                                }
                            }
                        },
                        datalabels: {
                            display: false
                        }
                    },
                    layout: {
                        padding: {
                            top: 0,
                            bottom: 10
                        }
                    }
                },
                plugins: [donutCenterTextPlugin, ChartDataLabels]
            });
        }
    },


    updateForkliftCharts: function () {
        const mIdx = parseInt(document.getElementById('safetyMonth')?.value) || 0;
        const labels = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
        const opData = this.data[this.currentOp];
        const forklifts = opData?.global?.forklifts;
        if (!forklifts) return;
        forklifts.forEach((fData, i) => {
            const hInput = document.getElementById(`fk_hours_${i}`);
            const cInput = document.getElementById(`fk_check_${i}`);
            if (!hInput || !cInput) return;

            const hVal = parseFloat(hInput.value) || 0;
            const cVal = parseFloat(cInput.value) || 0;
            const canvas = document.getElementById(`fk_chart_${i}`);

            const sInput = document.getElementById(`fk_series_${i}`);
            if (sInput) fData.series = sInput.value;

            // Sync current input to fData
            if (!fData.monthlyHours) fData.monthlyHours = Array(12).fill(0);
            if (!fData.monthlyChecklist) fData.monthlyChecklist = Array(12).fill(0);

            fData.monthlyHours[mIdx] = hVal;
            fData.monthlyChecklist[mIdx] = cVal;

            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            if (this.fkCharts[i]) {
                this.fkCharts[i].data.datasets[0].data = fData.monthlyHours;
                this.fkCharts[i].data.datasets[1].data = fData.monthlyChecklist;
                this.fkCharts[i].update();
            } else {
                this.fkCharts[i] = new Chart(ctx, {
                    plugins: [ChartDataLabels],
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Horas Trab.',
                                type: 'bar',
                                data: fData.monthlyHours,
                                backgroundColor: '#03045e',
                                borderRadius: 4,
                                barThickness: 20,
                                yAxisID: 'y',
                                order: 2,
                                datalabels: {
                                    anchor: 'start',
                                    align: 'end',
                                    offset: 2,
                                    color: '#ffffff',
                                    font: { size: 9, weight: 'bold' }
                                }
                            },
                            {
                                label: '% Checklist',
                                type: 'line',
                                data: fData.monthlyChecklist,
                                borderColor: '#48cae4',
                                backgroundColor: '#48cae4',
                                borderWidth: 2,
                                pointRadius: 2,
                                pointBackgroundColor: '#48cae4',
                                tension: 0.3,
                                yAxisID: 'y1',
                                order: 1,
                                datalabels: {
                                    anchor: 'center',
                                    align: 'top',
                                    offset: 5,
                                    color: '#1e293b',
                                    font: { size: 9, weight: 'bold' },
                                    formatter: (v) => v + '%'
                                }
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: { padding: { top: 25, bottom: 0 } },
                        plugins: {
                            legend: {
                                display: true,
                                position: 'bottom',
                                labels: { boxWidth: 10, font: { size: 8, weight: 'bold' } }
                            },
                            datalabels: {
                                display: function (context) {
                                    return context.dataset.data[context.dataIndex] > 0;
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                position: 'left',
                                display: false,
                                grid: { display: false },
                                ticks: {
                                    display: false
                                }
                            },
                            y1: {
                                beginAtZero: true,
                                max: 100,
                                position: 'right',
                                display: false,
                                grid: { display: false },
                                ticks: {
                                    display: false
                                }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { font: { size: 7, weight: 'bold' } }
                            }
                        }
                    }
                });
            }
            this.updateMaintChart(i); // Sync maintenance chart
        });
    },

    updateWaterChart: function () {
        const labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
        const values = [
            parseFloat(document.getElementById('water_w1')?.value) || 0,
            parseFloat(document.getElementById('water_w2')?.value) || 0,
            parseFloat(document.getElementById('water_w3')?.value) || 0,
            parseFloat(document.getElementById('water_w4')?.value) || 0
        ];

        const canvas = document.getElementById('waterChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (this.waterChartInstance) {
            this.waterChartInstance.data.datasets[1].data = values;
            this.waterChartInstance.update();
        } else {
            this.waterChartInstance = new Chart(ctx, {
                plugins: [ChartDataLabels],
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Limite (5L)',
                            type: 'line',
                            data: [5, 5, 5, 5],
                            borderColor: 'rgba(239, 68, 68, 0.4)',
                            borderWidth: 1,
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false,
                            datalabels: { display: false }
                        },
                        {
                            label: 'Qtd Água',
                            type: 'line',
                            data: values,
                            fill: true,
                            backgroundColor: 'rgba(144, 224, 239, 0.5)',
                            borderColor: '#90E0EF',
                            tension: 0.3,
                            pointRadius: 2,
                            datalabels: {
                                display: true,
                                anchor: 'end',
                                align: 'top',
                                color: '#0077b6',
                                font: { weight: 'bold', size: 11 },
                                formatter: (v) => v + 'L'
                            }
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: {
                            top: 25,
                            left: 10,
                            right: 10,
                            bottom: 0
                        }
                    },
                    plugins: {
                        legend: { display: true, position: 'top', labels: { boxWidth: 10, font: { size: 9 } } },
                        datalabels: {
                            display: true,
                            color: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0 && ctx.dataset.data[ctx.dataIndex] < 5 ? '#dc2626' : '#009dde',
                            font: { weight: 'bold', size: 11 },
                            offset: 4,
                            formatter: (v) => v + 'L',
                            anchor: 'end',
                            align: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            suggestedMax: 10,
                            display: false,
                            grid: { display: false },
                            ticks: {
                                display: false
                            }
                        },
                        x: {
                            display: true,
                            grid: { display: false },
                            ticks: { font: { size: 9, weight: 'bold' }, color: this.colors.text }
                        }
                    }
                }
            });
        }

        // Card Alert Mode (Keeping the card alert but removing dynamic bar coloring as it's now an area chart)
        const card = document.getElementById('waterCard');
        if (card) {
            const hasAlert = values.some(v => v > 0 && v < 5);
            if (hasAlert) {
                card.style.borderColor = this.colors.status.red;
                card.style.backgroundColor = '#fef2f2';
                card.style.boxShadow = `0 0 10px rgba(229, 83, 61, 0.2)`;
            } else {
                card.style.borderColor = '#e2e8f0';
                card.style.backgroundColor = '#ffffff';
                card.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            }
        }
    },

    updateMaintChart: function (index) {
        const lastInput = document.getElementById(`maint_last_${index}`);
        const nowInput = document.getElementById(`maint_now_${index}`);
        const nextInput = document.getElementById(`maint_next_${index}`);

        if (!lastInput || !nowInput || !nextInput) return;

        const last = parseFloat(lastInput.value) || 0;
        const now = parseFloat(nowInput.value) || 0;
        const next = parseFloat(nextInput.value) || 0;

        let percent = 0;
        const range = next - last;
        if (range > 0) {
            percent = Math.min(Math.max(((now - last) / range) * 100, 0), 100);
        }

        const percentEl = document.getElementById(`maintPercent_${index}`);
        if (percentEl) percentEl.textContent = Math.round(percent) + '%';

        let color = '#023e8a'; // Institutional blue for maintenance charts

        const canvas = document.getElementById(`maintChart_${index}`);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (this.maintChartInstances[index]) {
            this.maintChartInstances[index].data.datasets[0].data = [percent, 100 - percent];
            this.maintChartInstances[index].data.datasets[0].backgroundColor = [color, '#f1f5f9'];
            this.maintChartInstances[index].update();
        } else {
            this.maintChartInstances[index] = new Chart(ctx, {
                plugins: [ChartDataLabels],
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [percent, 100 - percent],
                        backgroundColor: [color, this.colors.grid],
                        borderWidth: 0,
                        circumference: 180,
                        rotation: 270,
                        cutout: '80%',
                        datalabels: { display: false }
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false },
                        datalabels: { display: false } // Disabled as requested
                    }
                }
            });
        }
    },

    updateComplaintsChart: function () {
        const labels = [];
        const values = [];

        for (let i = 0; i < 5; i++) {
            const typeInput = document.getElementById(`comp_type_${i}`);
            const qtyInput = document.getElementById(`comp_qty_${i}`);

            if (typeInput && qtyInput) {
                const type = typeInput.value;
                const qty = parseFloat(qtyInput.value) || 0;
                if (type.trim() !== "" || qty > 0) {
                    labels.push(type || `Tipo ${i + 1}`);
                    values.push(qty);
                }
            }
        }

        const canvas = document.getElementById('complaintsChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (this.complaintsChartInstance) {
            this.complaintsChartInstance.data.labels = labels;
            this.complaintsChartInstance.data.datasets[0].data = values;
            this.complaintsChartInstance.update();
        } else {
            const sortedIndices = values.map((v, i) => i).sort((a, b) => values[b] - values[a]);
            const finalLabels = sortedIndices.map(i => labels[i]);
            const finalValues = sortedIndices.map(i => values[i]);
            const barColors = finalValues.map((v, i) => this.colors.blueScale[Math.min(i, this.colors.blueScale.length - 1)]);

            this.complaintsChartInstance = new Chart(ctx, {
                plugins: [ChartDataLabels],
                type: 'bar',
                data: {
                    labels: finalLabels,
                    datasets: [{
                        label: 'Reclamações por Tipo',
                        data: finalValues,
                        backgroundColor: barColors,
                        borderRadius: 4,
                        barThickness: 28
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y', // Horizontal bars
                    layout: {
                        padding: {
                            left: 10,
                            right: 40, // Espaço para o valor aparecer à direita
                            top: 10,
                            bottom: 10
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        datalabels: {
                            display: true,
                            anchor: 'end',
                            align: 'right', // Valor à direita da barra
                            color: this.colors.text,
                            font: { weight: 'bold', size: 10 },
                            offset: 5,
                            formatter: (v) => v > 0 ? v : '0'
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            grid: { display: false },
                            ticks: { display: false },
                            display: false
                        },
                        y: {
                            display: true,
                            grid: { display: false },
                            ticks: {
                                font: { size: 10, weight: 'bold' },
                                color: this.colors.text
                            },
                            border: { display: false }
                        }
                    }
                }
            });
        }
    },

    toggleComplaintsDetalhamento: function () {
        const panel = document.getElementById('complaintsDetalhamentoPanel');
        if (!panel) return;

        if (panel.style.display === 'none' || panel.style.display === '') {
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    },

    updateComplaintsStatusChart: function () {
        const open = parseFloat(document.getElementById('comp_status_open')?.value) || 0;
        const closed = parseFloat(document.getElementById('comp_status_closed')?.value) || 0;
        const invalid = parseFloat(document.getElementById('comp_status_invalid')?.value) || 0;

        const canvas = document.getElementById('complaintsStatusChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (this.complaintsStatusChartInstance) {
            this.complaintsStatusChartInstance.data.datasets[0].data = [open, closed, invalid];
            this.complaintsStatusChartInstance.update();
        } else {
            this.complaintsStatusChartInstance = new Chart(ctx, {
                plugins: [ChartDataLabels],
                type: 'doughnut',
                data: {
                    labels: ['Abertas', 'Fechadas', 'Não Procede'],
                    datasets: [{
                        data: [open, closed, invalid],
                        backgroundColor: ['#041d56', '#ade1fb', '#266ca9'],
                        borderWidth: 2,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { boxWidth: 10, font: { size: 9, weight: 'bold' } }
                        },
                        datalabels: {
                            color: '#fff',
                            formatter: (v) => v > 0 ? v : '',
                            font: { weight: 'bold', size: 10 }
                        }
                    }
                }
            });
        }
    },

    toggleComplaintsStatusPanel: function () {
        const panel = document.getElementById('complaintsStatusPanel');
        if (!panel) return;
        panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none';
    },

    updateNCCharts: function () {
        const labels = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
        const ncValues = [];
        const dqValues = [];

        for (let i = 0; i < 12; i++) {
            ncValues.push(parseFloat(document.getElementById(`nc_val_${i}`)?.value) || 0);
            dqValues.push(parseFloat(document.getElementById(`dq_val_${i}`)?.value) || 0);
        }

        const createBarChart = (canvasId, label, data, instanceKey, color) => {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            if (this[instanceKey]) {
                this[instanceKey].data.datasets[0].data = data;
                this[instanceKey].update();
            } else {
                this[instanceKey] = new Chart(ctx, {
                    plugins: [ChartDataLabels],
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: label,
                            data: data,
                            backgroundColor: color,
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: {
                            padding: {
                                top: 25,
                                left: 5,
                                right: 5,
                                bottom: 0
                            }
                        },
                        plugins: {
                            legend: { display: false },
                            datalabels: {
                                display: true,
                                anchor: 'end',
                                align: 'top',
                                color: color,
                                font: { weight: 'bold', size: 10 },
                                formatter: (v) => v
                            }
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: { font: { size: 9, weight: 'bold' }, color: this.colors.text }
                            },
                            y: {
                                display: true,
                                beginAtZero: true,
                                grid: { color: this.colors.grid, drawBorder: false },
                                ticks: { font: { size: 8 }, color: this.colors.text }
                            }
                        }
                    }
                });
            }
        };

        createBarChart('ncChart', 'Não Conformidade', ncValues, 'ncChartInstance', '#01082d');
        createBarChart('dqChart', 'Desvios de Qualidade', dqValues, 'dqChartInstance', '#0f2573');
    },

    toggleNCPanel: function () {
        const panel = document.getElementById('ncPanel');
        if (!panel) return;
        panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none';
    },

    updateNCStatusCharts: function () {
        const createDoughnut = (canvasId, openVal, closedVal, instanceKey, colorOpen, colorClosed) => {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const data = [openVal, closedVal];

            if (this[instanceKey]) {
                this[instanceKey].data.datasets[0].data = data;
                this[instanceKey].update();
            } else {
                this[instanceKey] = new Chart(ctx, {
                    plugins: [ChartDataLabels],
                    type: 'doughnut',
                    data: {
                        labels: ['Em Aberto', 'Concluído'],
                        datasets: [{
                            data: data,
                            backgroundColor: [colorOpen, colorClosed],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '60%',
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { boxWidth: 10, font: { size: 9, weight: 'bold' } }
                            },
                            datalabels: {
                                color: '#fff',
                                font: { weight: 'bold', size: 10 },
                                formatter: (v) => v > 0 ? v : ''
                            }
                        }
                    }
                });
            }
        };

        const ncOpen = parseFloat(document.getElementById('nc_status_open')?.value) || 0;
        const ncClosed = parseFloat(document.getElementById('nc_status_closed')?.value) || 0;
        const dqOpen = parseFloat(document.getElementById('dq_status_open')?.value) || 0;
        const dqClosed = parseFloat(document.getElementById('dq_status_closed')?.value) || 0;

        createDoughnut('ncStatusChart', ncOpen, ncClosed, 'ncStatusChartInstance', '#18385a', '#2c6a9e');
        createDoughnut('dqStatusChart', dqOpen, dqClosed, 'dqStatusChartInstance', '#18385a', '#2c6a9e');
    },

    toggleNCStatusPanel: function () {
        const panel = document.getElementById('ncStatusDetailedPanel');
        if (!panel) return;
        panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none';
    },

    updateTrainingCharts: function () {
        const labels = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
        const progValues = Array.from({ length: 12 }, (_, i) => parseFloat(document.getElementById(`tr_prog_${i}`)?.value) || 0);
        const realValues = Array.from({ length: 12 }, (_, i) => parseFloat(document.getElementById(`tr_real_${i}`)?.value) || 0);

        // 1. Line + Bar Chart (Prog x Real)
        const canvas = document.getElementById('trainingChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (this.trainingChartInstance) {
                this.trainingChartInstance.data.datasets[0].data = progValues;
                this.trainingChartInstance.data.datasets[1].data = realValues;
                // Force grid removal on instance update
                if (this.trainingChartInstance.options.scales.x) {
                    this.trainingChartInstance.options.scales.x.grid.display = false;
                    this.trainingChartInstance.options.scales.x.grid.drawBorder = false;
                }
                if (this.trainingChartInstance.options.scales.y) {
                    this.trainingChartInstance.options.scales.y.grid.display = false;
                    this.trainingChartInstance.options.scales.y.grid.drawBorder = false;
                }
                this.trainingChartInstance.update();
            } else {
                this.trainingChartInstance = new Chart(ctx, {
                    plugins: [ChartDataLabels],
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Programado',
                                type: 'line',
                                data: progValues,
                                borderColor: '#00b4d8',
                                backgroundColor: '#00b4d8',
                                borderWidth: 3,
                                tension: 0.3,
                                pointRadius: 2,
                                datalabels: { display: false }
                            },
                            {
                                label: 'Realizado',
                                type: 'bar',
                                data: realValues,
                                backgroundColor: '#03045e',
                                borderRadius: 4,
                                barThickness: 20,
                                datalabels: {
                                    anchor: 'end',
                                    align: 'top',
                                    color: '#03045e',
                                    font: { weight: 'bold', size: 9 },
                                    formatter: (v) => v || ''
                                }
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'top', labels: { boxWidth: 10, font: { size: 9, weight: 'bold' } } }
                        },
                        scales: {
                            x: { grid: { display: false, drawBorder: false }, ticks: { font: { size: 8, weight: 'bold' }, color: this.colors.text } },
                            y: {
                                beginAtZero: true,
                                grid: { color: this.colors.grid, drawBorder: false },
                                ticks: {
                                    display: true,
                                    font: { size: 8 },
                                    color: this.colors.text
                                }
                            }
                        }
                    }
                });
            }
        }

        // 2. Bar Chart (Objectives)
        const objCanvas = document.getElementById('trainingObjChart');
        if (objCanvas) {
            const ctxObj = objCanvas.getContext('2d');
            const objData = [
                parseFloat(document.getElementById('train_obj_dev')?.value) || 0,
                parseFloat(document.getElementById('train_obj_rec')?.value) || 0,
                parseFloat(document.getElementById('train_obj_hom')?.value) || 0
            ];

            if (this.trainingObjChartInstance) {
                this.trainingObjChartInstance.data.datasets[0].data = objData;
                this.trainingObjChartInstance.update();
            } else {
                this.trainingObjChartInstance = new Chart(ctxObj, {
                    plugins: [ChartDataLabels],
                    type: 'bar',
                    data: {
                        labels: ['Desenvolvimento', 'Reciclagem', 'Homologação'],
                        datasets: [{
                            data: objData,
                            backgroundColor: ['#03045e', '#023e8a', '#0077b6'],
                            borderRadius: 4,
                            barThickness: 25
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            datalabels: {
                                anchor: 'end',
                                align: 'right',
                                font: { weight: 'bold', size: 10 },
                                color: this.colors.text
                            }
                        },
                        scales: {
                            x: {
                                beginAtZero: true,
                                grid: { color: this.colors.grid, drawBorder: false },
                                ticks: { font: { size: 8 }, color: this.colors.text }
                            },
                            y: {
                                grid: { display: false },
                                ticks: { font: { size: 9, weight: 'bold' }, color: this.colors.text }
                            }
                        }
                    }
                });
            }
        }

        // 3. Doughnut Chart (Modality)
        const modCanvas = document.getElementById('trainingModChart');
        if (modCanvas) {
            const ctxMod = modCanvas.getContext('2d');
            const modData = [
                parseFloat(document.getElementById('train_mod_ead')?.value) || 0,
                parseFloat(document.getElementById('train_mod_ext')?.value) || 0,
                parseFloat(document.getElementById('train_mod_pres')?.value) || 0
            ];

            if (this.trainingModChartInstance) {
                this.trainingModChartInstance.data.datasets[0].data = modData;
                this.trainingModChartInstance.update();
            } else {
                this.trainingModChartInstance = new Chart(ctxMod, {
                    plugins: [ChartDataLabels],
                    type: 'doughnut',
                    data: {
                        labels: ['EAD', 'EXTERNO', 'PRESENCIAL'],
                        datasets: [{
                            data: modData,
                            backgroundColor: ['#0096c7', '#00b4d8', '#48cae4'],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '50%',
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { boxWidth: 10, font: { size: 8, weight: 'bold' }, color: this.colors.text }
                            },
                            datalabels: {
                                color: '#fff',
                                font: { weight: 'bold', size: 9 },
                                formatter: (v) => v > 0 ? v : ''
                            }
                        }
                    }
                });
            }
        }
    },

    toggleTrainingsPanel: function () {
        const panel = document.getElementById('trainingsMonthlyPanel');
        if (!panel) return;
        panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none';
    },

    toggleTrainingsObjPanel: function () {
        const panel = document.getElementById('trainingsObjectivePanel');
        if (!panel) return;
        panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none';
    },

    toggleTrainingsModPanel: function () {
        const panel = document.getElementById('trainingsModalityPanel');
        if (!panel) return;
        panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none';
    },

    // --- Criticality Visual Logic ---
    updateCriticidade: function (selectEl) {
        const val = selectEl.value;
        const row = selectEl.closest('.problem-row');
        if (row) row.style.backgroundColor = '';

        selectEl.style.color = '';
        selectEl.style.fontWeight = '600';

        if (val === 'baixa') {
            selectEl.style.color = '#166534'; // Green
        } else if (val === 'media') {
            selectEl.style.color = '#854d0e'; // Yellow/Dark Gold
        } else if (val === 'alta') {
            selectEl.style.color = '#c2410c'; // Orange
        } else if (val === 'critica') {
            selectEl.style.color = '#991b1b'; // Red
            if (row) row.style.backgroundColor = '#fff1f2'; // Highlight row
        }
    },

    gatherDataFromDOM: function () {
        const op = this.data[this.currentOp];
        if (!op) return;
        const dateYMD = this.currentDateYMD;

        const mEl = document.getElementById('safetyMonth');
        const yEl = document.getElementById('safetyYear');
        if (!mEl || !yEl) return; // Basic safety check

        const m = parseInt(mEl.value);
        const y = parseInt(yEl.value);
        const monthKey = `${y}-${(m + 1).toString().padStart(2, '0')}`;

        if (!op.daily) op.daily = {};
        if (!op.daily[dateYMD]) op.daily[dateYMD] = {};
        if (!op.monthly) op.monthly = {};
        if (!op.monthly[monthKey]) op.monthly[monthKey] = {};
        if (!op.global) op.global = {};

        const daily = op.daily[dateYMD];
        const monthly = op.monthly[monthKey];
        const global = op.global;

        // --- GLOBAL (Persistent) ---
        global.manager = document.getElementById('managerName')?.value;
        global.area = document.getElementById('areaName')?.value;
        global.version = document.getElementById('reportVersion')?.value;

        // Persistência global dos indicadores de segurança da filial
        if (!global.safety) global.safety = {};
        Object.assign(global.safety, {
            record: document.getElementById('safetyRecord')?.value || '0',
            current_days: document.getElementById('safetyCurrent')?.value || '0',
            lost_time: document.getElementById('safetyLostTime')?.value || '0',
            no_lost_time: document.getElementById('safetyNoLostTime')?.value || '0',
            last_accident_date: document.getElementById('safetyLastAccident')?.value || ''
        });

        global.licenses = (global.licenses || []).map((lic, i) => {
            const nameEl = document.getElementById(`lic_name_${i}`);
            if (!nameEl) return lic; // Preserva licenças recém-adicionadas que ainda não foram renderizadas
            const dateEl = document.getElementById(`lic_date_${i}`);
            const statusEl = document.getElementById(`lic_status_${i}`);
            return {
                name: nameEl.value,
                date: dateEl ? dateEl.value : lic.date,
                status: statusEl ? statusEl.value : lic.status
            };
        });
        global.licenseBadges = {
            critical: document.getElementById('lic_badge_critical')?.value || '2 Críticas',
            alert: document.getElementById('lic_badge_alert')?.value || '1 Alerta',
            regular: document.getElementById('lic_badge_regular')?.value || '5 Regulares'
        };

        const safetyIndicatorEl = document.getElementById('safetyIndicator');
        if (safetyIndicatorEl) global.safetyIndicator = safetyIndicatorEl.value;

        // Forklifts
        const mIdx = parseInt(document.getElementById('safetyMonth')?.value) || 0;
        global.forklifts = (global.forklifts || []).map((fk, i) => {
            const seriesEl = document.getElementById(`fk_series_${i}`);
            if (!seriesEl) return fk;

            // Sync all 12 months from detailed panel if it exists, or just current month
            if (!fk.monthlyHours) fk.monthlyHours = Array(12).fill(0);
            if (!fk.monthlyChecklist) fk.monthlyChecklist = Array(12).fill(0);

            for (let m = 0; m < 12; m++) {
                const hHis = document.getElementById(`fk_h_his_${i}_${m}`);
                const cHis = document.getElementById(`fk_c_his_${i}_${m}`);
                if (hHis) fk.monthlyHours[m] = parseFloat(hHis.value) || 0;
                if (cHis) fk.monthlyChecklist[m] = parseFloat(cHis.value) || 0;
            }

            // Ensure current month inputs are also synced in case they were edited directly
            const hInput = document.getElementById(`fk_hours_${i}`);
            const cInput = document.getElementById(`fk_check_${i}`);
            if (hInput) fk.monthlyHours[mIdx] = parseFloat(hInput.value) || 0;
            if (cInput) fk.monthlyChecklist[mIdx] = parseFloat(cInput.value) || 0;

            return {
                series: seriesEl.value,
                monthlyHours: [...fk.monthlyHours],
                monthlyChecklist: [...fk.monthlyChecklist],
                maint: {
                    last: parseFloat(document.getElementById(`maint_last_${i}`)?.value) || 0,
                    now: parseFloat(document.getElementById(`maint_now_${i}`)?.value) || 0,
                    next: parseFloat(document.getElementById(`maint_next_${i}`)?.value) || 0
                }
            };
        });

        // NC & Training (Global arrays)
        if (!global.qm) global.qm = {};
        global.qm.nonConformities = {
            nc: Array.from({ length: 12 }, (_, i) => parseFloat(document.getElementById(`nc_val_${i}`)?.value) || 0),
            dq: Array.from({ length: 12 }, (_, i) => parseFloat(document.getElementById(`dq_val_${i}`)?.value) || 0),
            ncStatus: {
                open: parseFloat(document.getElementById('nc_status_open')?.value) || 0,
                closed: parseFloat(document.getElementById('nc_status_closed')?.value) || 0
            },
            dqStatus: {
                open: parseFloat(document.getElementById('dq_status_open')?.value) || 0,
                closed: parseFloat(document.getElementById('dq_status_closed')?.value) || 0
            }
        };

        if (!global.trainings) global.trainings = {};
        global.trainings = {
            monthlyProg: Array.from({ length: 12 }, (_, i) => parseFloat(document.getElementById(`tr_prog_${i}`)?.value) || 0),
            monthlyReal: Array.from({ length: 12 }, (_, i) => parseFloat(document.getElementById(`tr_real_${i}`)?.value) || 0),
            kpi: {
                prog: parseFloat(document.getElementById('train_prog')?.value) || 0,
                real: parseFloat(document.getElementById('train_real')?.value) || 0,
                atras: parseFloat(document.getElementById('train_atras')?.value) || 0
            },
            objective: {
                dev: parseFloat(document.getElementById('train_obj_dev')?.value) || 0,
                rec: parseFloat(document.getElementById('train_obj_rec')?.value) || 0,
                hom: parseFloat(document.getElementById('train_obj_hom')?.value) || 0
            },
            modality: {
                ead: parseFloat(document.getElementById('train_mod_ead')?.value) || 0,
                ext: parseFloat(document.getElementById('train_mod_ext')?.value) || 0,
                pres: parseFloat(document.getElementById('train_mod_pres')?.value) || 0
            }
        };

        // Top 3
        global.top3 = Array.from({ length: 3 }, (_, i) => ({
            desc: document.getElementById(`prob_desc_${i}`)?.value,
            crit: document.getElementById(`prob_crit_${i}`)?.value,
            resp: document.getElementById(`prob_resp_${i}`)?.value,
            evol: parseFloat(document.getElementById(`prob_evol_${i}`)?.value) || 0
        }));

        // Bird Pyramid
        if (!global.birdPyramid) global.birdPyramid = {};
        global.birdPyramid.levels = Array.from({ length: 6 }, (_, i) => {
            const el = document.getElementById(`bird_level_${i}`);
            return el ? el.innerText.trim() : (this.defaultTemplate.birdPyramid?.levels[i] || '');
        });
        global.birdPyramid.labels = Array.from({ length: 6 }, (_, i) => {
            const el = document.getElementById(`bird_label_${i}`);
            return el ? el.innerText.trim() : (this.defaultTemplate.birdPyramid?.labels[i] || '');
        });

        // --- MONTHLY (Resets by month) ---
        const qmMonthEl = document.getElementById('qm_month');
        const qmYearEl = document.getElementById('qm_year');
        const qmMonthKey = (qmMonthEl && qmYearEl)
            ? `${qmYearEl.value}-${(parseInt(qmMonthEl.value) + 1).toString().padStart(2, '0')}`
            : monthKey;

        if (!op.monthly[qmMonthKey]) op.monthly[qmMonthKey] = {};
        const qmMonthly = op.monthly[qmMonthKey];

        if (!this.currentWaterMonthKey) {
            this.currentWaterMonthKey = monthKey;
        }
        if (!op.monthly[this.currentWaterMonthKey]) {
            op.monthly[this.currentWaterMonthKey] = {};
        }
        op.monthly[this.currentWaterMonthKey].forkliftWater = [
            parseFloat(document.getElementById('water_w1')?.value) || 0,
            parseFloat(document.getElementById('water_w2')?.value) || 0,
            parseFloat(document.getElementById('water_w3')?.value) || 0,
            parseFloat(document.getElementById('water_w4')?.value) || 0
        ];

        qmMonthly.qm = {
            reclamacoes: document.getElementById('qm_reclamacoes')?.value,
            solucionadas: document.getElementById('qm_solucionadas')?.value,
            nao_solucionadas: document.getElementById('qm_nao_solucionadas')?.value,
            complaints: Array.from({ length: 5 }, (_, i) => ({
                type: document.getElementById(`comp_type_${i}`)?.value,
                qty: parseFloat(document.getElementById(`comp_qty_${i}`)?.value) || 0
            })),
            complaintsStatus: {
                open: parseFloat(document.getElementById('comp_status_open')?.value) || 0,
                closed: parseFloat(document.getElementById('comp_status_closed')?.value) || 0,
                invalid: parseFloat(document.getElementById('comp_status_invalid')?.value) || 0
            }
        };

        // --- DAILY (Resets by day) ---
        daily.intro = document.getElementById('introText')?.value;
        if (!daily.safety) daily.safety = {};
        Object.assign(daily.safety, {
            status: document.getElementById('safetyStatus')?.value || 'sem_acidente',
            record: document.getElementById('safetyRecord')?.value || 0,
            current_days: document.getElementById('safetyCurrent')?.value || 0,
            lost_time: document.getElementById('safetyLostTime')?.value || 0,
            no_lost_time: document.getElementById('safetyNoLostTime')?.value || 0,
            last_accident_date: document.getElementById('safetyLastAccident')?.value || '',
            sc_open: document.getElementById('sc_open')?.value || 0,
            sc_closed: document.getElementById('sc_closed')?.value || 0,
            sc_rejected: document.getElementById('sc_rejected')?.value || 0,
            sc_total: document.getElementById('sc_total')?.value || 0,
            obs: document.getElementById('safetyObs')?.value || ''
        });

        daily.donoRua = {
            names: Array.from({ length: 5 }, (_, i) => document.getElementById(`dono_name_${i}`)?.value),
            scores: Array.from({ length: 5 }, (_, i) => parseFloat(document.getElementById(`dono_score_${i}`)?.value) || 0)
        };

        daily.galpao = {
            insatisfatorio: parseInt(document.getElementById('galpao_insatisfatorio')?.value) || 0,
            toleravel: parseInt(document.getElementById('galpao_toleravel')?.value) || 0,
            satisfatorio: parseInt(document.getElementById('galpao_satisfatorio')?.value) || 0
        };

        daily.performance = {
            best: {
                name: document.getElementById('perf_best_name')?.value,
                score: parseInt(document.getElementById('perf_best_score')?.value) || 0,
                gender: document.getElementById('perf_best_gender')?.value
            },
            worst: {
                name: document.getElementById('perf_worst_name')?.value,
                score: parseInt(document.getElementById('perf_worst_score')?.value) || 0,
                gender: document.getElementById('perf_worst_gender')?.value
            }
        };
    },

    saveData: function (silent = false, forceImmediate = false) {
        this.gatherDataFromDOM();
        this.saveToLocalStorage(forceImmediate);

        if (silent) return;

        // UI Feedback
        const btn = document.querySelector('.btn-primary') || document.querySelector('button[onclick="ReportApp.saveData()"]');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> SALVO!';
            btn.style.backgroundColor = '#16a34a';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.backgroundColor = '';
            }, 2000);
        }
    },

    toggleHistoryPanel: function () {
        const overlay = document.getElementById('historyOverlay');
        if (overlay.style.display === 'none' || !overlay.style.display) {
            overlay.style.display = 'flex';
            this.renderHistoryList();
        } else {
            overlay.style.display = 'none';
        }
    },

    renderHistoryList: function () {
        const filterMonth = document.getElementById('historyMonthFilter')?.value; // YYYY-MM
        const container = document.getElementById('historyList');
        const op = this.data[this.currentOp];
        if (!op || !op.daily) {
            container.innerHTML = '<p style="text-align:center; color:#666;">Nenhum One Page encontrado.</p>';
            return;
        }

        const dates = Object.keys(op.daily).sort().reverse();
        container.innerHTML = '';

        const filteredDates = filterMonth ? dates.filter(d => d.startsWith(filterMonth)) : dates;

        if (filteredDates.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#666; padding: 2rem;">Nenhuma data registrada ' + (filterMonth ? 'neste mês.' : 'ainda.') + '</p>';
            return;
        }

        filteredDates.forEach(dateYMD => {
            const [y, m, d] = dateYMD.split('-');
            const item = document.createElement('div');
            item.style.cssText = 'background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s;';
            item.onmouseover = () => item.style.borderColor = 'var(--primary)';
            item.onmouseout = () => item.style.borderColor = '#e2e8f0';

            item.innerHTML = `
                <div>
                    <span style="font-size: 1rem; font-weight: 800; color: var(--primary);">${d}/${m}/${y}</span>
                    <span style="display: block; font-size: 0.7rem; color: #64748b; text-transform: uppercase; font-weight: 700;">${this.currentOp}</span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-outline" style="font-size: 0.65rem; padding: 6px 12px; font-weight: 800; pointer-events: none;"><i class="fas fa-external-link-alt"></i> ABRIR</button>
                    <button class="btn btn-outline btn-delete-history" style="font-size: 0.65rem; padding: 6px 10px; color: #dc2626; border-color: #fecaca; background: #fff2f2; pointer-events: auto;" title="Excluir Histórico"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            
            item.onclick = (e) => {
                if(e.target.closest('.btn-delete-history')) {
                    e.stopPropagation();
                    this.deleteHistory(dateYMD);
                    return;
                }
                if(document.getElementById('reportDatePicker')) document.getElementById('reportDatePicker').value = dateYMD;
                this.toggleHistoryPanel();
                this.changeDate();
            };
            container.appendChild(item);
        });
    },

    deleteHistory: function(dateYMD) {
        const password = prompt('Digite a senha para excluir o histórico:');
        if (password !== 'Simaslog@2026') {
            if (password !== null) {
                alert('Senha incorreta!');
            }
            return;
        }
        
        const op = this.data[this.currentOp];
        if (op && op.daily && op.daily[dateYMD]) {
            delete op.daily[dateYMD];
            // Save directly to storage, bypass gatherDataFromDOM so it doesn't recreate from current screen
            // Since we deleted history, we must remove it from Firebase too by doing a full sync
            this.saveToLocalStorage(true, true);
            this.renderHistoryList();
            
            // If the deleted date is the currently active one, refresh the screen to clear values
            if (dateYMD === this.currentDateYMD) {
                this.render();
            }
            
            alert('Histórico excluído com sucesso!');
        }
    },

    changeSafetyMonthOrYear: function () {
        // 1. Save currently displayed water data to the OLD month key (currentWaterMonthKey)
        if (this.currentWaterMonthKey && this.currentOp) {
            const op = this.data[this.currentOp];
            if (op) {
                if (!op.monthly) op.monthly = {};
                if (!op.monthly[this.currentWaterMonthKey]) op.monthly[this.currentWaterMonthKey] = {};
                
                const water = [];
                for (let i = 1; i <= 4; i++) {
                    const el = document.getElementById(`water_w${i}`);
                    water.push(el ? (parseInt(el.value) || 0) : 0);
                }
                op.monthly[this.currentWaterMonthKey].forkliftWater = water;
                this.saveToLocalStorage(true, true);
            }
        }

        // 2. Update currentWaterMonthKey to the new month/year from dropdowns
        const mEl = document.getElementById('safetyMonth');
        const yEl = document.getElementById('safetyYear');
        const m = mEl ? parseInt(mEl.value) : new Date().getMonth();
        const y = yEl ? parseInt(yEl.value) : new Date().getFullYear();
        this.currentWaterMonthKey = `${y}-${(m + 1).toString().padStart(2, '0')}`;

        // Sync the newly added selectors in Forklift Water to match safetyMonth and safetyYear
        this.safeSet('waterCardMonth', m.toString());
        this.safeSet('waterCardYear', y.toString());
        this.safeSet('waterPanelMonth', m.toString());
        this.safeSet('waterPanelYear', y.toString());

        // 3. Render safety cross for the new month/year
        this.renderSafetyCross();

        // 4. Load and render water data for the new month/year
        const op = this.data[this.currentOp] || { monthly: {} };
        const monthlyData = (op.monthly && op.monthly[this.currentWaterMonthKey]) ? op.monthly[this.currentWaterMonthKey] : {};
        const water = monthlyData.forkliftWater || this.defaultTemplate.forkliftWater || [0, 0, 0, 0];

        water.forEach((val, idx) => {
            this.safeSet(`water_w${idx + 1}`, val);
        });
        this.updateWaterChart();
    },

    changeWaterMonthOrYear: function (mVal, yVal) {
        if (mVal !== null && mVal !== undefined) {
            this.safeSet('safetyMonth', mVal);
        }
        if (yVal !== null && yVal !== undefined) {
            this.safeSet('safetyYear', yVal);
        }
        this.changeSafetyMonthOrYear();
    },

    setupValidation: function () {
        // Enforce numeric only on specific fields
        const numericInputs = document.querySelectorAll('input[type="number"], #safetyIndicator');
        numericInputs.forEach(input => {
            input.addEventListener('input', function (e) {
                // Remove any non-numeric and non-dot/comma chars
                this.value = this.value.replace(/[^0-9.,]/g, '');
            });
            input.addEventListener('blur', function (e) {
                // Formatting on blur if needed, e.g. replacing comma with dot for data consistency
                // Optional: valid number check
            });
        });
    },

    renderSafetyCross: function () {
        try {
            const grid = document.getElementById('safetyCrossGrid');
            if (!grid) return;
            grid.innerHTML = '';

            // Get Month/Year with fallbacks
            const monthEl = document.getElementById('safetyMonth');
            const yearEl = document.getElementById('safetyYear');

            const m = monthEl ? parseInt(monthEl.value) : new Date().getMonth();
            const y = yearEl ? parseInt(yearEl.value) : new Date().getFullYear();

            if (isNaN(m) || isNaN(y)) return;

            const daysInMonth = new Date(y, m + 1, 0).getDate();

            // Define the Cross Layout (6 columns)
            const layout = [
                [0, 0, 1, 2, 0, 0],
                [0, 0, 3, 4, 0, 0],
                [0, 0, 5, 6, 0, 0],
                [7, 8, 9, 10, 11, 12],
                [13, 14, 15, 16, 17, 18],
                [19, 20, 21, 22, 23, 24],
                [0, 0, 25, 26, 0, 0],
                [0, 0, 27, 28, 0, 0],
                [0, 0, 29, 30, 0, 0],
                [0, 0, 31, 0, 0, 0]
            ];

            const monthKey = `${y}-${(m + 1).toString().padStart(2, '0')}`;
            const op = this.data[this.currentOp];
            const crossData = (op && op.monthly && op.monthly[monthKey] && op.monthly[monthKey].cross) ? op.monthly[monthKey].cross : {};

            layout.forEach(row => {
                row.forEach(day => {
                    const cell = document.createElement('div');

                    if (day === 0 || day > daysInMonth) {
                        cell.className = 'cross-cell empty';
                    } else {
                        cell.className = 'cross-cell';
                        cell.textContent = day;

                        const status = crossData[day];
                        if (status === 'ok') {
                            cell.classList.add('status-ok');
                        } else if (status === 'nok') {
                            cell.classList.add('status-nok');
                        }
                        cell.onclick = () => this.toggleCrossDay(day);
                    }
                    grid.appendChild(cell);
                });
            });
        } catch (err) { 
            console.error("Error rendering safety cross:", err); }
    },


    renderSafetyImages: function () {
        const opData = this.getDataForOp(this.currentOp);
        const images = opData.safety.images || ['', '', ''];

        images.forEach((imgSrc, idx) => {
            const preview = document.getElementById(`preview-${idx}`);
            const placeholder = document.getElementById(`placeholder-${idx}`);
            const card = document.getElementById(`card-${idx}`);
            const delBtn = document.getElementById(`del-img-${idx}`);

            if (imgSrc) {
                preview.src = imgSrc;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
                card.style.borderStyle = 'solid';
                if (delBtn) delBtn.style.display = 'flex';
            } else {
                preview.src = '';
                preview.style.display = 'none';
                placeholder.style.display = 'flex';
                card.style.borderStyle = 'dashed';
                if (delBtn) delBtn.style.display = 'none';
            }
        });
    },

    removeSafetyImage: function (index) {
        if (!confirm('Deseja realmente apagar esta imagem do cartão de segurança?')) return;
        const op = this.data[this.currentOp];
        const dateYMD = this.currentDateYMD;
        if (op && op.daily && op.daily[dateYMD] && op.daily[dateYMD].safety && op.daily[dateYMD].safety.images) {
            op.daily[dateYMD].safety.images[index] = '';
            this.saveData(true, true);
            this.render();
        }
    },

    openLightbox: function (index) {
        const opData = this.getDataForOp(this.currentOp);
        const imgSrc = opData.safety.images[index];
        if (!imgSrc) return;

        const modal = document.getElementById('lightboxModal');
        const singleImg = document.getElementById('lightboxImg');
        const lupContainer = document.getElementById('lightboxLupContainer');
        if (lupContainer) lupContainer.style.display = 'none';
        singleImg.style.display = 'block';

        modal.style.display = 'block';
        singleImg.src = imgSrc;
    },

    openLightboxSrc: function (src) {
        if (!src) return;
        const modal = document.getElementById('lightboxModal');
        const singleImg = document.getElementById('lightboxImg');
        const lupContainer = document.getElementById('lightboxLupContainer');
        if (lupContainer) lupContainer.style.display = 'none';
        singleImg.style.display = 'block';

        modal.style.display = 'block';
        singleImg.src = src;
    },

    openLightboxLup: function (index) {
        const opData = this.getDataForOp(this.currentOp);
        if (!opData || !opData.lups || !opData.lups[index]) return;
        const lup = opData.lups[index];
        if (!lup.imgErrado && !lup.imgCerto) return;

        const modal = document.getElementById('lightboxModal');
        const singleImg = document.getElementById('lightboxImg');
        const lupContainer = document.getElementById('lightboxLupContainer');
        const imgDesvio = document.getElementById('lightboxLupDesvio');
        const imgPadrao = (document.getElementById('lightboxLupPadrao') || document.getElementById('lightboxLupPadrão'));

        var h1 = document.querySelector('#lightboxLupContainer > div:nth-child(1) h3'); if(h1) h1.innerText = 'DESVIO';
        var h2 = document.querySelector('#lightboxLupContainer > div:nth-child(2) h3'); if(h2) h2.innerText = 'PADRÃO';

        if(singleImg) singleImg.style.display = 'none';
        if(lupContainer) lupContainer.style.display = 'flex';

        if(imgDesvio) imgDesvio.src = lup.imgErrado || 'https://placehold.co/400x300/f8fafc/cbd5e1?text=SEM+IMAGEM';
        if(imgPadrao) imgPadrao.src = lup.imgCerto || 'https://placehold.co/400x300/f8fafc/cbd5e1?text=SEM+IMAGEM';

        modal.style.display = 'block';
    },

    openLightboxMelhoria: function (index) {
        const op = this.data[this.currentOp];
        const dateYMD = this.currentDateYMD;
        if (!op || !op.daily[dateYMD] || !op.daily[dateYMD].melhorias || !op.daily[dateYMD].melhorias[index]) return;
        
        const m = op.daily[dateYMD].melhorias[index];
        if (!m.imgAntes && !m.imgDepois) return;

        const modal = document.getElementById('lightboxModal');
        const singleImg = document.getElementById('lightboxImg');
        const lupContainer = document.getElementById('lightboxLupContainer');
        const imgDesvio = document.getElementById('lightboxLupDesvio');
        const imgPadrao = (document.getElementById('lightboxLupPadrao') || document.getElementById('lightboxLupPadrão'));

        var h1 = document.querySelector('#lightboxLupContainer > div:nth-child(1) h3'); if(h1) h1.innerText = 'ANTES';
        var h2 = document.querySelector('#lightboxLupContainer > div:nth-child(2) h3'); if(h2) h2.innerText = 'DEPOIS';

        if(singleImg) singleImg.style.display = 'none';
        if(lupContainer) lupContainer.style.display = 'flex';

        if(imgDesvio) imgDesvio.src = m.imgAntes || 'https://placehold.co/400x300/f8fafc/cbd5e1?text=SEM+IMAGEM';
        if(imgPadrao) imgPadrao.src = m.imgDepois || 'https://placehold.co/400x300/f8fafc/cbd5e1?text=SEM+IMAGEM';

        modal.style.display = 'block';
    },

    closeLightbox: function () {
        document.getElementById('lightboxModal').style.display = 'none';
    },

    // Dono da Rua / 5S Functions
    toggleDonoRuaPanel: function () {
        const panel = document.getElementById('donoRuaPanel');
        const backdrop = document.getElementById('panelBackdrop');
        if (panel) {
            const isOpening = panel.style.display === 'none' || panel.style.display === '';
            panel.style.display = isOpening ? 'block' : 'none';
            if (backdrop) backdrop.style.display = isOpening ? 'block' : 'none';
        }
    },

    updateDonoRuaCharts: function () {
        // Gather data
        const names = [];
        const scores = [];

        for (let i = 0; i < 5; i++) {
            const nameEl = document.getElementById(`dono_name_${i}`);
            const scoreEl = document.getElementById(`dono_score_${i}`);
            if (nameEl && scoreEl) {
                names.push(nameEl.value || `Pessoa ${i + 1}`);
                scores.push(parseFloat(scoreEl.value) || 0);
            }
        }

        // Create array of objects for sorting
        const data = names.map((name, i) => ({ name, score: scores[i] }));

        // Sort by score descending
        data.sort((a, b) => b.score - a.score);

        // Extract sorted arrays
        const sortedNames = data.map(d => d.name);
        const sortedScores = data.map(d => d.score);

        // Update Top 5 Chart (Horizontal Bar)
        const top5Canvas = document.getElementById('donoRuaTop5Chart');
        if (top5Canvas) {
            const ctx = top5Canvas.getContext('2d');

            // Color gradient based on score
            const barColors = sortedScores.map(score => {
                if (score >= 80) return this.colors.status.green;
                if (score >= 60) return this.colors.blueMain;
                if (score >= 40) return this.colors.status.yellow;
                return this.colors.status.red;
            });

            if (this.donoRuaTop5ChartInstance) {
                this.donoRuaTop5ChartInstance.data.labels = sortedNames;
                this.donoRuaTop5ChartInstance.data.datasets[0].data = sortedScores;
                this.donoRuaTop5ChartInstance.data.datasets[0].backgroundColor = barColors;
                this.donoRuaTop5ChartInstance.update();
            } else {
                this.donoRuaTop5ChartInstance = new Chart(ctx, {
                    plugins: [ChartDataLabels],
                    type: 'bar',
                    data: {
                        labels: sortedNames,
                        datasets: [{
                            label: 'Nota 5S',
                            data: sortedScores,
                            backgroundColor: barColors,
                            borderRadius: 6,
                            barThickness: 30
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: { padding: { top: 30, right: 40 } },
                        plugins: {
                            legend: { display: false },
                            datalabels: {
                                anchor: 'end',
                                align: 'end',
                                offset: 4,
                                color: this.colors.text,
                                font: { size: 11, weight: 'bold' },
                                formatter: (value) => value > 0 ? value : ''
                            }
                        },
                        scales: {
                            x: {
                                beginAtZero: true,
                                max: 100,
                                grid: { color: this.colors.grid, drawBorder: false },
                                ticks: { font: { size: 9 }, color: this.colors.text }
                            },
                            y: {
                                grid: { display: false },
                                ticks: { font: { size: 10, weight: 'bold' }, color: this.colors.text }
                            }
                        }
                    }
                });
            }
        }
    },
    updateEvolutionBar: function (index) {
        const input = document.getElementById(`prob_evol_${index}`);
        const bar = document.getElementById(`evol_bar_${index}`);

        if (input && bar) {
            const value = Math.min(Math.max(parseInt(input.value) || 0, 0), 100);
            bar.style.width = value + '%';

            // Change color based on progress
            if (value >= 80) {
                bar.style.background = '#10b981'; // Green
            } else if (value >= 50) {
                bar.style.background = '#3b82f6'; // Blue
            } else if (value >= 25) {
                bar.style.background = '#f59e0b'; // Orange
            } else {
                bar.style.background = '#ef4444'; // Red
            }
        }
    },



    // Galpão Functions
    toggleGalpaoPanel: function () {
        const panel = document.getElementById('galpaoPanel');
        const backdrop = document.getElementById('panelBackdrop');
        if (panel) {
            const isOpening = panel.style.display === 'none' || panel.style.display === '';
            panel.style.display = isOpening ? 'block' : 'none';
            if (backdrop) backdrop.style.display = isOpening ? 'block' : 'none';
        }
    },

    updateGalpaoChart: function () {
        const insatisfatorio = parseInt(document.getElementById('galpao_insatisfatorio')?.value) || 0;
        const toleravel = parseInt(document.getElementById('galpao_toleravel')?.value) || 0;
        const satisfatorio = parseInt(document.getElementById('galpao_satisfatorio')?.value) || 0;

        const total = insatisfatorio + toleravel + satisfatorio;

        // Calculate percentages
        const data = total > 0 ? [
            ((insatisfatorio / total) * 100).toFixed(1),
            ((toleravel / total) * 100).toFixed(1),
            ((satisfatorio / total) * 100).toFixed(1)
        ] : [0, 0, 0];

        const canvas = document.getElementById('galpaoDonutChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');

            if (this.galpaoDonutChartInstance) {
                this.galpaoDonutChartInstance.data.datasets[0].data = data;
                this.galpaoDonutChartInstance.update();
            } else {
                this.galpaoDonutChartInstance = new Chart(ctx, {
                    plugins: [ChartDataLabels],
                    type: 'doughnut',
                    data: {
                        labels: ['Insatisfatório', 'Tolerável', 'Satisfatório'],
                        datasets: [{
                            data: data,
                            backgroundColor: [this.colors.status.red, this.colors.status.yellow, this.colors.status.green],
                            borderWidth: 2,
                            borderColor: '#fff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: { padding: { top: 10, bottom: 10 } }, // Adjusted padding to fit
                        plugins: {
                            legend: {
                                display: true,
                                position: 'bottom',
                                labels: {
                                    font: { size: 9, weight: 'bold' },
                                    padding: 5,
                                    usePointStyle: true
                                }
                            },
                            datalabels: {
                                color: '#fff',
                                font: { size: 12, weight: 'bold' },
                                formatter: (value) => {
                                    return value > 0 ? value + '%' : '';
                                }
                            }
                        },
                        cutout: '65%'
                    }
                });
            }
        }
    },

    togglePerformancePanel: function () {
        const panel = document.getElementById('performancePanel');
        const backdrop = document.getElementById('panelBackdrop');
        if (panel) {
            const isOpening = panel.style.display === 'none' || panel.style.display === '';
            panel.style.display = isOpening ? 'block' : 'none';
            if (backdrop) backdrop.style.display = isOpening ? 'block' : 'none';
        }
    },

    updatePerformanceFigures: function () {
        const bestName = document.getElementById('perf_best_name')?.value || '';
        const bestScore = parseInt(document.getElementById('perf_best_score')?.value) || 0;
        const bestGender = document.getElementById('perf_best_gender')?.value || 'male';

        const worstName = document.getElementById('perf_worst_name')?.value || '';
        const worstScore = parseInt(document.getElementById('perf_worst_score')?.value) || 0;
        const worstGender = document.getElementById('perf_worst_gender')?.value || 'male';

        const container = document.getElementById('performanceFiguresContainer');
        if (!container) return;

        const figures = [
            { label: 'MAIOR', name: bestName, score: bestScore, gender: bestGender },
            { label: 'MENOR', name: worstName, score: worstScore, gender: worstGender }
        ];

        container.innerHTML = figures.map((f, i) => {
            const percentage = Math.min(Math.max(f.score, 0), 100);

            // Color logic: Red (low) to Blue (high)
            // Using HSL for smooth transition: 0 (Red) to 220 (Blue)
            const hue = (percentage / 100) * 220;
            const color = `hsl(${hue}, 80%, 45%)`;

            // SVG Path for Male/Female
            const malePath = "M14 7h-4c-1.1 0-2 .9-2 2v6h2.5v7h3v-7H16V9c0-1.1-.9-2-2-2zM12 6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z";
            const femalePath = "M13.94 8.31C13.62 7.52 12.85 7 12 7s-1.62.52-1.94 1.31L7 16h3v6h4v-6h3l-3.06-7.69zM12 6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z";
            const path = f.gender === 'female' ? femalePath : malePath;

            return `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; position: relative;">
                    <div style="font-size: 0.6rem; font-weight: 800; color: #94a3b8; margin-bottom: 5px;">${f.label}</div>
                    <div style="position: relative; width: 80px; height: 140px;">
                        <!-- Background Figure (Empty) -->
                        <svg viewBox="0 0 24 24" style="width: 100%; height: 100%; fill: #f1f5f9;">
                            <path d="${path}" />
                        </svg>
                        
                        <!-- Foreground Figure (Filled) -->
                        <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: ${percentage}%; overflow: hidden; transition: height 0.5s ease-out;">
                            <svg viewBox="0 0 24 24" style="width: 80px; height: 140px; position: absolute; bottom: 0; left: 0; fill: ${color};">
                                <path d="${path}" />
                            </svg>
                        </div>
                    </div>
                    <div style="margin-top: 10px; text-align: center;">
                        <div style="font-size: 1.1rem; font-weight: 800; color: ${color};">${percentage}%</div>
                        <div style="font-size: 0.7rem; font-weight: 700; color: #475569; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${f.name.toUpperCase()}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // LUPS (LOP) Functions
    renderLupCards: function () {
        const opData = this.getDataForOp(this.currentOp);
        const container = document.getElementById('lupsCardsContainer');
        if (!container) return;
        container.innerHTML = '';

        // Consultation Area
        if (opData.lups && opData.lups.length > 0) {
            const nav = document.createElement('div');
            nav.style.cssText = 'background: white; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 1.5rem; display: flex; gap: 0.5rem; overflow-x: auto; white-space: nowrap; align-items: center; grid-column: span 2;';
            nav.innerHTML = '<span style="font-size:0.65rem; font-weight:800; color:#64748b; text-transform:uppercase; margin-right:0.5rem;"><i class="fas fa-search"></i> Consulta:</span>';

            opData.lups.forEach((lup, i) => {
                const link = document.createElement('button');
                link.id = `lup_nav_btn_${i}`;
                link.onclick = () => {
                    const el = document.getElementById(`lup_card_${i}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                };
                link.style.cssText = 'padding: 4px 10px; border-radius: 4px; background: #f8fafc; color: #1e293b; font-size: 0.6rem; font-weight: 800; text-decoration: none; border: 1px solid #cbd5e1; cursor:pointer;';
                link.textContent = lup.titulo || `LUP #${i + 1}`;
                nav.appendChild(link);
            });
            container.appendChild(nav);
        }

        // Grid Container Setup
        container.style.display = 'grid';
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gap = '1.5rem';

        (opData.lups || []).forEach((lup, index) => {
            const card = document.createElement('div');
            card.id = `lup_card_${index}`;
            card.style.cssText = 'background: #F5F6F8; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 1.25rem; margin-bottom: 1rem; font-family: "Inter", sans-serif; position: relative; overflow: hidden; page-break-inside: avoid; display: flex; flex-direction: column;';

            // Classification Colors
            const colorBasico = '#10b981'; // Green
            const colorAtencao = '#94a3b8'; // gray
            const colorMelhoria = '#e3382c'; // red

            card.innerHTML = `
                <!-- 1. Header (Compact) -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.75rem;">
                    <div>
                        <label style="display:block; font-size: 0.5rem; font-weight: 800; color: #64748b; text-transform: uppercase;">Unidade / Depto</label>
                        <div style="display:flex; align-items:center; gap:0.25rem;">
                            <input type="text" value="${lup.planta || ''}" oninput="ReportApp.updateLupField(${index}, 'planta', this.value)" style="width:45%; border:none; background:transparent; font-weight:700; color:#1e293b; font-size:0.75rem;" placeholder="Planta">
                            <span style="color:#cbd5e1;">/</span>
                            <input type="text" value="${lup.depto || ''}" oninput="ReportApp.updateLupField(${index}, 'depto', this.value)" style="width:45%; border:none; background:transparent; font-weight:700; color:#1e293b; font-size:0.75rem;" placeholder="Área">
                        </div>
                    </div>
                    <div style="display: flex; justify-content: flex-end; align-items: center; gap: 0.5rem;">
                         <input type="date" value="${lup.data || ''}" oninput="ReportApp.updateLupField(${index}, 'data', this.value)" style="border:none; background:transparent; font-weight:700; color:#1e293b; font-size:0.7rem; width: 100px;">
                         <button onclick="ReportApp.removeLup(${index})" style="background:#fff2f2; border:1px solid #fecaca; color:#dc2626; border-radius:4px; padding:2px 6px; cursor:pointer; font-size: 0.7rem;"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>

                <!-- 2. Classification (Compact) -->
                <div style="display: flex; justify-content: space-between; margin-bottom: 1.25rem; background: rgba(255,255,255,0.7); padding: 0.5rem; border-radius: 4px; border: 1px solid #edf2f7;">
                    <div style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer;" onclick="ReportApp.updateLupField(${index}, 'tipo', 'basico')">
                        <div style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid ${colorBasico}; display:flex; align-items:center; justify-content:center;">
                            <div style="width: 6px; height: 6px; border-radius: 50%; background: ${lup.tipo === 'basico' ? colorBasico : 'transparent'};"></div>
                        </div>
                        <span style="font-size: 0.6rem; font-weight: 700; color: ${lup.tipo === 'basico' ? colorBasico : '#64748b'};">Básico</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer;" onclick="ReportApp.updateLupField(${index}, 'tipo', 'atencao')">
                        <div style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid ${colorAtencao}; display:flex; align-items:center; justify-content:center;">
                            <div style="width: 6px; height: 6px; border-radius: 50%; background: ${lup.tipo === 'atencao' ? colorAtencao : 'transparent'};"></div>
                        </div>
                        <span style="font-size: 0.6rem; font-weight: 700; color: ${lup.tipo === 'atencao' ? '#1e293b' : '#64748b'};">Atenção</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer;" onclick="ReportApp.updateLupField(${index}, 'tipo', 'melhoria')">
                        <div style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid ${colorMelhoria}; display:flex; align-items:center; justify-content:center;">
                            <div style="width: 6px; height: 6px; border-radius: 50%; background: ${lup.tipo === 'melhoria' ? colorMelhoria : 'transparent'};"></div>
                        </div>
                        <span style="font-size: 0.6rem; font-weight: 700; color: ${lup.tipo === 'melhoria' ? colorMelhoria : '#64748b'};">Melhoria</span>
                    </div>
                </div>

                <!-- 3. Title Section (Scaled) -->
                <div style="margin-bottom: 1.25rem; border-left: 3px solid #142245; padding-left: 0.75rem;">
                    <input type="text" value="${lup.titulo || ''}" oninput="ReportApp.updateLupField(${index}, 'titulo', this.value)" placeholder="TÍTULO DA LIÇÃO" style="width:100%; border:none; background:transparent; font-weight:800; font-size:1.1rem; color:#142245; margin-bottom: 0.15rem; outline:none;" id="lup_title_input_${index}">
                    <p style="font-size:0.6rem; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.02em;">Padrão Esperado vs Desvio</p>
                </div>

                <!-- 4. Comparison Columns (Vertical on Small, Grid here) -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
                    <!-- Left: Desvio -->
                    <div style="background: white; border-radius: 6px; border: 1px solid #e2e8f0; border-left: 4px solid #e3382c; overflow: hidden; display: flex; flex-direction: column;">
                        <div style="height: 180px; background: #f8fafc; cursor: pointer; display: flex; align-items: center; justify-content: center; position: relative;">
                            ${lup.imgErrado ? `
                                <img src="${lup.imgErrado}" style="width:100%; height:100%; object-fit:cover;" onclick="document.getElementById('lup_file_errado_${index}').click()">
                                <button onclick="event.stopPropagation(); ReportApp.openLightboxLup(${index})" style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:white; border:none; border-radius:4px; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Ampliar LUP"><i class="fas fa-search-plus"></i></button>
                            ` : `<div style="text-align:center; color:#cbd5e1; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;" onclick="document.getElementById('lup_file_errado_${index}').click()"><i class="fas fa-camera fa-2x"></i><br><span style="font-size:0.5rem; font-weight:800;">DESVIO</span></div>`}
                            <input type="file" id="lup_file_errado_${index}" style="display:none;" accept="image/*" onchange="ReportApp.handleLupImage(${index}, 'imgErrado', this)">
                        </div>
                    </div>

                    <!-- Right: Padrao -->
                    <div style="background: white; border-radius: 6px; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; overflow: hidden; display: flex; flex-direction: column;">
                        <div style="height: 180px; background: #f8fafc; cursor: pointer; display: flex; align-items: center; justify-content: center; position: relative;">
                            ${lup.imgCerto ? `
                                <img src="${lup.imgCerto}" style="width:100%; height:100%; object-fit:cover;" onclick="document.getElementById('lup_file_certo_${index}').click()">
                                <button onclick="event.stopPropagation(); ReportApp.openLightboxLup(${index})" style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:white; border:none; border-radius:4px; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Ampliar LUP"><i class="fas fa-search-plus"></i></button>
                            ` : `<div style="text-align:center; color:#cbd5e1; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;" onclick="document.getElementById('lup_file_certo_${index}').click()"><i class="fas fa-camera fa-2x"></i><br><span style="font-size:0.5rem; font-weight:800;">PADRÃO</span></div>`}
                            <input type="file" id="lup_file_certo_${index}" style="display:none;" accept="image/*" onchange="ReportApp.handleLupImage(${index}, 'imgCerto', this)">
                        </div>
                    </div>
                </div>

                <!-- 5. Analysis and Action (Combined/Stacked to save height) -->
                <div style="background: white; border-radius: 6px; padding: 0.75rem; border: 1px solid #e2e8f0; margin-bottom: 1.5rem;">
                    <div style="border-bottom: 1px solid #edf2f7; padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
                        <h5 style="font-size: 0.55rem; font-weight: 900; color: #64748b; text-transform: uppercase; margin:0 0 0.25rem 0; display:flex; align-items:center; gap:0.25rem;"><i class="fas fa-microscope"></i> Análise</h5>
                        <textarea oninput="ReportApp.updateLupField(${index}, 'analise', this.value)" style="width:100%; border:none; background:transparent; font-size:0.7rem; color:#475569; min-height:45px; resize:none; line-height:1.3; outline:none;" placeholder="Análise técnica...">${lup.analise || ''}</textarea>
                    </div>
                    <div>
                        <h5 style="font-size: 0.55rem; font-weight: 900; color: #142245; text-transform: uppercase; margin:0 0 0.25rem 0; display:flex; align-items:center; gap:0.25rem;"><i class="fas fa-bullseye"></i> Ação/Padronização</h5>
                        <textarea oninput="ReportApp.updateLupField(${index}, 'acao', this.value)" style="width:100%; border:none; background:transparent; font-size:0.7rem; color:#142245; min-height:45px; resize:none; line-height:1.3; outline:none;" placeholder="Ação implementada...">${lup.acao || ''}</textarea>
                    </div>
                </div>

                <!-- 6. Footer (Mini) -->
                <div style="border-top: 1px solid #e2e8f0; padding-top: 0.75rem; margin-top: auto;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap:0.5rem; margin-bottom: 0.5rem;">
                        <div>
                            <label style="display:block; font-size: 0.45rem; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Doc: LUP SIMAS</label>
                            <input type="text" value="${lup.codigo || ''}" oninput="ReportApp.updateLupField(${index}, 'codigo', this.value)" style="width:100%; border:none; background:transparent; font-weight:700; font-size:0.6rem; color:#1e293b;" placeholder="Código">
                        </div>
                        <div style="text-align: right;">
                            <label style="display:block; font-size: 0.45rem; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Responsável</label>
                            <input type="text" value="${lup.responsavel || ''}" oninput="ReportApp.updateLupField(${index}, 'responsavel', this.value)" style="width:100%; border:none; background:transparent; font-weight:700; font-size:0.6rem; color:#1e293b; text-align:right;" placeholder="Nome">
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                        <span style="font-size: 0.5rem; font-weight: 700; color: #cbd5e1;">Versão: ${lup.versao || '1.0'}</span>
                        <img src="data:image/png;base64,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QQI5eRMjASLtKgDHRToc9JWfsXxX4LOV0QHcq8yyvbNoTORH3tzGxP2fnXzGujtLzK01ixPUwph/A4Crg7VbXunlOy+34VGc26f2k07HCfgRx5xD/Njnb3di3our4M/XC8Ui3rufnL+RVqzic8rb3pQj9Vi9h9tAro34jugqs4kXAIaBdXde8KxXztXJO2S1lP/dW8HgFoI1ujopQ/rFLNJcaegZEwnxxYMPHX7s8r+vm5QP/Qnirq6KgAiIgAgMEMiiwHK5JGXvGdv7J4/mSiVLnE2KnWpm/aJY7xnL1UK+FF5fturCpABQPyeTgLvzPZd/+HtkktheVN6aZsY/s2KsKMRwfhpzpPC3yz/8iLtxViCMGufA9cJvJV4v/BbkQsOqo9pPwd/z2jgxj4PfUCxDzX/yOilVWWdSmUylADCpk6F+i4AIiIAIiIAIiIAIiIAIiIAIiEBdBCQA1EVWfkVABERABERABERABERABERABESgQwQkAHRoMtQVERABERABERABERABERABERABEaiLgASAusjKrwiIgAiIgAiIgAiIgAiIgAiIgAh0iIAEgA5NhroiAiIgAiIgAiIgAiIgAiIgAiIgAnURkABQF1n5FQEREAEREAEREAEREAEREAEREIEOEZAA0KHJUFdEQAREQAREQAREQAREQAREQAREoC4CEgDqIiu/IiACIiACIiACIiACIiACIiACItAhAhIAOjQZ6ooIiIAIiIAIiIAIiIAIiIAIiIAI1EVAAkBdZOVXBERABERABERABERABERABERABDpEQAJAhyZDXREBERABERABERABERABERABERCBughIAKiLrPyKgAiIgAiIgAiIgAiIgAiIgAiIQIcISADo0GSoKyIgAiIgAiIgAiIgAiIgAiIgAiJQFwEJAHWRlV8REAEREAEREAEREAEREAEREAER6BABCQAdmgx1RQREQAREQAREQAREQAREQAREQATqIiABoC6y8isCIiACIiACIiACIiACIiACIiACHSIgAaBDk6GuiIAIiIAIiIAIiIAIiIAIiIAIiEBdBCQA1EVWfkVABERABERABERABERABERABESgQwQkAHRoMtQVERABERABERABERABERABERABEaiLgASAusjKrwiIgAiIgAiIgAiIgAiIgAiIgAh0iIAEgA5NhroiAiIgAiIgAiIgAiIgAiIgAiIgAnURkABQF1n5FQEREAEREAEREAEREAEREAEREIEOEZAA0KHJUFdEQAREQAREQAREQAREQAREQAREoC4CEgDqIiu/IiACIiACIiACIiACIiACIiACItAhAhIAOjQZ6ooIiIAIiIAIiIAIiIAIiIAIiIAI1EVAAkBdZOVXBERABERABERABERABERABERABDpEQAJAhyZDXREBERABERABERABERABERABERCBughIAKiLrPyKgAiIgAiIgAiIgAiIgAiIgAiIQIcISADo0GSoKyIgAiIgAiIgAiIgAiIgAiIgAiJQFwEJAHWRlV8REAEREAEREAEREAEREAEREAER6BABCQAdmgx1RQREQAREQAREQAREQAREQAREQATqIiABoC6y8isCIiACIiACIiACIiACIiACIiACHSIgAaBDk6GuiIAIiIAIiIAIiIAIiIAIiIAIiEBdBCQA1EVWfkVABERABERABERABERABERABESgQwQkAHRoMtQVERABERABERABERABERABERABEaiLgASAusjKrwiIgAiIgAiIgAiIwMwTcPdnmdnKGcSNAD4681AEQAREoDUCEgBaQ68Ti4AItEXA3Zc1szXM7BIA1w7rh7vf1cw2M7N/ATi3rb7qvCIgAiIgApNLwN0fbWbf7X38m9keAH4wuSNSz0VABCadgASASZ9B9V8ERGBsAu6+yMz2M7OPm9mdcsOjzOxgM/sdgBt7ztz9EDN7Cf8A+NjYJ9GBIiACIiACImBm7n5fM/tTft7cZGaPBHC04IiACIhAmwQkALRJX+cWARFolIC784OeH/bD7HQze6GZ/dXMljezP5rZnRkFAOCkRjuqk4mACIiACEw0gRxF9mczW9/MKC7vAOD3Ez0odV4ERGAqCEgAmIpp1CBEQARGEXD3u5jZRWa2XI4C+KKZPTd97H/IzBjuP+x++E4Abx7lW38vAiIgAiIgAj0C7s7nCaPLHmdmXPnfAsCJIiQCIiACXSAgAaALs6A+iIAI1E7A3Z9jZoenFf1vAHhC34satwJsZWZHmNk6fR15r5m9BQBf3mQiIAIiIAIiMBYBd3+Pmb3OzG42s50A/GashjpIBERABBogIAGgAcg6hQiIQPsE3P3eZrahmf0DwJmDPXL3ZczsHik/wGo5UuAsAN5+z9UDERABERCBSSHg7tvk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" style="height: 20px; opacity: 0.8;" onerror="this.src=""">
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    },

    addLup: function () {
        try {
            const opName = this.currentOp || 'Matriz';
            const dateYMD = this.currentDateYMD;

            if (!this.data[opName]) {
                this.data[opName] = {
                    global: JSON.parse(JSON.stringify(this.defaultTemplate)),
                    daily: {},
                    monthly: {}
                };
            }
            const op = this.data[opName];
            if (!op.daily) op.daily = {};
            if (!op.daily[dateYMD]) op.daily[dateYMD] = {};
            if (!op.daily[dateYMD].lups) op.daily[dateYMD].lups = [];

            // Add the new Lup
            op.daily[dateYMD].lups.push({
                planta: opName,
                depto: 'Qualidade',
                data: dateYMD,
                titulo: 'NOVA LUP',
                tipo: 'basico',
                imgErrado: '',
                imgCerto: '',
                desvioDesc: '',
                padraoDesc: '',
                analise: '',
                acao: '',
                versao: '1.0',
                codigo: `LUP-${new Date().getTime().toString().slice(-4)}`,
                responsavel: '',
                area: 'Qualidade'
            });

            this.saveData(true);
            this.render(); // Full re-render to be safe

            // Scroll to the new LUP section
            setTimeout(() => {
                const container = document.getElementById('lupsCardsContainer');
                if (container && container.lastChild) {
                    container.lastChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);

        } catch (err) { 
            console.error("Error adding LUP:", err); }
    },

    removeLup: function (idx) {
        if (!confirm('Deseja excluir esta LUP?')) return;
        const op = this.data[this.currentOp];
        const dateYMD = this.currentDateYMD;
        if (op.daily[dateYMD] && op.daily[dateYMD].lups) {
            op.daily[dateYMD].lups.splice(idx, 1);
            this.saveData(true);
            this.renderLupCards();
        }
    },

    updateLupField: function (idx, field, val) {
        const op = this.data[this.currentOp];
        const dateYMD = this.currentDateYMD;
        if (!op.daily[dateYMD]) op.daily[dateYMD] = {};
        if (!op.daily[dateYMD].lups) return;

        op.daily[dateYMD].lups[idx][field] = val;

        if (field === 'tipo') {
            this.renderLupCards();
        } else if (field === 'titulo') {
            const btn = document.getElementById(`lup_nav_btn_${idx}`);
            if (btn) btn.textContent = val || `LUP #${idx + 1}`;
        }
        // Removed synchronous this.saveData(true) to prevent UI freezing
    },

    handleLupImage: async function (idx, field, input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            try {
                const compressedBase64 = await this.compressImage(file);
                const op = this.data[this.currentOp];
                const dateYMD = this.currentDateYMD;
                if (!op.daily[dateYMD].lups) return;
                op.daily[dateYMD].lups[idx][field] = compressedBase64;
                this.renderLupCards();
                this.saveData(true);
            } catch (err) { 
                console.error("Erro ao processar imagem da LUP:", err);
                alert("Erro ao processar imagem."); }
        }
    },

    renderMelhoriaCards: function () {
        const container = document.getElementById('melhoriasCardsContainer');
        if (!container) return;
        container.innerHTML = '';

        const op = this.data[this.currentOp];
        const dateYMD = this.currentDateYMD;

        if (!op || !op.daily[dateYMD] || !op.daily[dateYMD].melhorias) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #94a3b8; font-weight: 600;">Nenhuma melhoria registrada nesta data.</div>';
            return;
        }

        const melhorias = op.daily[dateYMD].melhorias;

        melhorias.forEach((m, index) => {
            const card = document.createElement('div');
            card.style.cssText = 'background: #F5F6F8; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 1.5rem; display: flex; flex-direction: column; position: relative; page-break-inside: avoid;';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
                    <div style="flex: 1;">
                         <input type="text" value="${m.titulo || ''}" oninput="ReportApp.updateMelhoriaField(${index}, 'titulo', this.value)" 
                                style="width: 100%; border: none; background: transparent; font-weight: 800; font-size: 1.25rem; color: #1e293b; outline: none; margin-bottom: 4px;" 
                                placeholder="TÍTULO DA MELHORIA">
                         <div style="font-size: 0.65rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Registro de Melhoria Contínua</div>
                    </div>
                    <button onclick="ReportApp.removeMelhoria(${index})" style="background:#fff2f2; border:1px solid #fecaca; color:#dc2626; border-radius:4px; padding:4px 8px; cursor:pointer; font-size: 0.7rem;"><i class="fas fa-trash-alt"></i></button>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                    <!-- Lado Ruim (Antes) -->
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <div style="font-size: 0.7rem; font-weight: 800; color: #e3382c; text-transform: uppercase; display: flex; align-items: center; gap: 0.4rem;">
                            <i class="fas fa-times-circle"></i> SITUAÇÃO ANTERIOR (O QUE ESTAVA RUIM)
                        </div>
                        <div style="height: 200px; background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                            ${m.imgAntes ? `
                                <img src="${m.imgAntes}" style="width:100%; height:100%; object-fit:cover;" onclick="document.getElementById('melhoria_file_antes_${index}').click()">
                                <button onclick="event.stopPropagation(); ReportApp.openLightboxMelhoria(${index})" style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:white; border:none; border-radius:4px; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Ampliar Melhoria"><i class="fas fa-search-plus"></i></button>
                            ` : `<div style="text-align:center; color:#cbd5e1; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;" onclick="document.getElementById('melhoria_file_antes_${index}').click()"><i class="fas fa-camera fa-2x"></i><br><span style="font-size:0.6rem; font-weight:800; margin-top:5px; display:block;">FOTO ANTES</span></div>`}
                            <input type="file" id="melhoria_file_antes_${index}" style="display:none;" accept="image/*" onchange="ReportApp.handleMelhoriaImage(${index}, 'imgAntes', this)">
                        </div>
                        <textarea oninput="ReportApp.updateMelhoriaField(${index}, 'descAntes', this.value)" 
                                  style="width:100%; border:1px solid #edf2f7; background:#f8fafc; border-radius:6px; padding:0.75rem; font-size:0.8rem; color:#475569; min-height:80px; resize:none; line-height:1.4; outline:none;" 
                                  placeholder="Descreva o problema ou situação anterior...">${m.descAntes || ''}</textarea>
                    </div>

                    <!-- Lado Bom (Depois) -->
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <div style="font-size: 0.7rem; font-weight: 800; color: #10b981; text-transform: uppercase; display: flex; align-items: center; gap: 0.4rem;">
                            <i class="fas fa-check-circle"></i> MELHORIA REALIZADA (FOTO DA SOLUÇÃO)
                        </div>
                        <div style="height: 200px; background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                            ${m.imgDepois ? `
                                <img src="${m.imgDepois}" style="width:100%; height:100%; object-fit:cover;" onclick="document.getElementById('melhoria_file_depois_${index}').click()">
                                <button onclick="event.stopPropagation(); ReportApp.openLightboxMelhoria(${index})" style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:white; border:none; border-radius:4px; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Ampliar Melhoria"><i class="fas fa-search-plus"></i></button>
                            ` : `<div style="text-align:center; color:#cbd5e1; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;" onclick="document.getElementById('melhoria_file_depois_${index}').click()"><i class="fas fa-camera fa-2x"></i><br><span style="font-size:0.6rem; font-weight:800; margin-top:5px; display:block;">FOTO DEPOIS</span></div>`}
                            <input type="file" id="melhoria_file_depois_${index}" style="display:none;" accept="image/*" onchange="ReportApp.handleMelhoriaImage(${index}, 'imgDepois', this)">
                        </div>
                        <textarea oninput="ReportApp.updateMelhoriaField(${index}, 'descDepois', this.value)" 
                                  style="width:100%; border:1px solid #edf2f7; background:#f0fdf4; border-radius:6px; padding:0.75rem; font-size:0.8rem; color:#1e293b; min-height:80px; resize:none; line-height:1.4; outline:none;" 
                                  placeholder="Descreva a melhoria e os resultados obtidos...">${m.descDepois || ''}</textarea>
                    </div>
                </div>

                <div style="border-top: 1px solid #e2e8f0; padding-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <div style="display: flex; flex-direction: column;">
                            <label style="font-size: 0.55rem; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Data de Conclusão</label>
                            <input type="date" value="${m.data || dateYMD}" oninput="ReportApp.updateMelhoriaField(${index}, 'data', this.value)" style="border:none; background:transparent; font-weight:700; color:#1e293b; font-size:0.8rem; width: 120px; outline: none;">
                        </div>
                        <div style="display: flex; flex-direction: column;">
                            <label style="font-size: 0.55rem; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Responsável</label>
                            <input type="text" value="${m.responsavel || ''}" oninput="ReportApp.updateMelhoriaField(${index}, 'responsavel', this.value)" style="border:none; background:transparent; font-weight:700; color:#1e293b; font-size:0.8rem; width: 150px; outline: none;" placeholder="Nome do executor">
                        </div>
                    </div>
                    <img src="data:image/png;base64,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QQI5eRMjASLtKgDHRToc9JWfsXxX4LOV0QHcq8yyvbNoTORH3tzGxP2fnXzGujtLzK01ixPUwph/A4Crg7VbXunlOy+34VGc26f2k07HCfgRx5xD/Njnb3di3our4M/XC8Ui3rufnL+RVqzic8rb3pQj9Vi9h9tAro34jugqs4kXAIaBdXde8KxXztXJO2S1lP/dW8HgFoI1ujopQ/rFLNJcaegZEwnxxYMPHX7s8r+vm5QP/Qnirq6KgAiIgAgMEMiiwHK5JGXvGdv7J4/mSiVLnE2KnWpm/aJY7xnL1UK+FF5fturCpABQPyeTgLvzPZd/+HtkktheVN6aZsY/s2KsKMRwfhpzpPC3yz/8iLtxViCMGufA9cJvJV4v/BbkQsOqo9pPwd/z2jgxj4PfUCxDzX/yOilVWWdSmUylADCpk6F+i4AIiIAIiIAIiIAIiIAIiIAIiEBdBCQA1EVWfkVABERABERABERABERABERABESgQwQkAHRoMtQVERABERABERABERABERABERABEaiLgASAusjKrwiIgAiIgAiIgAiIgAiIgAiIgAh0iIAEgA5NhroiAiIgAiIgAiIgAiIgAiIgAiIgAnURkABQF1n5FQEREAEREAEREAEREAEREAEREIEOEZAA0KHJUFdEQAREQAREQAREQAREQAREQAREoC4CEgDqIiu/IiACIiACIiACIiACIiACIiACItAhAhIAOjQZ6ooIiIAIiIAIiIAIiIAIiIAIiIAI1EVAAkBdZOVXBERABERABERABERABERABERABDpEQAJAhyZDXREBERABERABERABERABERABERCBughIAKiLrPyKgAiIgAiIgAiIgAiIgAiIgAiIQIcISADo0GSoKyIgAiIgAiIgAiIgAiIgAiIgAiJQFwEJAHWRlV8REAEREAEREAEREAEREAEREAER6BABCQAdmgx1RQREQAREQAREQAREQAREQAREQATqIiABoC6y8isCIiACIiACIiACIiACIiACIiACHSIgAaBDk6GuiIAIiIAIiIAIiIAIiIAIiIAIiEBdBCQA1EVWfkVABERABERABERABERABERABESgQwQkAHRoMtQVERABERABERABERABERABERABEaiLgASAusjKrwiIgAiIgAiIgAiIgAiIgAiIgAh0iIAEgA5NhroiAiIgAiIgAiIgAiIgAiIgAiIgAnURkABQF1n5FQEREAEREAEREAEREAEREAEREIEOEZAA0KHJUFdEQAREQAREQAREQAREQAREQAREoC4CEgDqIiu/IiACIiACIiACIiACIiACIiACItAhAhIAOjQZ6ooIiIAIiIAIiIAIiIAIiIAIiIAI1EVAAkBdZOVXBERABERABERABERABERABERABDpEQAJAhyZDXREBERABERABERABERABERABERCBughIAKiLrPyKgAiIgAiIgAiIgAiIgAiIgAiIQIcISADo0GSoKyIgAiIgAiIgAiIgAiIgAiIgAiJQFwEJAHWRlV8REAEREAEREAEREAEREAEREAER6BABCQAdmgx1RQREQAREQAREQAREQAREQAREQATqIiABoC6y8isCIiACIiACIiACIiACIiACIiACHSIgAaBDk6GuiIAIiIAIiIAIiIAIiIAIiIAIiEBdBCQA1EVWfkVABERABERABERABERABERABESgQwQkAHRoMtQVERABERABERABERABERABERABEaiLgASAusjKrwiIgAiIgAiIgAiIwMwTcPdnmdnKGcSNAD4681AEQAREoDUCEgBaQ68Ti4AItEXA3Zc1szXM7BIA1w7rh7vf1cw2M7N/ATi3rb7qvCIgAiIgApNLwN0fbWbf7X38m9keAH4wuSNSz0VABCadgASASZ9B9V8ERGBsAu6+yMz2M7OPm9mdcsOjzOxgM/sdgBt7ztz9EDN7Cf8A+NjYJ9GBIiACIiACImBm7n5fM/tTft7cZGaPBHC04IiACIhAmwQkALRJX+cWARFolIC784OeH/bD7HQze6GZ/dXMljezP5rZnRkFAOCkRjuqk4mACIiACEw0gRxF9mczW9/MKC7vAOD3Ez0odV4ERGAqCEgAmIpp1CBEQARGEXD3u5jZRWa2XI4C+KKZPTd97H/IzBjuP+x++E4Abx7lW38vAiIgAiIgAj0C7s7nCaPLHmdmXPnfAsCJIiQCIiACXSAgAaALs6A+iIAI1E7A3Z9jZoenFf1vAHhC34satwJsZWZHmNk6fR15r5m9BQBf3mQiIAIiIAIiMBYBd3+Pmb3OzG42s50A/GashjpIBERABBogIAGgAcg6hQiIQPsE3P3eZrahmf0DwJmDPXL3ZczsHik/wGo5UuAsAN5+z9UDERABERCBSSHg7tvk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" style="height: 25px; opacity: 0.8;" onerror="this.src="data:image/png;base64,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QQI5eRMjASLtKgDHRToc9JWfsXxX4LOV0QHcq8yyvbNoTORH3tzGxP2fnXzGujtLzK01ixPUwph/A4Crg7VbXunlOy+34VGc26f2k07HCfgRx5xD/Njnb3di3our4M/XC8Ui3rufnL+RVqzic8rb3pQj9Vi9h9tAro34jugqs4kXAIaBdXde8KxXztXJO2S1lP/dW8HgFoI1ujopQ/rFLNJcaegZEwnxxYMPHX7s8r+vm5QP/Qnirq6KgAiIgAgMEMiiwHK5JGXvGdv7J4/mSiVLnE2KnWpm/aJY7xnL1UK+FF5fturCpABQPyeTgLvzPZd/+HtkktheVN6aZsY/s2KsKMRwfhpzpPC3yz/8iLtxViCMGufA9cJvJV4v/BbkQsOqo9pPwd/z2jgxj4PfUCxDzX/yOilVWWdSmUylADCpk6F+i4AIiIAIiIAIiIAIiIAIiIAIiEBdBCQA1EVWfkVABERABERABERABERABERABESgQwQkAHRoMtQVERABERABERABERABERABERABEaiLgASAusjKrwiIgAiIgAiIgAiIgAiIgAiIgAh0iIAEgA5NhroiAiIgAiIgAiIgAiIgAiIgAiIgAnURkABQF1n5FQEREAEREAEREAEREAEREAEREIEOEZAA0KHJUFdEQAREQAREQAREQAREQAREQAREoC4CEgDqIiu/IiACIiACIiACIiACIiACIiACItAhAhIAOjQZ6ooIiIAIiIAIiIAIiIAIiIAIiIAI1EVAAkBdZOVXBERABERABERABERABERABERABDpEQAJAhyZDXREBERABERABERABERABERABERCBughIAKiLrPyKgAiIgAiIgAiIgAiIgAiIgAiIQIcISADo0GSoKyIgAiIgAiIgAiIgAiIgAiIgAiJQFwEJAHWRlV8REAEREAEREAEREAEREAEREAER6BABCQAdmgx1RQREQAREQAREQAREQAREQAREQATqIiABoC6y8isCIiACIiACIiACIiACIiACIiACHSIgAaBDk6GuiIAIiIAIiIAIiIAIiIAIiIAIiEBdBCQA1EVWfkVABERABERABERABERABERABESgQwQkAHRoMtQVERABERABERABERABERABERABEaiLgASAusjKrwiIgAiIgAiIgAiIgAiIgAiIgAh0iIAEgA5NhroiAiIgAiIgAiIgAiIgAiIgAiIgAnURkABQF1n5FQEREAEREAEREAEREAEREAEREIEOEZAA0KHJUFdEQAREQAREQAREQAREQAREQAREoC4CEgDqIiu/IiACIiACIiACIiACIiACIiACItAhAhIAOjQZ6ooIiIAIiIAIiIAIiIAIiIAIiIAI1EVAAkBdZOVXBERABERABERABERABERABERABDpEQAJAhyZDXREBERABERABERABERABERABERCBughIAKiLrPyKgAiIgAiIgAiIgAiIgAiIgAiIQIcISADo0GSoKyIgAiIgAiIgAiIgAiIgAiIgAiJQFwEJAHWRlV8REAEREAEREAEREAEREAEREAER6BABCQAdmgx1RQREQAREQAREQAREQAREQAREQATqIiABoC6y8isCIiACIiACIiACIiACIiACIiACHSIgAaBDk6GuiIAIiIAIiIAIiIAIiIAIiIAIiEBdBCQA1EVWfkVABERABERABERABERABERABESgQwQkAHRoMtQVERABERABERABERABERABERABEaiLgASAusjKrwiIgAiIgAiIgAiIwMwTcPdnmdnKGcSNAD4681AEQAREoDUCEgBaQ68Ti4AItEXA3Zc1szXM7BIA1w7rh7vf1cw2M7N/ATi3rb7qvCIgAiIgApNLwN0fbWbf7X38m9keAH4wuSNSz0VABCadgASASZ9B9V8ERGBsAu6+yMz2M7OPm9mdcsOjzOxgM/sdgBt7ztz9EDN7Cf8A+NjYJ9GBIiACIiACImBm7n5fM/tTft7cZGaPBHC04IiACIhAmwQkALRJX+cWARFolIC784OeH/bD7HQze6GZ/dXMljezP5rZnRkFAOCkRjuqk4mACIiACEw0gRxF9mczW9/MKC7vAOD3Ez0odV4ERGAqCEgAmIpp1CBEQARGEXD3u5jZRWa2XI4C+KKZPTd97H/IzBjuP+x++E4Abx7lW38vAiIgAiIgAj0C7s7nCaPLHmdmXPnfAsCJIiQCIiACXSAgAaALs6A+iIAI1E7A3Z9jZoenFf1vAHhC34satwJsZWZHmNk6fR15r5m9BQBf3mQiIAIiIAIiMBYBd3+Pmb3OzG42s50A/GashjpIBERABBogIAGgAcg6hQiIQPsE3P3eZrahmf0DwJmDPXL3ZczsHik/wGo5UuAsAN5+z9UDERABERCBSSHg7tvk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"">
                </div>
            `;
            container.appendChild(card);
        });
    },

    addMelhoria: function () {
        try {
            const opName = this.currentOp || 'Matriz';
            const dateYMD = this.currentDateYMD;

            if (!this.data[opName]) {
                this.data[opName] = {
                    global: JSON.parse(JSON.stringify(this.defaultTemplate)),
                    daily: {},
                    monthly: {}
                };
            }
            const op = this.data[opName];
            if (!op.daily) op.daily = {};
            if (!op.daily[dateYMD]) op.daily[dateYMD] = {};
            if (!op.daily[dateYMD].melhorias) op.daily[dateYMD].melhorias = [];

            op.daily[dateYMD].melhorias.push({
                titulo: 'NOVA MELHORIA',
                imgAntes: '',
                imgDepois: '',
                descAntes: '',
                descDepois: '',
                data: dateYMD,
                responsavel: ''
            });

            this.saveData(true);
            this.render();

            setTimeout(() => {
                const container = document.getElementById('melhoriasCardsContainer');
                if (container && container.lastChild) {
                    container.lastChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);

        } catch (err) { 
            console.error("Error adding Melhoria:", err); }
    },

    removeMelhoria: function (idx) {
        if (!confirm('Deseja excluir esta melhoria?')) return;
        const op = this.data[this.currentOp];
        const dateYMD = this.currentDateYMD;
        if (op.daily[dateYMD] && op.daily[dateYMD].melhorias) {
            op.daily[dateYMD].melhorias.splice(idx, 1);
            this.saveData(true);
            this.renderMelhoriaCards();
        }
    },

    updateMelhoriaField: function (idx, field, val) {
        const op = this.data[this.currentOp];
        const dateYMD = this.currentDateYMD;
        if (!op.daily[dateYMD]) op.daily[dateYMD] = {};
        if (!op.daily[dateYMD].melhorias) return;

        op.daily[dateYMD].melhorias[idx][field] = val;
        // Removed synchronous this.saveData(true) to prevent UI freezing
    },

    handleMelhoriaImage: async function (idx, field, input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            try {
                const compressedBase64 = await this.compressImage(file);
                const op = this.data[this.currentOp];
                const dateYMD = this.currentDateYMD;
                if (!op.daily[dateYMD].melhorias) return;
                op.daily[dateYMD].melhorias[idx][field] = compressedBase64;
                this.renderMelhoriaCards();
                this.saveData(true, true);
            } catch (err) { 
                console.error("Erro ao processar imagem da melhoria:", err);
                alert("Erro ao processar imagem."); }
        }
    },

    toggleCrossDay: function (day) {
        const op = this.data[this.currentOp];
        const m = parseInt(document.getElementById('safetyMonth')?.value);
        const y = parseInt(document.getElementById('safetyYear')?.value);
        const monthKey = `${y}-${(m + 1).toString().padStart(2, '0')}`;

        if (!op.monthly[monthKey]) op.monthly[monthKey] = {};
        if (!op.monthly[monthKey].cross) op.monthly[monthKey].cross = {};

        const cross = op.monthly[monthKey].cross;
        const current = cross[day];
        let next = '';

        if (!current) next = 'ok';
        else if (current === 'ok') next = 'nok';
        else if (current === 'nok') next = '';

        if (next) cross[day] = next;
        else delete cross[day];

        this.saveData(true);
        this.renderSafetyCross();
    },

    handleImageUpload: async function (event, index) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const compressedBase64 = await this.compressImage(file);
            const op = this.data[this.currentOp];
            const dateYMD = this.currentDateYMD;
            if (!op.daily[dateYMD]) op.daily[dateYMD] = {};
            if (!op.daily[dateYMD].safety) op.daily[dateYMD].safety = {};
            if (!op.daily[dateYMD].safety.images) op.daily[dateYMD].safety.images = ['', '', ''];

            op.daily[dateYMD].safety.images[index] = compressedBase64;
            this.saveData(true, true);
            this.render();
        } catch (err) { 
            console.error("Erro ao processar imagem de segurança:", err);
            alert("Erro ao processar imagem."); }
    },

    _prepareForExport: function(element) {
        window.scrollTo(0, 0);
        const inputs = element.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.tagName === 'SELECT') {
                for (let i = 0; i < input.options.length; i++) {
                    if (input.options[i].selected) input.options[i].setAttribute('selected', 'selected');
                    else input.options[i].removeAttribute('selected');
                }
            } else if (input.tagName === 'TEXTAREA') {
                input.innerHTML = input.value;
            } else if (input.type === 'radio' || input.type === 'checkbox') {
                if (input.checked) input.setAttribute('checked', 'checked');
                else input.removeAttribute('checked');
            } else {
                input.setAttribute('value', input.value);
            }
        });
    },

    downloadOnePagePDF: function () {
        const element = document.getElementById('reportElement');
        this._prepareForExport(element);

        // Calculate dynamic dimensions to fit exactly on one page without cutting
        const opt = {
            margin: [5, 5, 5, 5],
            filename: `${this.currentOp} - ${this.currentDateYMD}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                letterRendering: true, 
                backgroundColor: '#f1f5f9',
                scrollY: 0
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        const controlBar = document.querySelector('.report-control-bar');
        if(controlBar) controlBar.style.display = 'none';

        html2pdf().set(opt).from(element).save().then(() => {
            if(controlBar) controlBar.style.display = 'flex';
        }).catch(err => {
            console.error(err);
            alert("Erro ao gerar o PDF. " + err);
            if(controlBar) controlBar.style.display = 'flex';
        });
    },

    downloadOnePageImage: function () {
        const element = document.getElementById('reportElement');
        this._prepareForExport(element);
        
        const controlBar = document.querySelector('.report-control-bar');
        if(controlBar) controlBar.style.display = 'none';

        html2canvas(element, { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#f1f5f9',
            scrollY: 0
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `${this.currentOp} - ${this.currentDateYMD}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            
            if(controlBar) controlBar.style.display = 'flex';
        }).catch(err => {
            console.error(err);
            alert("Erro ao gerar a imagem. " + err);
            if(controlBar) controlBar.style.display = 'flex';
        });
    },

        toggleBreakPreview: function() {
        const element = document.getElementById('reportElement');
        const existingLines = element.querySelectorAll('.preview-break-line');
        if (existingLines.length > 0) {
            existingLines.forEach(l => l.remove());
            return;
        }
        
        const width = element.offsetWidth;
        const pageHeight = width / (277 / 190);
        const totalHeight = element.offsetHeight;
        
        let currentY = pageHeight;
        let pageNum = 1;
        
        element.style.position = 'relative';

        while (currentY < totalHeight) {
            const line = document.createElement('div');
            line.className = 'preview-break-line';
            line.style.top = `${currentY}px`;
            
            const label = document.createElement('div');
            label.className = 'preview-break-label';
            label.innerText = `Fim da Página ${pageNum} (Tesoura)`;
            line.appendChild(label);
            
            element.appendChild(line);
            currentY += pageHeight;
            pageNum++;
        }
        alert("Modo de Pré-visualização ativado! As linhas vermelhas pontilhadas estimam onde a página vai quebrar. O 'PDF Profissional' vai empurrar os cards inteiros para a próxima página automaticamente se a tesoura cortar no meio.");
    },

    downloadProfessionalPDF: function () {
        const element = document.getElementById('reportElement');
        this._prepareForExport(element);

        const existingLines = element.querySelectorAll('.preview-break-line');
        existingLines.forEach(l => l.style.display = 'none');

        const opt = {
            margin: [10, 10, 10, 10],
            filename: `${this.currentOp} - ${this.currentDateYMD} (Profissional).pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                letterRendering: true, 
                backgroundColor: '#f1f5f9',
                scrollY: 0
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
            pagebreak: { mode: ['css', 'legacy'] }
        };

        const controlBar = document.querySelector('.report-control-bar');
        if(controlBar) controlBar.style.display = 'none';

        html2pdf().set(opt).from(element).save().then(() => {
            if(controlBar) controlBar.style.display = 'flex';
            existingLines.forEach(l => l.style.display = 'block');
        }).catch(err => {
            console.error(err);
            alert("Erro ao gerar o PDF Profissional. " + err);
            if(controlBar) controlBar.style.display = 'flex';
            existingLines.forEach(l => l.style.display = 'block');
        });
    },

    toggleSafetyGeneralPanel: function () {
        const panel = document.getElementById('safetyGeneralPanel');
        if (panel) {
            const isClosing = panel.style.display !== 'none';
            panel.style.display = isClosing ? 'none' : 'block';
            if (isClosing) {
                this.updateSafetyVisuals(); // Refresh display
                this.saveData(true, true); // Immediate save to Firebase & LocalStorage
            }
        }
    },

    downloadPDF: function () {
        const reportElement = document.querySelector('.report-paper');
        if (!reportElement) return;

        // Esconde a barra de controle para ela não sair no PDF
        const controls = document.querySelector('.report-control-bar');
        const oldDisplay = controls ? controls.style.display : '';
        if (controls) controls.style.display = 'none';

        // Garante que o texto digitado nos textareas apareça no html2canvas/pdf
        const textareas = reportElement.querySelectorAll('textarea');
        textareas.forEach(t => { t.textContent = t.value; });

        // Garante que inputs numéricos e textos também mantenham seus valores
        const inputs = reportElement.querySelectorAll('input:not([type="hidden"]):not([type="file"])');
        inputs.forEach(i => { i.setAttribute('value', i.value); });

        // Verifica se a biblioteca foi carregada
        if (typeof html2pdf === 'undefined') {
            alert("A biblioteca de PDF ainda está carregando, tente novamente em alguns segundos.");
            if (controls) controls.style.display = oldDisplay;
            return;
        }

        const originalTransform = reportElement.style.transform;
        reportElement.style.transform = 'none'; // Fix possible scaling issues

        const opt = {
            margin:       [0.2, 0.2, 0.2, 0.2],
            filename:     `SIMAS_OnePage_${this.currentOp}_${this.currentDateYMD}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(reportElement).save().then(() => {
            if (controls) controls.style.display = oldDisplay;
            reportElement.style.transform = originalTransform;
        }).catch(err => {
            console.error('Erro ao gerar o PDF:', err);
            if (controls) controls.style.display = oldDisplay;
            reportElement.style.transform = originalTransform;
            alert('Erro ao gerar o PDF.');
        });
    },

    toggleSafetyCardsPanel: function () {
        const panel = document.getElementById('safetyCardsPanel');
        if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    },

    toggleWaterPanel: function () {
        const panel = document.getElementById('waterPanel');
        if (panel) {
            const isClosing = panel.style.display !== 'none';
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            if (isClosing) {
                this.saveData(true, true);
            }
        }
    },

    toggleForkliftPanel: function (index) {
        const panel = document.getElementById(`fk_panel_${index}`);
        if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';

        // Hide history panel if opening main panel
        if (panel && panel.style.display === 'block') {
            const hPanel = document.getElementById(`fk_history_panel_${index}`);
            if (hPanel) hPanel.style.display = 'none';
        }
    },

    toggleForkliftHistoryPanel: function (index) {
        const panel = document.getElementById(`fk_history_panel_${index}`);
        if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    },

    compressBase64Image: function (base64Str, maxWidth = 600, maxHeight = 600, quality = 0.5) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            img.onerror = (err) => reject(err);
            img.src = base64Str;
        });
    },

    compressImage: function (file, maxWidth = 600, maxHeight = 600, quality = 0.5) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.compressBase64Image(e.target.result, maxWidth, maxHeight, quality)
                    .then(resolve)
                    .catch(reject);
            };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    },

    migrateExistingImages: async function () {
        console.log("Iniciando escaneamento e migração de imagens grandes em background...");
        let migrated = false;
        for (let opName in this.data) {
            const op = this.data[opName];
            if (!op.daily) continue;
            
            for (let dateYMD in op.daily) {
                const daily = op.daily[dateYMD];
                
                // 1. Safety images
                if (daily.safety && daily.safety.images) {
                    for (let i = 0; i < daily.safety.images.length; i++) {
                        const img = daily.safety.images[i];
                        if (img && img.startsWith('data:image/') && img.length > 250000) {
                            try {
                                console.log(`Comprimindo imagem antiga de Segurança da filial ${opName} em ${dateYMD}...`);
                                daily.safety.images[i] = await this.compressBase64Image(img);
                                migrated = true;
                            } catch (e) { 
                                console.error("Erro migrando imagem de segurança:", e); }
                        }
                    }
                }
                
                // 2. LUPs
                if (daily.lups) {
                    for (let i = 0; i < daily.lups.length; i++) {
                        const lup = daily.lups[i];
                        if (lup.imgErrado && lup.imgErrado.startsWith('data:image/') && lup.imgErrado.length > 250000) {
                            try {
                                console.log(`Comprimindo imagem antiga do Desvio de LUP #${i+1} da filial ${opName} em ${dateYMD}...`);
                                lup.imgErrado = await this.compressBase64Image(lup.imgErrado);
                                migrated = true;
                            } catch (e) { 
                                console.error("Erro migrando imgErrado de LUP:", e); }
                        }
                        if (lup.imgCerto && lup.imgCerto.startsWith('data:image/') && lup.imgCerto.length > 250000) {
                            try {
                                console.log(`Comprimindo imagem antiga do Padrão de LUP #${i+1} da filial ${opName} em ${dateYMD}...`);
                                lup.imgCerto = await this.compressBase64Image(lup.imgCerto);
                                migrated = true;
                            } catch (e) { 
                                console.error("Erro migrando imgCerto de LUP:", e); }
                        }
                    }
                }
                
                // 3. Melhorias
                if (daily.melhorias) {
                    for (let i = 0; i < daily.melhorias.length; i++) {
                        const m = daily.melhorias[i];
                        if (m.imgAntes && m.imgAntes.startsWith('data:image/') && m.imgAntes.length > 250000) {
                            try {
                                console.log(`Comprimindo imagem antiga de Melhoria Antes #${i+1} da filial ${opName} em ${dateYMD}...`);
                                m.imgAntes = await this.compressBase64Image(m.imgAntes);
                                migrated = true;
                            } catch (e) { 
                                console.error("Erro migrando imgAntes de Melhoria:", e); }
                        }
                        if (m.imgDepois && m.imgDepois.startsWith('data:image/') && m.imgDepois.length > 250000) {
                            try {
                                console.log(`Comprimindo imagem antiga de Melhoria Depois #${i+1} da filial ${opName} em ${dateYMD}...`);
                                m.imgDepois = await this.compressBase64Image(m.imgDepois);
                                migrated = true;
                            } catch (e) { 
                                console.error("Erro migrando imgDepois de Melhoria:", e); }
                        }
                    }
                }
            }
        }
        
        if (migrated) {
            console.log("Migração/Compressão concluída com sucesso! Atualizando localStorage e Firebase...");
            // Save full operations so historical date changes are successfully propagated
            this.saveToLocalStorage(false, true);
            this.render();
        } else {
            console.log("Escaneamento de background concluído. Nenhuma imagem antiga precisou de compressão.");
        }
    }

};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    ReportApp.init();
});



