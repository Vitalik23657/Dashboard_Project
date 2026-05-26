// ── Tooltip ──────────────────────────────────────────────────
const tooltip = document.getElementById('tooltip');

function showTooltip(e, htmlContent) {
    tooltip.innerHTML = htmlContent;
    tooltip.style.opacity = '1';
    tooltip.style.left = e.pageX + 'px';
    tooltip.style.top  = e.pageY + 'px';
}

function hideTooltip() {
    tooltip.style.opacity = '0';
}

function getDamageColor(damageType) {
    const d = damageType.toLowerCase();
    if (d.includes('no damage') || d.includes('sin daño'))  return '#4CAF50';
    if (d.includes('competition') || d.includes('competencia')) return '#FF9800';
    if (d.includes('fire') || d.includes('incendio'))       return '#D84315';
    if (d.includes('insects') || d.includes('insectos')
     || d.includes('fungi')   || d.includes('hongos')
     || d.includes('biotic')  || d.includes('biótico'))     return '#d32f2f';
    return '#78909c';
}

function renderStackedChart(data, containerId, metricPrefix, yLabelText) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="y-axis-label">${yLabelText}</div>`;

    if (data.length === 0) {
        container.innerHTML += `<div style="margin:auto;color:#888;">${t('no_data_filters')}</div>`;
        return;
    }

    let maxTotal = 0;
    data.forEach(item => {
        const localMax = Math.max(
            item[`total_${metricPrefix}2`],
            item[`total_${metricPrefix}3`],
            item[`total_${metricPrefix}4`]
        );
        if (localMax > maxTotal) maxTotal = localMax;
    });
    if (maxTotal === 0) maxTotal = 1;

    data.forEach(item => {
        const group = document.createElement('div');
        group.className = 'bar-group';

        const createStackedBar = (nfiKey, labelName, patternClass) => {
            const totalVal = item[`total_${nfiKey}`];
            const barContainer = document.createElement('div');
            barContainer.className = 'stacked-bar-container';
            const pct = (totalVal / maxTotal) * 100;
            barContainer.style.height = `${pct}%`;
            if (pct === 0) barContainer.style.minHeight = '1px';

            let tooltipHtml = `<div style="margin-bottom:6px;border-bottom:1px solid #555;padding-bottom:4px;">
                <strong>${t('dc_col').replace(' (cm)', '')} ${item.dc} - ${labelName}</strong><br>
                Total: ${totalVal.toFixed(2)} ${yLabelText.split('/')[0]}
            </div>`;

            for (const [sp, val] of Object.entries(item[nfiKey])) {
                if (val > 0) {
                    const seg = document.createElement('div');
                    seg.className = `bar-segment ${patternClass}`;
                    seg.style.height = `${(val / totalVal) * 100}%`;
                    seg.style.backgroundColor = speciesColorMap[sp];
                    barContainer.appendChild(seg);
                    tooltipHtml += `<div>
                        <span class="tooltip-color-box" style="background:${speciesColorMap[sp]}"></span>
                        ${sp}</i>: ${val.toFixed(2)}
                    </div>`;
                }
            }

            barContainer.addEventListener('mousemove', (e) => showTooltip(e, tooltipHtml));
            barContainer.addEventListener('mouseleave', hideTooltip);
            return barContainer;
        };

        if (!disabledNFIs.has('nfi2')) group.appendChild(createStackedBar(`${metricPrefix}2`, t('nfi_2'), 'nfi2-pattern'));
        if (!disabledNFIs.has('nfi3')) group.appendChild(createStackedBar(`${metricPrefix}3`, t('nfi_3'), 'nfi3-pattern'));
        if (!disabledNFIs.has('nfi4')) group.appendChild(createStackedBar(`${metricPrefix}4`, t('nfi_4'), 'nfi4-pattern'));

        const label = document.createElement('div');
        label.className = 'x-axis-label';
        label.innerText = item.dc;
        group.appendChild(label);

        const subLabels = document.createElement('div');
        subLabels.className = 'sub-labels';
        subLabels.innerHTML = NFI_KEYS
            .filter(k => !disabledNFIs.has(k))
            .map(k => `<span>${k.replace('nfi', '')}</span>`)
            .join('');
        group.appendChild(subLabels);

        container.appendChild(group);
    });
}

function renderTable(data, containerId, metric, unit) {
    const container = document.getElementById(containerId);
    if (data.length === 0) { 
        container.innerHTML = `<div style="padding: 20px; color: #888;">No data for selected filters</div>`; 
        return; 
    }

    const showNFI2 = !disabledNFIs.has('nfi2');
    const showNFI3 = !disabledNFIs.has('nfi3');
    const showNFI4 = !disabledNFIs.has('nfi4');

    let html = `<table>
        <thead>
            <tr>
                <th>DC (cm)</th>
                ${showNFI2 ? `<th>${t('nfi_2')} (${unit})</th>` : ''}
                ${showNFI3 ? `<th>${t('nfi_3')} (${unit})</th>` : ''}
                ${showNFI4 ? `<th>${t('nfi_4')} (${unit})</th>` : ''}
            </tr>
        </thead>
        <tbody>`;

    data.forEach(row => {
        html += `
            <tr>
                <td>${row.dc}</td>
                ${showNFI2 ? `<td>${row[`total_${metric}2`].toFixed(2)}</td>` : ''}
                ${showNFI3 ? `<td>${row[`total_${metric}3`].toFixed(2)}</td>` : ''}
                ${showNFI4 ? `<td>${row[`total_${metric}4`].toFixed(2)}</td>` : ''}
            </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ── Growth badge ─────────────────────────────────────────────
function updateGrowthStats(data) {
    let totalV2 = 0, totalV3 = 0, totalV4 = 0;
    const speciesGrowth = {};
    const dcShift = { young: 0, medium: 0, mature: 0 };

    data.forEach(item => {
        totalV2 += item.total_v2;
        totalV3 += item.total_v3;
        totalV4 += item.total_v4;

        const netDCVol = item.total_v4 - item.total_v2;
        if      (item.dc < 20)  dcShift.young  += netDCVol;
        else if (item.dc <= 35) dcShift.medium += netDCVol;
        else                    dcShift.mature += netDCVol;

        const spSet = new Set([...Object.keys(item.v2), ...Object.keys(item.v4)]);
        spSet.forEach(sp => {
            if (!speciesGrowth[sp]) speciesGrowth[sp] = 0;
            speciesGrowth[sp] += (item.v4[sp] || 0) - (item.v2[sp] || 0);
        });
    });

    const badge    = document.getElementById('growth-badge');
    const dropdown = document.getElementById('growth-dropdown');
    const netChange = totalV4 - totalV2;

    if (totalV2 === 0 && totalV4 === 0) {
        badge.className = 'growth-badge neutral';
        badge.innerHTML = `${t('nfi_prefix')} 2 → 4 Volume Growth: 0%`;
        dropdown.innerHTML = 'No data available or all species filtered out.';
        return;
    }

    let mainSp = null, mainSpVal = 0;
    for (const sp in speciesGrowth) {
        if (Math.abs(speciesGrowth[sp]) > Math.abs(mainSpVal)) {
            mainSpVal = speciesGrowth[sp];
            mainSp    = sp;
        }
    }

    let dominantShiftDC = t('growth_young'), maxShiftVal = dcShift.young;
    if (Math.abs(dcShift.medium) > Math.abs(maxShiftVal)) { dominantShiftDC = t('growth_medium'); maxShiftVal = dcShift.medium; }
    if (Math.abs(dcShift.mature) > Math.abs(maxShiftVal)) { dominantShiftDC = t('growth_mature'); }

    const mai       = netChange / 30;
    const pctChange = totalV2 === 0 ? 100 : (netChange / totalV2) * 100;

    let contextMsg;
    if      (pctChange < -30) contextMsg = t('growth_ctx_severe');
    else if (pctChange < 0)   contextMsg = t('growth_ctx_loss');
    else if (pctChange < 70)  contextMsg = t('growth_ctx_steady');
    else                      contextMsg = t('growth_ctx_rapid');

    if (pctChange > 0) {
        badge.className = 'growth-badge positive';
        badge.innerHTML = `📈 Vol. Growth (${t('nfi_prefix')} 2→4): +${pctChange.toFixed(1)}% ▾`;
    } else if (pctChange < 0) {
        badge.className = 'growth-badge negative';
        badge.innerHTML = `📉 Vol. Loss (${t('nfi_prefix')} 2→4): ${pctChange.toFixed(1)}% ▾`;
    } else {
        badge.className = 'growth-badge neutral';
        badge.innerHTML = `Vol. Growth (${t('nfi_prefix')} 2→4): 0% ▾`;
    }

    dropdown.innerHTML = `
        <div style="font-size: 1.05rem; margin-bottom: 8px; font-weight: bold; border-bottom: 1px solid #555; padding-bottom: 6px;">
            Detailed Growth Analysis (${t('nfi_prefix')} 2 → 4)
        </div>
        <div style="margin-bottom: 6px;">
            <strong>1. Absolute Volume:</strong><br>
            <span style="color:#aaa;">${t('nfi_2')}:</span> ${totalV2.toFixed(1)} m³/ha<br>
            <span style="color:#aaa;">${t('nfi_3')}:</span> ${totalV3.toFixed(1)} m³/ha<br>
            <span style="color:#aaa;">${t('nfi_4')}:</span> ${totalV4.toFixed(1)} m³/ha<br>
            <span style="color:${netChange >= 0 ? '#81c784' : '#e57373'};">${t('growth_net_change')} ${netChange > 0 ? '+' : ''}${netChange.toFixed(1)} m³/ha</span>
        </div>
        <div style="margin-bottom:6px;">
            <strong>${t('growth_species')}</strong><br>
            <span class="tooltip-color-box" style="background:${speciesColorMap[mainSp]};"></span>
            <i>${mainSp}</i> (${mainSpVal > 0 ? '+' : ''}${mainSpVal.toFixed(1)} m³/ha)
        </div>
        <div style="margin-bottom:6px;">
            <strong>${t('growth_structure')}</strong><br>
            ${t('growth_structure_msg').replace('{0}', dominantShiftDC)}
        </div>
        <div style="margin-bottom:6px;">
            <strong>${t('growth_mai')}</strong><br>
            ${t('growth_mai_note').replace('{0}', mai.toFixed(2))}
        </div>
        <div style="margin-top:10px;padding:8px;background:rgba(255,255,255,0.1);border-radius:4px;font-size:0.8rem;line-height:1.3;">${contextMsg}</div>`;
}

// ── Damage ───────────────────────────────────────────────────
function renderDamageStatus(selectedPlot) {
    const nfi2Container = document.getElementById('damage-nfi2');

    if (selectedPlot === 'ALL') {
        nfi2Container.innerHTML = `<div class="damage-empty-state">${t('damage_select_plot')}</div>`;
    } else {
        const rawStatus = damageData.nfi2[selectedPlot] || t('damage_no_recorded');
        const d2 = translateDamageAgent(rawStatus);
        let badgeClass = 'damage-badge';
        if (rawStatus.toLowerCase().includes('no damage')) badgeClass += ' healthy';
        else if (rawStatus.toLowerCase().includes('severe')) badgeClass += ' severe';
        else if (damageData.nfi2[selectedPlot]) badgeClass += ' minor';
        nfi2Container.innerHTML = `<div class="${badgeClass}">${d2}</div>`;
    }

    _renderDamageBarsAndTable('nfi3', 'damage-nfi3',  'view-damage-nfi3-table', selectedPlot);
    _renderDamageBarsAndTable('nfi4', 'damage-nfi4',  'view-damage-nfi4-table', selectedPlot);
}

function _renderDamageBarsAndTable(nfiKey, chartContainerId, tableContainerId, selectedPlot) {
    const chartContainer = document.getElementById(chartContainerId);
    chartContainer.innerHTML = '';
    let records = [];

    if (selectedPlot === 'ALL') {
        const agg = {};
        let totalTreesOverall = 0;
        for (const plot in damageData[nfiKey]) {
            const r = damageData[nfiKey][plot];
            if (r && r.length > 0) {
                totalTreesOverall += r[0].totalTrees;
                r.forEach(rec => { agg[rec.damage] = (agg[rec.damage] || 0) + rec.treesDamaged; });
            }
        }
        for (const dmg in agg) {
            records.push({ damage: dmg, treesDamaged: agg[dmg], pct: totalTreesOverall > 0 ? (agg[dmg] / totalTreesOverall) * 100 : 0 });
        }
    } else {
        records = (damageData[nfiKey][selectedPlot] || []).map(r => ({ ...r }));
    }

    records.sort((a, b) => b.pct - a.pct);
    const displayRecords = records.map(rec => ({ ...rec, displayDamage: translateDamageAgent(rec.damage) }));

    if (displayRecords.length === 0) {
        chartContainer.innerHTML = `<div class="damage-empty-state">${t('damage_no_data')}</div>`;
    } else {
        displayRecords.forEach(rec => {
            const row = document.createElement('div');
            row.className = 'damage-row';
            row.innerHTML = `
                <div class="damage-label">
                    <span>${rec.displayDamage}</span>
                    <span>${rec.pct.toFixed(1)}%</span>
                </div>
                <div class="damage-bar-bg">
                    <div class="damage-bar-fill" style="width:${rec.pct}%;background-color:${getDamageColor(rec.damage)};"></div>
                </div>`;
            chartContainer.appendChild(row);
        });
    }
    _renderDamageTable(displayRecords, tableContainerId);
}

function _renderDamageTable(records, containerId) {
    const container = document.getElementById(containerId);
    if (records.length === 0) {
        container.innerHTML = `<div class="damage-empty-state" style="margin-top:20px;">${t('damage_no_data')}</div>`;
        return;
    }
    let html = `<table>
        <thead><tr>
            <th>${t('damage_agent')}</th>
            <th>${t('damage_trees')}</th>
            <th>${t('damage_pct')}</th>
        </tr></thead><tbody>`;
    records.forEach(rec => {
        html += `<tr>
            <td>${rec.displayDamage || rec.damage}</td>
            <td>${rec.treesDamaged !== undefined ? rec.treesDamaged.toFixed(1) : '-'}</td>
            <td>${rec.pct.toFixed(2)}%</td>
        </tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ── Quality ──────────────────────────────────────────────────
function renderQualityLegend() {
    const legendContainer = document.getElementById('quality-legend');
    legendContainer.innerHTML = '';
    for (let i = 1; i <= 6; i++) {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.style.cursor = 'help';
        item.innerHTML = `<div class="legend-color" style="background:${QUALITY_COLORS[i]};"></div> ${t('quality_class')} ${i}`;
        const desc = getQualityDescription(String(i));
        if (desc) {
            const tooltipHtml = `<div style="max-width:250px;white-space:normal;line-height:1.4;">
                <strong>${t('quality_class')} ${i}</strong><br>
                <span style="color:#ddd;font-size:0.8rem;display:inline-block;margin-top:4px;">${desc}</span>
            </div>`;
            item.addEventListener('mousemove', (e) => showTooltip(e, tooltipHtml));
            item.addEventListener('mouseleave', hideTooltip);
        }
        legendContainer.appendChild(item);
    }
}

function renderQualityDefinitions() {
    const container = document.getElementById('quality-definitions-list');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= 6; i++) {
        const desc = getQualityDescription(String(i));
        if (!desc) continue;
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; gap:12px; align-items:flex-start;';
        row.innerHTML = `
            <div style="flex-shrink:0;display:flex;align-items:center;gap:6px;width:85px;font-weight:bold;color:#333;">
                <div class="legend-color" style="background:${QUALITY_COLORS[i]};"></div> ${t('quality_class')} ${i}
            </div>
            <div style="color:#555;line-height:1.4;">${desc}</div>`;
        container.appendChild(row);
    }
}

function renderQualityChartAndTable(selectedPlot) {
    const chartContainer = document.getElementById('chart-quality');
    const tableContainer = document.getElementById('view-quality-table');
    chartContainer.innerHTML = '<div class="y-axis-label">% of Total Volume</div>';

    let qData = {};
    if (selectedPlot === 'ALL') {
        const totals = { v2: 0, v3: 0, v4: 0 };
        for (const plot in qualityData) {
            for (const qc in qualityData[plot]) {
                if (!qData[qc]) qData[qc] = { v2: 0, v3: 0, v4: 0 };
                const d = qualityData[plot][qc];
                qData[qc].v2 += d.v2; qData[qc].v3 += d.v3; qData[qc].v4 += d.v4;
                totals.v2    += d.v2; totals.v3    += d.v3; totals.v4    += d.v4;
            }
        }
        for (const qc in qData) {
            qData[qc].p2 = totals.v2 > 0 ? (qData[qc].v2 / totals.v2) * 100 : 0;
            qData[qc].p3 = totals.v3 > 0 ? (qData[qc].v3 / totals.v3) * 100 : 0;
            qData[qc].p4 = totals.v4 > 0 ? (qData[qc].v4 / totals.v4) * 100 : 0;
        }
    } else {
        qData = qualityData[selectedPlot] || {};
    }

    if (Object.keys(qData).length === 0) {
        chartContainer.innerHTML += `<div class="damage-empty-state">${t('quality_no_data')}</div>`;
        tableContainer.innerHTML  = `<div class="damage-empty-state">${t('quality_no_data')}</div>`;
        return;
    }

    [{ key: '2', label: 'NFI 2' }, { key: '3', label: 'NFI 3' }, { key: '4', label: 'NFI 4' }].forEach(nfi => {
        const group = document.createElement('div');
        group.className = 'bar-group';
        group.style.margin = '0 10%';

        const barContainer = document.createElement('div');
        barContainer.className = 'stacked-bar-container';
        barContainer.style.cssText = 'width:40%; height:100%;';

        const segments = Object.entries(qData)
            .map(([qc, d]) => ({ class: qc, pct: d[`p${nfi.key}`], vol: d[`v${nfi.key}`] }))
            .filter(s => s.pct > 0)
            .sort((a, b) => parseInt(a.class) - parseInt(b.class));

        let tooltipHtml = `<div style="margin-bottom:6px;border-bottom:1px solid #555;padding-bottom:4px;">
            <strong>${nfi.label} Quality Breakdown</strong>
        </div>`;

        segments.forEach(seg => {
            const div = document.createElement('div');
            div.className = 'bar-segment';
            div.style.cssText = `height:${seg.pct}%; background-color:${QUALITY_COLORS[seg.class] || '#999'};`;
            barContainer.appendChild(div);
            tooltipHtml += `<div>
                <span class="tooltip-color-box" style="background:${QUALITY_COLORS[seg.class] || '#999'}"></span>
                ${t('quality_class')} ${seg.class}: ${seg.pct.toFixed(1)}% (${seg.vol.toFixed(1)} m³/ha)
            </div>`;
        });

        barContainer.addEventListener('mousemove', (e) => showTooltip(e, tooltipHtml));
        barContainer.addEventListener('mouseleave', hideTooltip);
        group.appendChild(barContainer);

        const label = document.createElement('div');
        label.className = 'x-axis-label';
        label.innerText = nfi.label;
        label.style.bottom = '-25px';
        group.appendChild(label);

        chartContainer.appendChild(group);
    });

    let html = `<table>
        <thead><tr>
            <th>${t('quality_class')}</th>
            <th>NFI 2 (%)</th><th>NFI 2 (m³/ha)</th>
            <th>NFI 3 (%)</th><th>NFI 3 (m³/ha)</th>
            <th>NFI 4 (%)</th><th>NFI 4 (m³/ha)</th>
        </tr></thead><tbody>`;
    Object.keys(qData).sort().forEach(qc => {
        html += `<tr>
            <td>${t('quality_class')} ${qc}</td>
            <td>${qData[qc].p2.toFixed(1)}%</td><td style="color:#777">${qData[qc].v2.toFixed(2)}</td>
            <td>${qData[qc].p3.toFixed(1)}%</td><td style="color:#777">${qData[qc].v3.toFixed(2)}</td>
            <td>${qData[qc].p4.toFixed(1)}%</td><td style="color:#777">${qData[qc].v4.toFixed(2)}</td>
        </tr>`;
    });
    html += `</tbody></table>`;
    tableContainer.innerHTML = html;
}

// ── Carbon ───────────────────────────────────────────────────
function renderCarbonData(selectedPlot) {
    const chartContainer = document.getElementById('chart-carbon');
    const tableContainer = document.getElementById('table-carbon');

    let cData;
    if (selectedPlot === 'ALL') {
        cData = {
            nfi2: { stem:0, branches_large:0, branches_small:0, leaves:0, roots:0, total:0 },
            nfi3: { stem:0, branches_large:0, branches_small:0, leaves:0, roots:0, total:0 },
            nfi4: { stem:0, branches_large:0, branches_small:0, leaves:0, roots:0, total:0 },
        };
        for (const plot in carbonData) {
            NFI_KEYS.forEach(nfi => {
                for (const part in carbonData[plot][nfi]) cData[nfi][part] += carbonData[plot][nfi][part];
            });
        }
    } else {
        cData = carbonData[selectedPlot];
    }

    if (!cData || cData.nfi2.total === 0) {
        chartContainer.innerHTML = `<div class="damage-empty-state">${t('carbon_no_data')}</div>`;
        tableContainer.innerHTML = `<div class="damage-empty-state">${t('carbon_no_data')}</div>`;
        return;
    }

    const maxVal = Math.max(cData.nfi2.total, cData.nfi3.total, cData.nfi4.total);
    const yPad = 40, w = 400, h = 250;
    const getY  = (val) => h - yPad - ((val / maxVal) * (h - yPad * 2));
    const x2 = 50, x3 = 200, x4 = 350;
    const y2 = getY(cData.nfi2.total), y3 = getY(cData.nfi3.total), y4 = getY(cData.nfi4.total);

    chartContainer.innerHTML = `
        <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}">
            <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stop-color="#4CAF50"/>
                    <stop offset="100%" stop-color="#2196F3"/>
                </linearGradient>
            </defs>
            <line x1="40" y1="${getY(maxVal)}"   x2="380" y2="${getY(maxVal)}"   stroke="#eee" stroke-dasharray="4"/>
            <line x1="40" y1="${getY(maxVal/2)}" x2="380" y2="${getY(maxVal/2)}" stroke="#eee" stroke-dasharray="4"/>
            <line x1="40" y1="${getY(0)}"         x2="380" y2="${getY(0)}"         stroke="#888"/>
            <path d="M${x2},${y2} L${x3},${y3} L${x4},${y4}" fill="none" stroke="url(#lineGrad)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="${x2}" cy="${y2}" r="6" fill="white" stroke="#4CAF50" stroke-width="3"/>
            <circle cx="${x3}" cy="${y3}" r="6" fill="white" stroke="#388E3C" stroke-width="3"/>
            <circle cx="${x4}" cy="${y4}" r="6" fill="white" stroke="#2196F3" stroke-width="3"/>
            <text x="${x2}" y="${y2-15}" text-anchor="middle" font-size="12" font-weight="bold" fill="#333">${cData.nfi2.total.toFixed(1)} t/ha</text>
            <text x="${x3}" y="${y3-15}" text-anchor="middle" font-size="12" font-weight="bold" fill="#333">${cData.nfi3.total.toFixed(1)} t/ha</text>
            <text x="${x4}" y="${y4-15}" text-anchor="middle" font-size="12" font-weight="bold" fill="#333">${cData.nfi4.total.toFixed(1)} t/ha</text>
            <text x="${x2}" y="${h - 10}" text-anchor="middle" font-size="12" fill="#777">${t('nfi_2')}</text>
            <text x="${x3}" y="${h - 10}" text-anchor="middle" font-size="12" fill="#777">${t('nfi_3')}</text>
            <text x="${x4}" y="${h - 10}" text-anchor="middle" font-size="12" fill="#777">${t('nfi_4')}</text>
        </svg>`;

    tableContainer.innerHTML = `
        <table>
            <thead><tr>
                <th>${t('carbon_component')}</th>
                <th>NFI 2 (t/ha)</th><th>NFI 3 (t/ha)</th><th>NFI 4 (t/ha)</th>
            </tr></thead>
            <tbody>
                <tr><td>${t('carbon_stem')}</td>          <td>${cData.nfi2.stem.toFixed(2)}</td>          <td>${cData.nfi3.stem.toFixed(2)}</td>          <td>${cData.nfi4.stem.toFixed(2)}</td></tr>
                <tr><td>${t('carbon_branches_large')}</td><td>${cData.nfi2.branches_large.toFixed(2)}</td><td>${cData.nfi3.branches_large.toFixed(2)}</td><td>${cData.nfi4.branches_large.toFixed(2)}</td></tr>
                <tr><td>${t('carbon_branches_small')}</td><td>${cData.nfi2.branches_small.toFixed(2)}</td><td>${cData.nfi3.branches_small.toFixed(2)}</td><td>${cData.nfi4.branches_small.toFixed(2)}</td></tr>
                <tr><td>${t('carbon_leaves')}</td>        <td>${cData.nfi2.leaves.toFixed(2)}</td>        <td>${cData.nfi3.leaves.toFixed(2)}</td>        <td>${cData.nfi4.leaves.toFixed(2)}</td></tr>
                <tr><td>${t('carbon_roots')}</td>         <td>${cData.nfi2.roots.toFixed(2)}</td>         <td>${cData.nfi3.roots.toFixed(2)}</td>         <td>${cData.nfi4.roots.toFixed(2)}</td></tr>
            </tbody>
            <tfoot>
                <tr style="background:#f0f0f0;font-weight:bold;">
                    <td>${t('carbon_total')}</td>
                    <td>${cData.nfi2.total.toFixed(2)}</td>
                    <td>${cData.nfi3.total.toFixed(2)}</td>
                    <td>${cData.nfi4.total.toFixed(2)}</td>
                </tr>
            </tfoot>
        </table>`;
}

// ── Forest Status ─────────────────────────────────────────────
function renderForestStatus(selectedPlot) {
    const tableGen   = document.getElementById('table-general-status');
    const tableTree  = document.getElementById('table-tree-layer');
    const tableShrub = document.getElementById('table-shrub-layer');

    if (selectedPlot === 'ALL') {
        const msg = `<div class="damage-empty-state">${t('status_select_plot')}</div>`;
        tableGen.innerHTML = tableTree.innerHTML = tableShrub.innerHTML = msg;
        return;
    }

    const fmt = (val) => {
        if (!val || val === '-') return '-';
        const num = parseFloat(val);
        if (!isNaN(num)) return num.toFixed(2);
        return translateStatusCell(val);
    };

    const stData = statusData[selectedPlot];
    if (!stData) {
        tableGen.innerHTML = `<div class="damage-empty-state">${t('status_no_data')}</div>`;
    } else {
        const metrics = [
            { labelKey: 'metric_canopy',      i2: 6,  i3: 7,  i4: 8  },
            { labelKey: 'metric_density',     i2: 9,  i3: 10, i4: 11 },
            { labelKey: 'metric_ho',          i2: 12, i3: 13, i4: 14 },
            { labelKey: 'metric_hm',          i2: 15, i3: 16, i4: 17 },
            { labelKey: 'metric_dg',          i2: 18, i3: 19, i4: 20 },
            { labelKey: 'metric_dm',          i2: 21, i3: 22, i4: 23 },
            { labelKey: 'metric_dead',        i2: 24, i3: 25, i4: 26 },
            { labelKey: 'metric_composition', i2: 27, i3: 28, i4: 29 },
            { labelKey: 'metric_structure',   i2: 30, i3: 31, i4: 32 },
            { labelKey: 'metric_shannon',     i2: 33, i3: 34, i4: 35 },
            { labelKey: 'metric_slenderness', i2: 36, i3: 37, i4: 38 },
            { labelKey: 'metric_sdir',        i2: 39, i3: 40, i4: 41 },
            { labelKey: 'metric_hart',        i2: 42, i3: 43, i4: 44 },
        ];
        let html = `<table><thead><tr>
            <th>${t('status_variable')}</th>
            <th class="text-center">NFI 2</th>
            <th class="text-center">NFI 3</th>
            <th class="text-center">NFI 4</th>
        </tr></thead><tbody>`;
        metrics.forEach(m => {
            html += `<tr>
                <td>${t(m.labelKey)}</td>
                <td class="text-center">${fmt(stData[m.i2])}</td>
                <td class="text-center">${fmt(stData[m.i3])}</td>
                <td class="text-center">${fmt(stData[m.i4])}</td>
            </tr>`;
        });
        html += `</tbody></table>`;
        tableGen.innerHTML = html;
    }

    const trData = treeLayerData[selectedPlot];
    if (!trData || trData.length === 0) {
        tableTree.innerHTML = `<div class="damage-empty-state">${t('status_no_tree')}</div>`;
    } else {
        let html = `<table><thead>
            <tr>
                <th rowspan="2">${t('tree_species')}</th>
                <th colspan="2" class="text-center">${t('tree_age')}</th>
                <th colspan="3" class="text-center">${t('tree_dev_stage')}</th>
                <th colspan="2" class="text-center">${t('tree_origin')}</th>
                <th colspan="3" class="text-center">${t('tree_cover')}</th>
                <th colspan="3" class="text-center">${t('tree_regeneration')}</th>
            </tr>
            <tr>
                <th class="text-center">NFI 3</th><th class="text-center">NFI 4</th>
                <th class="text-center">NFI 2</th><th class="text-center">NFI 3</th><th class="text-center">NFI 4</th>
                <th class="text-center">NFI 3</th><th class="text-center">NFI 4</th>
                <th class="text-center">NFI 2</th><th class="text-center">NFI 3</th><th class="text-center">NFI 4</th>
                <th class="text-center">NFI 2</th><th class="text-center">NFI 3</th><th class="text-center">NFI 4</th>
            </tr>
        </thead><tbody>`;
        trData.forEach(row => {
            html += `<tr>
                <td>${row[2]}</td>
                <td class="text-center">${fmt(row[6])}</td>
                <td class="text-center">${fmt(row[7])}</td>
                <td class="text-center">${translateStatusCell(row[9])}</td>
                <td class="text-center">${translateStatusCell(row[11])}</td>
                <td class="text-center">${translateStatusCell(row[13])}</td>
                <td class="text-center">${translateStatusCell(row[15])}</td>
                <td class="text-center">${translateStatusCell(row[19])}</td>
                <td class="text-center">${fmt(row[22])}</td>
                <td class="text-center">${fmt(row[23])}</td>
                <td class="text-center">${fmt(row[24])}</td>
                <td class="text-center">${translateStatusCell(row[26])}</td>
                <td class="text-center">${translateStatusCell(row[28])}</td>
                <td class="text-center">${translateStatusCell(row[30])}</td>
            </tr>`;
        });
        html += `</tbody></table>`;
        tableTree.innerHTML = html;
    }

    // Shrub layer
    const shData = shrubLayerData[selectedPlot];
    if (!shData || shData.length === 0) {
        tableShrub.innerHTML = `<div class="damage-empty-state">${t('status_no_shrub')}</div>`;
    } else {
        let html = `<table><thead>
            <tr>
                <th rowspan="2">${t('shrub_species')}</th>
                <th colspan="3" class="text-center">${t('shrub_canopy')}</th>
                <th colspan="3" class="text-center">${t('shrub_hm')}</th>
            </tr>
            <tr>
                <th class="text-center">NFI 2</th><th class="text-center">NFI 3</th><th class="text-center">NFI 4</th>
                <th class="text-center">NFI 2</th><th class="text-center">NFI 3</th><th class="text-center">NFI 4</th>
            </tr>
        </thead><tbody>`;
        shData.forEach(row => {
            html += `<tr>
                <td>${row[2]}</td>
                <td class="text-center">${fmt(row[3])}</td>
                <td class="text-center">${fmt(row[4])}</td>
                <td class="text-center">${fmt(row[5])}</td>
                <td class="text-center">${fmt(row[6])}</td>
                <td class="text-center">${fmt(row[7])}</td>
                <td class="text-center">${fmt(row[8])}</td>
            </tr>`;
        });
        html += `</tbody></table>`;
        tableShrub.innerHTML = html;
    }
}