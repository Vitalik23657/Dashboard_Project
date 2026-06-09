// ─── Natural Conditions & Climatograph Module ───────────────────────────────

let naturalConditionsData = {};
let climateData           = {};

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Parsers ──────────────────────────────────────────────────────────────────

function parseNaturalConditions(csvText) {
    const lines = csvText.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row || row.length < 14) continue;
        const id = row[0].trim();
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
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row || row.length < 15) continue;
        const id    = row[0].trim();
        const month = row[2].trim().replace(/"/g, '');
        if (!climateData[id]) climateData[id] = { months: [], annual: null };

        const entry = {
            month,
            tmin:     parseFloat(row[7])  || 0,   // tmin      col 7
            tmax:     parseFloat(row[8])  || 0,   // tmax      col 8
            tavg:     parseFloat(row[9])  || 0,   // tavg      col 9
            prec:     parseFloat(row[10]) || 0,   // prec      col 10
            martonne: row[15] ? parseFloat(row[15]) : null,  // martonne col 15
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

// ── View Switcher (removed – both views are always visible) ───────────────────

function switchNaturalView(view) {
    // Buttons removed; both climate and site conditions are always shown.
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
        { icon: '⛰️', label: t('natural_altitude'),       value: nc.altitude ? nc.altitude + ' m' : '-' },
        { icon: '🧭', label: t('natural_exposure'),        value: nc.exposure      || '-' },
        { icon: '📐', label: t('natural_slope'),           value: nc.slope ? nc.slope + '°' : '-' },
        { icon: '🪨', label: t('natural_stoniness'),       value: nc.stoniness     || '-' },
        { icon: '🏔️', label: t('natural_aspect'),          value: nc.aspect        || '-' },
        { icon: '🌱', label: t('natural_soil_type'),       value: nc.soilType      || '-' },
        { icon: '🧪', label: t('natural_soil_ph'),         value: nc.soilPH        || '-' },
        { icon: '🌾', label: t('natural_texture'),         value: nc.texture       || '-' },
        { icon: '🌍', label: t('natural_bio_region'),      value: nc.bioRegion     || '-' },
        { icon: '🍂', label: t('natural_org_matter'),  value: nc.organicMatter || '-' },
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

// ── Info Cards ────────────────────────────────────────────────────────────────

function renderNaturalInfoCards(plotId) {
    const nc = naturalConditionsData[plotId];
    const cl = climateData[plotId];
    const container = document.getElementById('natural-info-cards');

    const cards = [
        { icon: '⛰️', label: t('natural_altitude'),         value: nc ? nc.altitude + ' m' : '-' },
        { icon: '🧭', label: t('natural_exposure'),          value: nc ? nc.exposure : '-' },
        { icon: '📐', label: t('natural_slope'),             value: nc ? nc.slope + '°' : '-' },
        { icon: '🪨', label: t('natural_stoniness'),         value: nc ? nc.stoniness : '-' },
        { icon: '🌱', label: t('natural_soil_type'),         value: nc ? nc.soilType : '-' },
        { icon: '🧪', label: t('natural_soil_ph'),           value: nc ? nc.soilPH : '-' },
        { icon: '🌍', label: t('natural_bio_region'),        value: nc ? nc.bioRegion : '-' },
        { icon: '🌡️', label: 'Mean Temp',        value: cl && cl.annual ? (+cl.annual.tavg).toFixed(1) + ' °C' : '-' },
        { icon: '🌧️', label: 'Annual Precip',    value: cl && cl.annual ? (+cl.annual.prec).toFixed(0) + ' mm' : '-' },
        { icon: '💧', label: 'Martonne Index',    value: cl && cl.annual && cl.annual.martonne ? (+cl.annual.martonne).toFixed(1) : '-' },
    ];

    container.innerHTML = cards.map(c => `
        <div style="background:var(--card-bg);border-radius:10px;
                    box-shadow:0 2px 10px rgba(0,0,0,0.06);
                    padding:14px 16px;display:flex;flex-direction:column;gap:4px;">
            <div style="font-size:1.3rem;">${c.icon}</div>
            <div style="font-size:11px;color:#888;font-weight:500;text-transform:uppercase;letter-spacing:.5px;">${c.label}</div>
            <div style="font-size:15px;font-weight:700;color:var(--text-main);">${c.value}</div>
        </div>
    `).join('');
}

// ── Climodiagram PNG ──────────────────────────────────────────────────────────

function renderClimodiagram(plotId) {
    const container = document.getElementById('natural-climodiagram');
    const BASE = '../Parcelas/2_EstadoNatural/Clima/Climodiagramas/';
    const url = `${BASE}climograma_${plotId}_1991_2020.png`;
    container.innerHTML = `
        <img src="${url}" alt="Climodiagram Plot ${plotId}"
             style="max-width:100%;max-height:340px;object-fit:contain;border-radius:6px;"
             onerror="this.parentElement.innerHTML='<span style=color:#aaa;font-size:13px>No climodiagram available for Plot ${plotId}</span>'">
    `;
}

// ── Catmull-Rom smooth path helper ────────────────────────────────────────────

function smoothPath(points) {
    if (points.length < 2) return '';
    let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(i - 1, 0)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(i + 2, points.length - 1)];
        const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
        const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
        const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
        const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
}

// ── Walter-Lieth Climate Chart ────────────────────────────────────────────────

function renderClimateChart(plotId) {
    const container = document.getElementById('natural-climate-chart');
    const data = climateData[plotId];
    if (!data || !data.months.length) {
        container.innerHTML = '<p style="color:#aaa;font-size:13px;text-align:center;padding-top:80px;">No climate data available.</p>';
        return;
    }

    const nc = naturalConditionsData[plotId];
    const months = data.months;
    const annual = data.annual;

    const prec = months.map(m => +m.prec);
    const tavg = months.map(m => +m.tavg);
    const tmin = months.map(m => +m.tmin);

    // ── Walter-Lieth: 1°C = 2mm, so precip axis = 2× temp axis
    // Arid month: P < 2T
    const aridMonths = months.filter((m, i) => prec[i] < 2 * tavg[i]).length;

    // Axis bounds – temp-driven (Walter-Lieth rule)
    const tempMin = Math.floor(Math.min(...tavg, ...tmin) / 5) * 5 - 5;
    const tempMax = Math.ceil(Math.max(...tavg) / 5) * 5 + 5;
    const precMax = tempMax * 2;  // strict Walter-Lieth scaling

    // Layout
    const W = 900, H = 520;
    const statsH = 56;
    const padL = 54, padR = 60, padT = statsH + 20, padB = 60;
    const legH = 32;
    const chartH = H - padT - padB - legH;
    const chartW = W - padL - padR;

    const scaleT = v => padT + chartH - ((v - tempMin) / (tempMax - tempMin)) * chartH;
    const scaleP = v => padT + chartH - (Math.min(v, precMax) / precMax) * chartH;
    const scaleX = i => padL + (i + 0.5) * (chartW / 12);

    // ── Dashed vertical grid lines
    const grid = MONTH_LABELS.map((_, i) => {
        const x = scaleX(i);
        return `<line x1="${x.toFixed(1)}" y1="${padT}" x2="${x.toFixed(1)}" y2="${padT + chartH}"
                      stroke="#e8e8e8" stroke-width="1" stroke-dasharray="4,3"/>`;
    }).join('');

    // ── Precipitation bars (blue = normal, yellow = arid)
    const barW = chartW / 12 * 0.65;
    const bars = prec.map((p, i) => {
        const isArid = p < 2 * tavg[i];
        const color  = isArid ? '#F5C842' : '#7DC4E8';
        const stroke = isArid ? '#D4A800' : '#4A90A4';
        const x = scaleX(i) - barW / 2;
        const y = scaleP(p);
        const h = Math.max(1, padT + chartH - y);
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}"
                      fill="${color}" stroke="${stroke}" stroke-width="0.8" rx="1"/>`;
    }).join('');

    // ── Smooth temperature lines
    const avgPts = tavg.map((v, i) => [scaleX(i), scaleT(v)]);
    const minPts = tmin.map((v, i) => [scaleX(i), scaleT(v)]);

    // ── Y-axis ticks
    const tempStep = (tempMax - tempMin) <= 30 ? 5 : 10;
    const tempTicks = [];
    for (let t = tempMin; t <= tempMax; t += tempStep) {
        const y = scaleT(t);
        tempTicks.push(`
            <line x1="${padL - 4}" y1="${y.toFixed(1)}" x2="${padL}" y2="${y.toFixed(1)}" stroke="#bbb" stroke-width="1"/>
            <line x1="${padL}" y1="${y.toFixed(1)}" x2="${padL + chartW}" y2="${y.toFixed(1)}" stroke="#f0f0f0" stroke-width="1"/>
            <text x="${(padL - 7).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="13" fill="#555">${t}</text>
        `);
    }

    const precStep = precMax <= 60 ? 10 : precMax <= 100 ? 20 : 50;
    const precTicks = [];
    for (let p = 0; p <= precMax; p += precStep) {
        const y = scaleP(p);
        precTicks.push(`
            <line x1="${W - padR}" y1="${y.toFixed(1)}" x2="${W - padR + 4}" y2="${y.toFixed(1)}" stroke="#bbb" stroke-width="1"/>
            <text x="${(W - padR + 7).toFixed(1)}" y="${(y + 4).toFixed(1)}" font-size="13" fill="#4A90A4">${p}</text>
        `);
    }

    // ── Stats bar values
    const fmtT = v => isNaN(+v) ? '-' : (+v).toFixed(1) + ' °C';
    const fmtP = v => isNaN(+v) ? '-' : (+v).toFixed(0) + ' mm';
    const fmtM = v => (!v || isNaN(+v)) ? '-' : (+v).toFixed(1);
    const alt  = nc ? nc.altitude + ' m' : '-';
    const mart = annual && annual.martonne ? fmtM(annual.martonne) : '-';

    const statsItems = [
        { label: t('natural_mean_temp').split(' ').slice(0,2).join(' '),    value: annual ? fmtT(annual.tavg) : '-', color: '#E05C2A' },
        { label: t('natural_ann_prec').split(' ').slice(0,2).join(' '),  value: annual ? fmtP(annual.prec) : '-', color: '#4A90A4' },
        { label: t('natural_arid_months') || 'Arid months',  value: aridMonths,                        color: '#D4A800' },
        { label: t('natural_altitude'),     value: alt,                               color: '#666' },
        { label: t('natural_martonne').split(' ')[0],     value: mart,                              color: '#2E7D32' },
    ];

    const statsCellW = W / statsItems.length;
    const statsBar = statsItems.map((s, i) => {
        const cx = i * statsCellW + statsCellW / 2;
        const bg = i % 2 === 0 ? '#f7f9fc' : '#eef2f7';
        return `
            <rect x="${(i * statsCellW).toFixed(1)}" y="0" width="${statsCellW.toFixed(1)}" height="${statsH}"
                  fill="${bg}"/>
            <text x="${cx.toFixed(1)}" y="18" text-anchor="middle" font-size="11" fill="#999" font-weight="500"
                  letter-spacing="0.3">${s.label.toUpperCase()}</text>
            <text x="${cx.toFixed(1)}" y="40" text-anchor="middle" font-size="16" fill="${s.color}" font-weight="700">${s.value}</text>
        `;
    }).join('');

    // ── Legend
    const legY = padT + chartH + padB - 4;
    const legend = `
        <rect x="${padL}" y="${legY - 10}" width="14" height="14" fill="#7DC4E8" stroke="#4A90A4" stroke-width="0.8" rx="1"/>
        <text x="${padL + 20}" y="${legY + 2}" font-size="13" fill="#555">Precipitation</text>
        <rect x="${padL + 130}" y="${legY - 10}" width="14" height="14" fill="#F5C842" stroke="#D4A800" stroke-width="0.8" rx="1"/>
        <text x="${padL + 150}" y="${legY + 2}" font-size="13" fill="#555">Arid month</text>
        <line x1="${padL + 256}" y1="${legY - 4}" x2="${padL + 276}" y2="${legY - 4}" stroke="#E05C2A" stroke-width="2.5"/>
        <circle cx="${padL + 266}" cy="${legY - 4}" r="4" fill="#E05C2A" stroke="#fff" stroke-width="1.2"/>
        <text x="${padL + 284}" y="${legY + 2}" font-size="13" fill="#555">Avg Temp</text>
        <line x1="${padL + 376}" y1="${legY - 4}" x2="${padL + 396}" y2="${legY - 4}" stroke="#5BA4D4" stroke-width="2" stroke-dasharray="5,3"/>
        <circle cx="${padL + 386}" cy="${legY - 4}" r="3.5" fill="#5BA4D4" stroke="#fff" stroke-width="1"/>
        <text x="${padL + 404}" y="${legY + 2}" font-size="13" fill="#555">Min Temp</text>
    `;

    container.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">

            <!-- Stats bar background -->
            <rect x="0" y="0" width="${W}" height="${statsH}" fill="#f7f9fc" rx="6"/>
            <line x1="0" y1="${statsH}" x2="${W}" y2="${statsH}" stroke="#e0e4ea" stroke-width="1"/>
            ${statsBar}

            <!-- Grid -->
            ${grid}

            <!-- Axes -->
            <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#bbb" stroke-width="1.2"/>
            <line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" stroke="#bbb" stroke-width="1.2"/>
            <line x1="${W - padR}" y1="${padT}" x2="${W - padR}" y2="${padT + chartH}" stroke="#bbb" stroke-width="1.2"/>

            <!-- Ticks -->
            ${tempTicks.join('')}
            ${precTicks.join('')}

            <!-- Precipitation bars -->
            ${bars}

            <!-- Avg temp curve -->
            <path d="${smoothPath(avgPts)}" fill="none" stroke="#E05C2A" stroke-width="2.5" stroke-linejoin="round"/>
            ${avgPts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="#E05C2A" stroke="#fff" stroke-width="1.2"/>`).join('')}

            <!-- Min temp curve -->
            <path d="${smoothPath(minPts)}" fill="none" stroke="#5BA4D4" stroke-width="1.8" stroke-dasharray="5,3"/>
            ${minPts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.8" fill="#5BA4D4" stroke="#fff" stroke-width="1"/>`).join('')}

            <!-- X-axis labels -->
            ${MONTH_LABELS.map((m, i) => `<text x="${scaleX(i).toFixed(1)}" y="${(padT + chartH + 20).toFixed(1)}" text-anchor="middle" font-size="13" fill="#555">${m}</text>`).join('')}

            <!-- Axis unit labels -->
            <text x="14" y="${(padT + chartH / 2).toFixed(1)}" text-anchor="middle" font-size="13" fill="#E05C2A" font-weight="600"
                  transform="rotate(-90, 14, ${(padT + chartH / 2).toFixed(1)})">°C</text>
            <text x="${(W - 12).toFixed(1)}" y="${(padT + chartH / 2).toFixed(1)}" text-anchor="middle" font-size="13" fill="#4A90A4" font-weight="600"
                  transform="rotate(90, ${(W - 12).toFixed(1)}, ${(padT + chartH / 2).toFixed(1)})">mm</text>

            <!-- Legend -->
            ${legend}
        </svg>
    `;
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