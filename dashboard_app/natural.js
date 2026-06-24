let naturalConditionsData = {};
let climateData           = {};

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Parsers ──────────────────────────────────────────────────────────────────

function parseNaturalConditions(csvText) {
    const lines = csvText.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        
        if (row.length < 14) continue;
        
        const id = row[0].replace(/"/g, '').trim();
        naturalConditionsData[id] = {
            altitude:      cleanVal(row[3]),
            fuelModel:     cleanVal(row[4]),
            aspect:        cleanVal(row[5]),
            slope:         cleanVal(row[6]),
            exposure:      cleanVal(row[7]),
            stoniness:     cleanVal(row[8]),
            texture:       cleanVal(row[9]),
            bioRegion:     cleanVal(row[10]),
            organicMatter: cleanVal(row[11]),
            soilPH:        cleanVal(row[12]),
            soilType:      cleanVal(row[13]),
        };
    }
}

function parseClimateData(csvText) {
    const lines = csvText.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (row.length < 15) continue;
        
        const id    = row[0].replace(/"/g, '').trim();
        const month = row[2].replace(/"/g, '').trim();
        if (!climateData[id]) climateData[id] = { months: [], annual: null };

        const entry = {
            month,
            tmin:     parseFloat(row[7])  || 0,
            tmax:     parseFloat(row[8])  || 0,
            tavg:     parseFloat(row[9])  || 0,
            prec:     parseFloat(row[10]) || 0,
            martonne: row[15] ? parseFloat(row[15]) : null,
        };

        if (month === 'annual') {
            climateData[id].annual = entry;
        } else {
            climateData[id].months.push(entry);
        }
    }
    Object.values(climateData).forEach(d => {
        d.months.sort((a, b) => parseInt(a.month) - parseInt(b.month));
    });
}

// ── Site Conditions Cards ─────────────────────────────────────────────────────

function renderSiteConditions(plotId) {
    const container = document.getElementById('natural-site-cards');
    if (!container) return;
    const nc = naturalConditionsData[plotId];

    if (!nc) {
        container.innerHTML = '<p style="color:#aaa;font-size:13px;grid-column:1/-1;">No site data available for this plot.</p>';
        return;
    }

    const cards = [
        { icon: '⛰️', label: t('natural_altitude'),       value: nc.altitude !== '-' ? nc.altitude + ' m' : '-' },
        { icon: '🧭', label: t('natural_exposure'),        value: nc.exposure      || '-' },
        { icon: '📐', label: t('natural_slope'),           value: nc.slope !== '-' ? nc.slope + '°' : '-' },
        { icon: '🪨', label: t('natural_stoniness'),       value: nc.stoniness     || '-' },
        { icon: '🏔️', label: t('natural_aspect'),          value: nc.aspect        || '-' },
        { icon: '🌱', label: t('natural_soil_type'),       value: nc.soilType      || '-' },
        { icon: '🧪', label: t('natural_soil_ph'),         value: nc.soilPH        || '-' },
        { icon: '🌾', label: t('natural_texture'),         value: nc.texture       || '-' },
        { icon: '🌍', label: t('natural_bio_region'),      value: nc.bioRegion     || '-' },
        { icon: '🍂', label: t('natural_org_matter'),      value: nc.organicMatter || '-' },
        { icon: '🔥', label: t('natural_fuel_model'),      value: nc.fuelModel     || '-' },
    ];

    container.innerHTML = cards.map(c => `
        <div style="background:var(--card-bg); border-radius:12px;
                    box-shadow:0 2px 12px rgba(0,0,0,0.06);
                    padding:18px 20px; display:flex; flex-direction:column; gap:6px;">
            <div style="font-size:1.6rem;">${c.icon}</div>
            <div style="font-size:11px; color:#999; font-weight:600;
                        text-transform:uppercase; letter-spacing:.6px;">${c.label}</div>
            <div style="font-size:15px; font-weight:700; color:var(--text-main);
                        line-height:1.3;">${c.value}</div>
        </div>
    `).join('');
}

function renderNaturalConditions(selectedPlot) {
    if (selectedPlot === 'ALL') {
        document.getElementById('natural-climate-chart').innerHTML = '';
        document.getElementById('natural-annual-table').innerHTML = '';
        const sc = document.getElementById('natural-site-cards');
        if (sc) sc.innerHTML = '<p style="color:#aaa;font-size:13px;grid-column:1/-1;">Select a single plot to view natural conditions.</p>';
        return;
    }
    renderClimateChart(selectedPlot);
    renderAnnualTable(selectedPlot);
    renderSiteConditions(selectedPlot);
}

// ── Walter-Lieth Climate Chart ────────────────────────────────────────────────

function renderClimateChart(plotId) {
    const container = document.getElementById('natural-climate-chart');
    const data = climateData[plotId];
    const nc = naturalConditionsData[plotId];
    
    if (!data || !data.months.length) {
        container.innerHTML = '<div style="padding:20px;color:#888;text-align:center;">No climate data available.</div>';
        return;
    }

    const alt = nc?.altitude && nc.altitude !== '-' ? `${nc.altitude} m` : '-';

    const months = data.months;
    const tData = months.map(m => +m.tavg);
    const pData = months.map(m => +m.prec);

    const W = 900, H = 560; 
    const padL = 60, padR = 60, padT = 80, padB = 80;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const maxT = Math.max(...tData, 0);
    const maxP = Math.max(...pData, 0);
    
    let tempMax = Math.max(Math.ceil(maxT / 10) * 10, Math.ceil(maxP / 20) * 10);
    if (tempMax < 30) tempMax = 30; 
    const precMax = tempMax * 2;

    const getY_T = val => padT + chartH - (val / tempMax) * chartH;
    const getY_P = val => padT + chartH - (val / precMax) * chartH;
    const getX = i => padL + (i + 0.5) * (chartW / 12);

    let gridHtml = '';
    for (let t = 0; t <= tempMax; t += 10) {
        const y = getY_T(t);
        const p = t * 2; 
        gridHtml += `
            <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#eee" stroke-width="1"/>
            <text x="${padL - 10}" y="${y + 5}" text-anchor="end" font-size="13" fill="#E05C2A" font-weight="bold">${t}</text>
            <text x="${W - padR + 10}" y="${y + 5}" text-anchor="start" font-size="13" fill="#4A90A4" font-weight="bold">${p}</text>
        `;
    }

    let pointsT_str = `${padL},${getY_T(tData[0])} ` + tData.map((val, i) => `${getX(i)},${getY_T(val)}`).join(' ') + ` ${W - padR},${getY_T(tData[11])}`;
    let pointsP_str = `${padL},${getY_P(pData[0])} ` + pData.map((val, i) => `${getX(i)},${getY_P(val)}`).join(' ') + ` ${W - padR},${getY_P(pData[11])}`;

    const bottomY = padT + chartH;
    const topY = padT;
    const polyT_bottom = `${pointsT_str} ${W - padR},${bottomY} ${padL},${bottomY}`;
    const polyP_top = `${pointsP_str} ${W - padR},${topY} ${padL},${topY}`;
    const polyP_bottom = `${pointsP_str} ${W - padR},${bottomY} ${padL},${bottomY}`;
    const polyT_top = `${pointsT_str} ${W - padR},${topY} ${padL},${topY}`;

    let labelsX = MONTH_LABELS.map((m, i) => `
        <text x="${getX(i)}" y="${padT + chartH + 25}" text-anchor="middle" font-size="14" fill="#555">${m}</text>
    `).join('');

    container.innerHTML = `
        <svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
            
            <defs>
                <clipPath id="clip-T-bottom-${plotId}"><polygon points="${polyT_bottom}"/></clipPath>
                <clipPath id="clip-P-top-${plotId}"><polygon points="${polyP_top}"/></clipPath>
                <clipPath id="clip-P-bottom-${plotId}"><polygon points="${polyP_bottom}"/></clipPath>
                <clipPath id="clip-T-top-${plotId}"><polygon points="${polyT_top}"/></clipPath>
            </defs>

            <text x="${W/2}" y="35" text-anchor="middle" font-size="20" font-weight="bold" fill="#333">
                ${t('plot_label') || 'Plot'} ${plotId}
            </text>
            <text x="${W/2}" y="60" text-anchor="middle" font-size="15" fill="#666">
                Altitude: ${alt}
            </text>

            ${gridHtml}

            <g clip-path="url(#clip-P-bottom-${plotId})">
                <rect x="${padL}" y="${padT}" width="${chartW}" height="${chartH}" fill="rgba(30, 136, 229, 0.25)" clip-path="url(#clip-T-top-${plotId})" />
            </g>

            <g clip-path="url(#clip-T-bottom-${plotId})">
                <rect x="${padL}" y="${padT}" width="${chartW}" height="${chartH}" fill="rgba(255, 193, 7, 0.6)" clip-path="url(#clip-P-top-${plotId})" />
            </g>
            
            <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#E05C2A" stroke-width="2"/>
            <line x1="${W - padR}" y1="${padT}" x2="${W - padR}" y2="${padT + chartH}" stroke="#4A90A4" stroke-width="2"/>
            <line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" stroke="#888" stroke-width="2"/>

            ${labelsX}

            <polyline points="${pointsP_str}" fill="none" stroke="#4A90A4" stroke-width="3" />
            <polyline points="${pointsT_str}" fill="none" stroke="#E05C2A" stroke-width="3" />
            
            ${tData.map((val, i) => `<circle class="t-node" cx="${getX(i)}" cy="${getY_T(val)}" r="6" fill="#E05C2A" stroke="#fff" stroke-width="1.5" style="cursor:pointer; transition: r 0.2s;"/>`).join('')}
            ${pData.map((val, i) => `<circle class="p-node" cx="${getX(i)}" cy="${getY_P(val)}" r="6" fill="#4A90A4" stroke="#fff" stroke-width="1.5" style="cursor:pointer; transition: r 0.2s;"/>`).join('')}

            <text x="15" y="${padT + chartH/2}" transform="rotate(-90 15,${padT + chartH/2})" text-anchor="middle" font-size="15" font-weight="bold" fill="#E05C2A">Temperature (°C)</text>
            <text x="${W - 15}" y="${padT + chartH/2}" transform="rotate(90 ${W - 15},${padT + chartH/2})" text-anchor="middle" font-size="15" font-weight="bold" fill="#4A90A4">Precipitation (mm)</text>

            <rect x="${W/2 - 200}" y="${padT + chartH + 50}" width="14" height="14" fill="rgba(255, 193, 7, 0.6)" />
            <text x="${W/2 - 180}" y="${padT + chartH + 62}" font-size="13" fill="#555">Arid Period</text>

            <rect x="${W/2 - 90}" y="${padT + chartH + 50}" width="14" height="14" fill="rgba(30, 136, 229, 0.25)" />
            <text x="${W/2 - 70}" y="${padT + chartH + 62}" font-size="13" fill="#555">Humid Period</text>

            <line x1="${W/2 + 30}" y1="${padT + chartH + 57}" x2="${W/2 + 60}" y2="${padT + chartH + 57}" stroke="#E05C2A" stroke-width="3"/>
            <circle cx="${W/2 + 45}" cy="${padT + chartH + 57}" r="4" fill="#E05C2A"/>
            <text x="${W/2 + 68}" y="${padT + chartH + 62}" font-size="13" fill="#555">Temperature</text>

            <line x1="${W/2 + 160}" y1="${padT + chartH + 57}" x2="${W/2 + 190}" y2="${padT + chartH + 57}" stroke="#4A90A4" stroke-width="3"/>
            <circle cx="${W/2 + 175}" cy="${padT + chartH + 57}" r="4" fill="#4A90A4"/>
            <text x="${W/2 + 198}" y="${padT + chartH + 62}" font-size="13" fill="#555">Precipitation</text>
        </svg>
    `;

    // ── Tooltip Events ──────────────────────────────────────────────────
    
    const tNodes = container.querySelectorAll('.t-node');
    tNodes.forEach((node, i) => {
        const val = tData[i];
        const month = MONTH_LABELS[i];
        const tooltipHtml = `
            <div style="margin-bottom:4px; border-bottom:1px solid #555; padding-bottom:4px;">
                <strong>${month}</strong>
            </div>
            <div>
                <span class="tooltip-color-box" style="background:#E05C2A"></span>
                <strong>T:</strong> ${val.toFixed(1)} °C
            </div>`;
        
        node.addEventListener('mousemove', (e) => {
            node.setAttribute('r', '9');
            showTooltip(e, tooltipHtml);
        });
        node.addEventListener('mouseleave', () => {
            node.setAttribute('r', '6');
            hideTooltip();
        });
    });

    const pNodes = container.querySelectorAll('.p-node');
    pNodes.forEach((node, i) => {
        const val = pData[i];
        const month = MONTH_LABELS[i];
        const tooltipHtml = `
            <div style="margin-bottom:4px; border-bottom:1px solid #555; padding-bottom:4px;">
                <strong>${month}</strong>
            </div>
            <div>
                <span class="tooltip-color-box" style="background:#4A90A4"></span>
                <strong>P:</strong> ${val.toFixed(1)} mm
            </div>`;
        
        node.addEventListener('mousemove', (e) => {
            node.setAttribute('r', '9');
            showTooltip(e, tooltipHtml);
        });
        node.addEventListener('mouseleave', () => {
            node.setAttribute('r', '6');
            hideTooltip();
        });
    });
}

// ── Annual Summary Table ───────────────────────────────────────────────────────

function renderAnnualTable(plotId) {
    const container = document.getElementById('natural-annual-table');
    const d = climateData[plotId];
    if (!d || !d.annual) {
        container.innerHTML = '<p style="color:#aaa;font-size:13px;">No annual data available.</p>';
        return;
    }
    const a = d.annual;
    const fmt = v => (v === null || isNaN(+v)) ? '-' : (+v).toFixed(1);

    const rows = [
        [t('natural_mean_temp'),   fmt(a.tavg) + ' °C'],
        [t('natural_ann_prec'),   fmt(a.prec) + ' mm'],
        [t('natural_min_temp'),   fmt(a.tmin) + ' °C'],
        [t('natural_max_temp'),   fmt(a.tmax) + ' °C'],
        [t('natural_martonne'),   a.martonne ? fmt(a.martonne) : '-'],
    ];

    container.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
            ${rows.map((r, i) => `
                <tr style="background:${i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.025)'}">
                    <td style="padding:8px 12px;color:#555;font-weight:500;">${r[0]}</td>
                    <td style="padding:8px 12px;font-weight:700;color:var(--text-main);text-align:right;">${r[1]}</td>
                </tr>
            `).join('')}
        </table>
    `;
}