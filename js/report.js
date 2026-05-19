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
        melhorias: []
    },

    init: async function () {
        // Set date picker to today or param
        const urlParams = new URLSearchParams(window.location.search);
        const paramDate = urlParams.get('date');
        this.currentDateYMD = paramDate || new Date().toISOString().split('T')[0];
        document.getElementById('reportDatePicker').value = this.currentDateYMD;

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
                    const localSaved = localStorage.getItem('simas_report_data');
                    if (localSaved) {
                        try {
                            this.data = JSON.parse(localSaved);
                            this.migrateData();
                            this.saveToLocalStorage(); // This will push to Firebase
                        } catch (e) {
                            this.data = {};
                        }
                    } else {
                        this.data = {};
                    }
                }
            } catch (e) {
                console.error("Firebase load error", e);
                this.data = {};
            }
        } else {
            // Fallback to localStorage if Firebase not initialized
            const saved = localStorage.getItem('simas_report_data');
            if (saved) {
                try {
                    this.data = JSON.parse(saved);
                    this.migrateData();
                } catch (e) {
                    this.data = {};
                }
            }
        }


        const paramOp = urlParams.get('op');
        if (paramOp) {
            // Case-insensitive match for predefined operations
            const ops = ["Matriz", "Funeas", "Sorocaba", "São Roque", "Prefeitura SJP", "Camaçari"];
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
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
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

        // Focus listeners for textareas (auto-resize)
        document.querySelectorAll('textarea').forEach(tx => {
            tx.addEventListener('input', function () {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
        });

        this.setupValidation();
    },

    triggerUpload: function (index) {
        const el = document.getElementById(`file-${index}`);
        if (el) el.click();
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
        if (migrated) this.saveToLocalStorage();
    },

    saveToLocalStorage: function () {
        const opToSave = this.currentOp;
        // Deep copy the specific operation data to avoid reference mutations during async timeout
        const dataToSave = JSON.parse(JSON.stringify(this.data[opToSave]));
        
        // Run asynchronously to prevent UI freeze during heavy JSON stringify or Firebase ops
        setTimeout(() => {
            if (window.firebaseDB) {
                window.firebaseDB.ref('simas_report_data/' + opToSave).set(dataToSave);
            }
            try {
                localStorage.setItem('simas_report_data', JSON.stringify(this.data));
            } catch (e) {
                console.error("Erro ao salvar no localStorage (limite excedido?):", e);
            }
        }, 10);
    },

    changeOperation: function (newOp) {
        this.saveData(true);
        if (newOp) this.currentOp = newOp;
        this.render();
    },

    changeDate: function () {
        this.saveData(true);
        this.currentDateYMD = document.getElementById('reportDatePicker').value;

        // Update display
        const [y, m, d] = this.currentDateYMD.split('-');
        if (document.getElementById('currentDate')) document.getElementById('currentDate').textContent = `${d}/${m}/${y}`;
        if (document.getElementById('yearDisplay')) document.getElementById('yearDisplay').textContent = y;
        const cpEl = document.getElementById('currentDatePaper');
        if (cpEl) cpEl.textContent = `${d}/${m}/${y}`;

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
        const combined = JSON.parse(JSON.stringify(op.global));

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
            Object.assign(combined, op.daily[dateYMD]);
            if (op.daily[dateYMD].safety) Object.assign(combined.safety, op.daily[dateYMD].safety);
        } else {
            // Day Resets
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
            const water = opData.forkliftWater || this.defaultTemplate.forkliftWater;
            water.forEach((val, idx) => {
                this.safeSet(`water_w${idx + 1}`, val);
            });
            this.updateWaterChart();

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

        } catch (e) { console.error("Render failed:", e); }
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

        const mIdx = parseInt(document.getElementById('safetyMonth').value) || 0;
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
                                        oninput="ReportApp.updateForkliftCharts(); if(${mIdxLoop}===${mIdx}) document.getElementById('fk_hours_${index}').value = this.value;"
                                        style="width: 100%; border: 1px solid #e2e8f0; border-radius: 2px; text-align: center; padding: 2px; font-weight: 700;">
                                </td>
                                <td style="padding: 2px;">
                                    <input type="number" id="fk_c_his_${index}_${mIdxLoop}" value="${data.monthlyChecklist[mIdxLoop] || 0}" 
                                        oninput="ReportApp.updateForkliftCharts(); if(${mIdxLoop}===${mIdx}) document.getElementById('fk_check_${index}').value = this.value;"
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
        if (!this.data[this.currentOp]) {
            this.data[this.currentOp] = { global: JSON.parse(JSON.stringify(this.defaultTemplate)), daily: {}, monthly: {} };
        }
        const opGlobal = this.data[this.currentOp].global;
        if (!opGlobal.licenses) {
            opGlobal.licenses = Array(4).fill({ name: '', date: '', status: 'regular' });
        }
        opGlobal.licenses.push({ name: '', date: '', status: 'regular' });
        this.saveData(true);
        this.render();
    },

    removeLicense: function(index) {
        if (!confirm('Deseja realmente remover esta licença?')) return;
        const opGlobal = this.data[this.currentOp].global;
        if (opGlobal && opGlobal.licenses) {
            opGlobal.licenses.splice(index, 1);
            this.saveData(true);
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
        const operations = ["Matriz", "Funeas", "Sorocaba", "São Roque", "Prefeitura SJP", "Camaçari"];

        operations.forEach(op => {
            const opData = this.data[op];
            if (!opData) return; // Skip if no data for this op yet

            // Aggregations
            const nc = parseInt(opData.qm?.nc || 0);
            const train = parseInt(opData.trainings?.real || 0);
            totalNC += nc;
            totalTrain += train;

            const safetyStatus = opData.safety?.status === 'sem_acidente'
                ? '<span style="color:#16a34a; font-weight:700;">✅ OK</span>'
                : '<span style="color:#dc2626; font-weight:700;">⚠️ ACIDENTE</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:1rem; font-weight:600; border-bottom:1px solid #e2e8f0;">${op}</td>
                <td style="padding:1rem; border-bottom:1px solid #e2e8f0;">${safetyStatus}</td>
                <td style="padding:1rem; border-bottom:1px solid #e2e8f0; font-weight:bold;">${nc}</td>
                <td style="padding:1rem; border-bottom:1px solid #e2e8f0; font-weight:bold; color:#166534;">${train}</td>
                <td style="padding:1rem; border-bottom:1px solid #e2e8f0; font-size:0.8rem; text-align:left; max-width:200px;">
                    ${opData.qm?.obs ? opData.qm.obs.substring(0, 50) + '...' : '-'}
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('global_nc').textContent = totalNC;
        document.getElementById('global_train').textContent = totalTrain;
    },

    calculateSafetyDays: function () {
        // Garantir "zerado" absoluto em caso de erros:
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
            lastAccidentDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        }

        const msPerDay = 1000 * 60 * 60 * 24;
        let currentDays = 0;
        let recordDays = 0;

        if (lastAccidentDate && lastAccidentDate <= reportDate) {
            currentDays = Math.round((reportDate - lastAccidentDate) / msPerDay);
            const previousPeriod = Math.round((lastAccidentDate - startDate) / msPerDay);
            recordDays = Math.max(previousPeriod, currentDays, 0);
        } else {
            currentDays = Math.round((reportDate - startDate) / msPerDay);
            recordDays = currentDays;
        }

        if (currentDays < 0) currentDays = 0;
        if (recordDays < 0) recordDays = 0;

        // Displays
        const recDisplay = document.getElementById('safetyRecord_display');
        const curDisplay = document.getElementById('safetyCurrent_display');
        if (recDisplay) recDisplay.textContent = recordDays;
        if (curDisplay) curDisplay.textContent = currentDays;

        // Hidden fields required for original saving pipeline
        const recHidden = document.getElementById('safetyRecord');
        const curHidden = document.getElementById('safetyCurrent');
        if (recHidden) recHidden.value = recordDays;
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
        const mIdx = parseInt(document.getElementById('safetyMonth').value) || 0;
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
                        layout: { padding: { top: 20 } },
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top',
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
            parseFloat(document.getElementById('water_w1').value) || 0,
            parseFloat(document.getElementById('water_w2').value) || 0,
            parseFloat(document.getElementById('water_w3').value) || 0,
            parseFloat(document.getElementById('water_w4').value) || 0
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
        const open = parseFloat(document.getElementById('comp_status_open').value) || 0;
        const closed = parseFloat(document.getElementById('comp_status_closed').value) || 0;
        const invalid = parseFloat(document.getElementById('comp_status_invalid').value) || 0;

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
            ncValues.push(parseFloat(document.getElementById(`nc_val_${i}`).value) || 0);
            dqValues.push(parseFloat(document.getElementById(`dq_val_${i}`).value) || 0);
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

        const ncOpen = parseFloat(document.getElementById('nc_status_open').value) || 0;
        const ncClosed = parseFloat(document.getElementById('nc_status_closed').value) || 0;
        const dqOpen = parseFloat(document.getElementById('dq_status_open').value) || 0;
        const dqClosed = parseFloat(document.getElementById('dq_status_closed').value) || 0;

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
        const progValues = Array.from({ length: 12 }, (_, i) => parseFloat(document.getElementById(`tr_prog_${i}`).value) || 0);
        const realValues = Array.from({ length: 12 }, (_, i) => parseFloat(document.getElementById(`tr_real_${i}`).value) || 0);

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
                parseFloat(document.getElementById('train_obj_dev').value) || 0,
                parseFloat(document.getElementById('train_obj_rec').value) || 0,
                parseFloat(document.getElementById('train_obj_hom').value) || 0
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
                parseFloat(document.getElementById('train_mod_ead').value) || 0,
                parseFloat(document.getElementById('train_mod_ext').value) || 0,
                parseFloat(document.getElementById('train_mod_pres').value) || 0
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

        const daily = op.daily[dateYMD];
        const monthly = op.monthly[monthKey];
        const global = op.global;

        // --- GLOBAL (Persistent) ---
        global.manager = document.getElementById('managerName').value;
        global.area = document.getElementById('areaName').value;
        global.version = document.getElementById('reportVersion').value;

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
        const mIdx = parseInt(document.getElementById('safetyMonth').value) || 0;
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
                    last: parseFloat(document.getElementById(`maint_last_${i}`).value) || 0,
                    now: parseFloat(document.getElementById(`maint_now_${i}`).value) || 0,
                    next: parseFloat(document.getElementById(`maint_next_${i}`).value) || 0
                }
            };
        });

        // NC & Training (Global arrays)
        if (!global.qm) global.qm = {};
        global.qm.nonConformities = {
            nc: Array.from({ length: 12 }, (_, i) => parseFloat(document.getElementById(`nc_val_${i}`).value) || 0),
            dq: Array.from({ length: 12 }, (_, i) => parseFloat(document.getElementById(`dq_val_${i}`).value) || 0),
            ncStatus: {
                open: parseFloat(document.getElementById('nc_status_open').value) || 0,
                closed: parseFloat(document.getElementById('nc_status_closed').value) || 0
            },
            dqStatus: {
                open: parseFloat(document.getElementById('dq_status_open').value) || 0,
                closed: parseFloat(document.getElementById('dq_status_closed').value) || 0
            }
        };

        if (!global.trainings) global.trainings = {};
        global.trainings = {
            monthlyProg: Array.from({ length: 12 }, (_, i) => parseFloat(document.getElementById(`tr_prog_${i}`).value) || 0),
            monthlyReal: Array.from({ length: 12 }, (_, i) => parseFloat(document.getElementById(`tr_real_${i}`).value) || 0),
            kpi: {
                prog: parseFloat(document.getElementById('train_prog').value) || 0,
                real: parseFloat(document.getElementById('train_real').value) || 0,
                atras: parseFloat(document.getElementById('train_atras').value) || 0
            },
            objective: {
                dev: parseFloat(document.getElementById('train_obj_dev').value) || 0,
                rec: parseFloat(document.getElementById('train_obj_rec').value) || 0,
                hom: parseFloat(document.getElementById('train_obj_hom').value) || 0
            },
            modality: {
                ead: parseFloat(document.getElementById('train_mod_ead').value) || 0,
                ext: parseFloat(document.getElementById('train_mod_ext').value) || 0,
                pres: parseFloat(document.getElementById('train_mod_pres').value) || 0
            }
        };

        // Top 3
        global.top3 = Array.from({ length: 3 }, (_, i) => ({
            desc: document.getElementById(`prob_desc_${i}`).value,
            crit: document.getElementById(`prob_crit_${i}`).value,
            resp: document.getElementById(`prob_resp_${i}`).value,
            evol: parseFloat(document.getElementById(`prob_evol_${i}`).value) || 0
        }));

        // --- MONTHLY (Resets by month) ---
        const qmMonthEl = document.getElementById('qm_month');
        const qmYearEl = document.getElementById('qm_year');
        const qmMonthKey = (qmMonthEl && qmYearEl)
            ? `${qmYearEl.value}-${(parseInt(qmMonthEl.value) + 1).toString().padStart(2, '0')}`
            : monthKey;

        if (!op.monthly[qmMonthKey]) op.monthly[qmMonthKey] = {};
        const qmMonthly = op.monthly[qmMonthKey];

        monthly.forkliftWater = [
            parseFloat(document.getElementById('water_w1').value) || 0,
            parseFloat(document.getElementById('water_w2').value) || 0,
            parseFloat(document.getElementById('water_w3').value) || 0,
            parseFloat(document.getElementById('water_w4').value) || 0
        ];

        qmMonthly.qm = {
            reclamacoes: document.getElementById('qm_reclamacoes').value,
            solucionadas: document.getElementById('qm_solucionadas').value,
            nao_solucionadas: document.getElementById('qm_nao_solucionadas').value,
            complaints: Array.from({ length: 5 }, (_, i) => ({
                type: document.getElementById(`comp_type_${i}`).value,
                qty: parseFloat(document.getElementById(`comp_qty_${i}`).value) || 0
            })),
            complaintsStatus: {
                open: parseFloat(document.getElementById('comp_status_open').value) || 0,
                closed: parseFloat(document.getElementById('comp_status_closed').value) || 0,
                invalid: parseFloat(document.getElementById('comp_status_invalid').value) || 0
            }
        };

        // --- DAILY (Resets by day) ---
        daily.intro = document.getElementById('introText').value;
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
            sc_total: document.getElementById('sc_total')?.value || 0
        });

        daily.donoRua = {
            names: Array.from({ length: 5 }, (_, i) => document.getElementById(`dono_name_${i}`).value),
            scores: Array.from({ length: 5 }, (_, i) => parseFloat(document.getElementById(`dono_score_${i}`).value) || 0)
        };

        daily.galpao = {
            insatisfatorio: parseInt(document.getElementById('galpao_insatisfatorio').value) || 0,
            toleravel: parseInt(document.getElementById('galpao_toleravel').value) || 0,
            satisfatorio: parseInt(document.getElementById('galpao_satisfatorio').value) || 0
        };

        daily.performance = {
            best: {
                name: document.getElementById('perf_best_name').value,
                score: parseInt(document.getElementById('perf_best_score').value) || 0,
                gender: document.getElementById('perf_best_gender').value
            },
            worst: {
                name: document.getElementById('perf_worst_name').value,
                score: parseInt(document.getElementById('perf_worst_score').value) || 0,
                gender: document.getElementById('perf_worst_gender').value
            }
        };
    },

    saveData: function (silent = false) {
        this.gatherDataFromDOM();
        this.saveToLocalStorage();

        if (silent) return;

        // UI Feedback
        const btn = document.querySelector('.btn-primary');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> SALVO!';
        btn.style.backgroundColor = '#16a34a';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.backgroundColor = '';
        }, 2000);
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
        const filterMonth = document.getElementById('historyMonthFilter').value; // YYYY-MM
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
                document.getElementById('reportDatePicker').value = dateYMD;
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
            this.saveToLocalStorage();
            this.renderHistoryList();
            
            // If the deleted date is the currently active one, refresh the screen to clear values
            if (dateYMD === this.currentDateYMD) {
                this.render();
            }
            
            alert('Histórico excluído com sucesso!');
        }
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
            console.error("Error rendering safety cross:", err);
        }
    },


    renderSafetyImages: function () {
        const opData = this.getDataForOp(this.currentOp);
        const images = opData.safety.images || ['', '', ''];

        images.forEach((imgSrc, idx) => {
            const preview = document.getElementById(`preview-${idx}`);
            const placeholder = document.getElementById(`placeholder-${idx}`);
            const card = document.getElementById(`card-${idx}`);

            if (imgSrc) {
                preview.src = imgSrc;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
                card.style.borderStyle = 'solid';
            } else {
                preview.src = '';
                preview.style.display = 'none';
                placeholder.style.display = 'flex';
                card.style.borderStyle = 'dashed';
            }
        });
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
        const imgPadrao = document.getElementById('lightboxLupPadrao');

        document.querySelector('#lightboxLupContainer > div:nth-child(1) h3').innerText = 'DESVIO';
        document.querySelector('#lightboxLupContainer > div:nth-child(2) h3').innerText = 'PADRÃO';

        singleImg.style.display = 'none';
        lupContainer.style.display = 'flex';

        imgDesvio.src = lup.imgErrado || 'https://placehold.co/400x300/f8fafc/cbd5e1?text=SEM+IMAGEM';
        imgPadrao.src = lup.imgCerto || 'https://placehold.co/400x300/f8fafc/cbd5e1?text=SEM+IMAGEM';

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
        const imgPadrao = document.getElementById('lightboxLupPadrao');

        document.querySelector('#lightboxLupContainer > div:nth-child(1) h3').innerText = 'ANTES';
        document.querySelector('#lightboxLupContainer > div:nth-child(2) h3').innerText = 'DEPOIS';

        singleImg.style.display = 'none';
        lupContainer.style.display = 'flex';

        imgDesvio.src = m.imgAntes || 'https://placehold.co/400x300/f8fafc/cbd5e1?text=SEM+IMAGEM';
        imgPadrao.src = m.imgDepois || 'https://placehold.co/400x300/f8fafc/cbd5e1?text=SEM+IMAGEM';

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
                        <img src="logo.png" style="height: 20px; opacity: 0.8;" onerror="this.src='https://via.placeholder.com/80x25?text=SIMAS'">
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
            console.error("Error adding LUP:", err);
        }
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

    handleLupImage: function (idx, field, input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            if (file.size > 2 * 1024 * 1024) {
                alert('A imagem é muito grande (máx 2MB).');
                input.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const op = this.data[this.currentOp];
                const dateYMD = this.currentDateYMD;
                if (!op.daily[dateYMD].lups) return;
                op.daily[dateYMD].lups[idx][field] = e.target.result;
                this.renderLupCards();
                this.saveData(true);
            };
            reader.readAsDataURL(file);
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
                    <img src="logo.png" style="height: 25px; opacity: 0.8;" onerror="this.src='https://via.placeholder.com/100x30?text=SIMAS'">
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
            console.error("Error adding Melhoria:", err);
        }
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

    handleMelhoriaImage: function (idx, field, input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            if (file.size > 2 * 1024 * 1024) {
                alert('A imagem é muito grande (máx 2MB).');
                input.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const op = this.data[this.currentOp];
                const dateYMD = this.currentDateYMD;
                if (!op.daily[dateYMD].melhorias) return;
                op.daily[dateYMD].melhorias[idx][field] = e.target.result;
                this.renderMelhoriaCards();
                this.saveData(true);
            };
            reader.readAsDataURL(file);
        }
    },

    toggleCrossDay: function (day) {
        const op = this.data[this.currentOp];
        const m = parseInt(document.getElementById('safetyMonth').value);
        const y = parseInt(document.getElementById('safetyYear').value);
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

    handleImageUpload: function (event, index) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert('A imagem é muito grande (máx 2MB).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const op = this.data[this.currentOp];
            const dateYMD = this.currentDateYMD;
            if (!op.daily[dateYMD]) op.daily[dateYMD] = {};
            if (!op.daily[dateYMD].safety) op.daily[dateYMD].safety = {};
            if (!op.daily[dateYMD].safety.images) op.daily[dateYMD].safety.images = ['', '', ''];

            op.daily[dateYMD].safety.images[index] = e.target.result;
            this.saveData(true);
            this.render();
        };
        reader.readAsDataURL(file);
    },

    toggleSafetyGeneralPanel: function () {
        const panel = document.getElementById('safetyGeneralPanel');
        if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        if (panel && panel.style.display === 'none') this.updateSafetyVisuals(); // Refresh display
    },

    toggleSafetyCardsPanel: function () {
        const panel = document.getElementById('safetyCardsPanel');
        if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    },

    toggleWaterPanel: function () {
        const panel = document.getElementById('waterPanel');
        if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
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


};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    ReportApp.init();
});
