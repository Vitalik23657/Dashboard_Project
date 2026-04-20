const tooltip = document.getElementById('tooltip');
let globalRawData = []; 
let uniqueEstadillos = new Set(); 
let uniqueSpecies = new Set();

let damageData = { nfi2: {}, nfi3: {}, nfi4: {} };
let qualityData = {}; 
let carbonData = {};

const nfiColors = {
    '2': '#4A90A4',
    '3': '#5BA85A', 
    '4': '#2E6B3E' 
};

const speciesColorMap = {};

const qualityColors = {
    '1': '#1b5e20', '2': '#4caf50', '3': '#8bc34a', 
    '4': '#ffc107', '5': '#ff9800', '6': '#d32f2f', 'NA': '#9e9e9e' 
};

function getDamageColor(damageType) {
    const d = damageType.toLowerCase();
    if (d.includes('no damage')) return '#4CAF50'; 
    if (d.includes('competition')) return '#FF9800'; 
    if (d.includes('fire')) return '#D84315'; 
    if (d.includes('insects') || d.includes('fungi') || d.includes('biotic')) return '#d32f2f'; 
    return '#78909c'; 
}

const badgeElement = document.getElementById('growth-badge');
const dropdownElement = document.getElementById('growth-dropdown');

badgeElement.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownElement.classList.toggle('show');
});

document.addEventListener('click', (e) => {
    if (!dropdownElement.contains(e.target) && e.target !== badgeElement) {
        dropdownElement.classList.remove('show');
    }
});

function showTooltip(e, htmlContent) {
    tooltip.innerHTML = htmlContent;
    tooltip.style.opacity = '1';
    tooltip.style.left = e.pageX + 'px';
    tooltip.style.top = e.pageY + 'px';
}

function hideTooltip() { tooltip.style.opacity = '0'; }

const STORAGE_KEY = 'forestDashboard_selectedPlot';

function saveSelectedPlot(plot) {
    try {
        localStorage.setItem(STORAGE_KEY, plot);
    } catch (e) {
        // localStorage unavailable (e.g. private mode), fail silently
    }
}

function loadSelectedPlot() {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
        return null;
    }
}

async function loadData() {
    try {
        const [resVol, resD2, resD3, resD4, resQual, resCarb] = await Promise.all([
            fetch('../Plot_Data_EN/Plot_3_FORESTSTOCKS/PlotForestStocks_EN.csv'),
            fetch('../Plot_Data_EN/Plot_4_FORESTDAMAGE/DamageNFI2_EN.csv'),
            fetch('../Plot_Data_EN/Plot_4_FORESTDAMAGE/DamageNFI3_EN.csv'),
            fetch('../Plot_Data_EN/Plot_4_FORESTDAMAGE/DamageNFI4_EN.csv'),
            fetch('../Plot_Data_EN/Plot_5_WOODQUALITY/PlotQuality_EN.csv'),
            fetch('../Plot_Data_EN/Plot_6_CARBON/PlotCarbon_EN.csv')
        ]);
        
        const csvVol = await resVol.text();
        const csvD2 = await resD2.text();
        const csvD3 = await resD3.text();
        const csvD4 = await resD4.text();
        const csvQual = await resQual.text();
        const csvCarb = await resCarb.text();
        
        parseRawData(csvVol);
        parseDamageNFI2(csvD2);
        parseDamageNFI34(csvD3, 'nfi3');
        parseDamageNFI34(csvD4, 'nfi4');
        parseQualityData(csvQual);
        parseCarbonData(csvCarb);
        
        assignSpeciesColors();
        populateDropdown();
        renderQualityLegend(); 

        // Restore last selected plot, or fall back to the first available
        const savedPlot = loadSelectedPlot();
        const sortedPlots = Array.from(uniqueEstadillos).sort((a, b) => parseInt(a) - parseInt(b));
        const plotToSelect = (savedPlot && uniqueEstadillos.has(savedPlot)) ? savedPlot : sortedPlots[0];

        const select = document.getElementById('estadillo-filter');
        select.value = plotToSelect;
        updateDashboard(plotToSelect);
        
        select.addEventListener('change', (e) => {
            saveSelectedPlot(e.target.value);
            updateDashboard(e.target.value);
        });

    } catch (error) {
        console.error("Error loading CSV files.", error);
    }
}

function parseRawData(csvText) {
    const lines = csvText.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row || row.length < 15) continue;

        const estadillo = row[0].trim();
        const speciesName = row[4].replace(/"/g, '').trim(); 
        
        uniqueEstadillos.add(estadillo);
        if (speciesName) uniqueSpecies.add(speciesName);

        globalRawData.push({
            estadillo: estadillo,
            species: speciesName,
            dc: parseInt(row[5].trim()),
            n2: parseFloat(row[6]) || 0, n3: parseFloat(row[9]) || 0, n4: parseFloat(row[12]) || 0,
            ba2: parseFloat(row[7]) || 0, ba3: parseFloat(row[10]) || 0, ba4: parseFloat(row[13]) || 0,
            v2: parseFloat(row[8]) || 0, v3: parseFloat(row[11]) || 0, v4: parseFloat(row[14]) || 0
        });
    }
}

function parseDamageNFI2(csvText) {
    const lines = csvText.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row || row.length < 4) continue;
        const estadillo = row[0].trim();
        const damageString = row[3].replace(/"/g, '').trim();
        damageData.nfi2[estadillo] = damageString;
    }
}

function parseDamageNFI34(csvText, nfiKey) {
    const lines = csvText.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row || row.length < 8) continue;
        
        const estadillo = row[0].trim();
        const damageName = row[4].replace(/"/g, '').trim();
        const treesDamaged = parseFloat(row[5]) || 0;
        const totalTrees = parseFloat(row[6]) || 0;
        const percentage = parseFloat(row[7]) || 0;

        if (!damageData[nfiKey][estadillo]) {
            damageData[nfiKey][estadillo] = [];
        }
        damageData[nfiKey][estadillo].push({
            damage: damageName,
            treesDamaged: treesDamaged,
            totalTrees: totalTrees,
            pct: percentage
        });
    }
}

function parseQualityData(csvText) {
    const lines = csvText.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row || row.length < 13) continue;

        const estadillo = row[0].trim();
        const qClass = row[3].replace(/"/g, '').trim();
        
        if (!qualityData[estadillo]) qualityData[estadillo] = {};
        
        const parseNum = (val) => val === 'NA' ? 0 : parseFloat(val) || 0;

        qualityData[estadillo][qClass] = {
            v2: parseNum(row[4]), p2: parseNum(row[6]),
            v3: parseNum(row[7]), p3: parseNum(row[9]),
            v4: parseNum(row[10]), p4: parseNum(row[12])
        };
    }
}

function parseCarbonData(csvText) {
    const lines = csvText.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row || row.length < 21) continue;

        const estadillo = row[0].trim();
        const parseNum = (val) => parseFloat(val) || 0;

        carbonData[estadillo] = {
            nfi2: {
                stem: parseNum(row[3]), branches_large: parseNum(row[4]),
                branches_small: parseNum(row[5]), leaves: parseNum(row[6]),
                roots: parseNum(row[7]), total: parseNum(row[8])
            },
            nfi3: {
                stem: parseNum(row[9]), branches_large: parseNum(row[10]),
                branches_small: parseNum(row[11]), leaves: parseNum(row[12]),
                roots: parseNum(row[13]), total: parseNum(row[14])
            },
            nfi4: {
                stem: parseNum(row[15]), branches_large: parseNum(row[16]),
                branches_small: parseNum(row[17]), leaves: parseNum(row[18]),
                roots: parseNum(row[19]), total: parseNum(row[20])
            }
        };
    }
}

const speciesPalette = ['#E53935', '#F9A825', '#43A047'];

function assignSpeciesColors() {
    Array.from(uniqueSpecies).sort().forEach((species, i) => {
        speciesColorMap[species] = speciesPalette[i % speciesPalette.length];
    });
}

function populateDropdown() {
    const select = document.getElementById('estadillo-filter');
    const sortedPlots = Array.from(uniqueEstadillos).sort((a, b) => parseInt(a) - parseInt(b));
    
    sortedPlots.forEach(plot => {
        const option = document.createElement('option');
        option.value = plot;
        option.textContent = `Plot ${plot}`;
        select.appendChild(option);
    });
}

function updateLegend(activeSpecies) {
    const legendContainer = document.getElementById('species-legend');
    legendContainer.innerHTML = '';

    Array.from(activeSpecies).sort().forEach(species => {
        const color = speciesColorMap[species] || '#999';
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <div class="legend-color" style="background: ${color};"></div>
            <i>${species}</i>
        `;
        legendContainer.appendChild(item);
    });
}

function renderQualityLegend() {
    const legendContainer = document.getElementById('quality-legend');
    for (let i = 1; i <= 6; i++) {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `<div class="legend-color" style="background: ${qualityColors[i]};"></div> Class ${i}`;
        legendContainer.appendChild(item);
    }
}

function updateGrowthStats(data) {
    let totalV2 = 0, totalV3 = 0, totalV4 = 0;
    let speciesGrowth = {};
    let dcShift = { young: 0, medium: 0, mature: 0 }; 

    data.forEach(item => {
        totalV2 += item.total_v2;
        totalV3 += item.total_v3; 
        totalV4 += item.total_v4;

        let netDCVol = item.total_v4 - item.total_v2;
        if (item.dc < 20) dcShift.young += netDCVol;
        else if (item.dc <= 35) dcShift.medium += netDCVol;
        else dcShift.mature += netDCVol;

        const spSet = new Set([...Object.keys(item.v2), ...Object.keys(item.v4)]);
        spSet.forEach(sp => {
            let v2 = item.v2[sp] || 0;
            let v4 = item.v4[sp] || 0;
            if (!speciesGrowth[sp]) speciesGrowth[sp] = 0;
            speciesGrowth[sp] += (v4 - v2);
        });
    });

    const badge = document.getElementById('growth-badge');
    const dropdown = document.getElementById('growth-dropdown');
    let netChange = totalV4 - totalV2;
    
    if (totalV2 === 0 && totalV4 === 0) {
        badge.className = 'growth-badge neutral';
        badge.innerHTML = `NFI 2 → 4 Volume Growth: 0%`;
        dropdown.innerHTML = 'No data available to compare.';
        return;
    }

    let mainSp = null, mainSpVal = 0;
    for (let sp in speciesGrowth) {
        if (Math.abs(speciesGrowth[sp]) > Math.abs(mainSpVal)) {
            mainSpVal = speciesGrowth[sp];
            mainSp = sp;
        }
    }

    let dominantShiftDC = "Young (< 20cm)";
    let maxShiftVal = dcShift.young;
    if (Math.abs(dcShift.medium) > Math.abs(maxShiftVal)) { dominantShiftDC = "Medium (20-35cm)"; maxShiftVal = dcShift.medium; }
    if (Math.abs(dcShift.mature) > Math.abs(maxShiftVal)) { dominantShiftDC = "Mature (> 35cm)"; maxShiftVal = dcShift.mature; }

    let mai = netChange / 20;
    let pctChange = totalV2 === 0 ? 100 : (netChange / totalV2) * 100;
    
    let contextMsg = "";
    if (pctChange < -20) contextMsg = "Severe loss. Likely indicates planned harvesting (clearcutting) or a major natural disturbance.";
    else if (pctChange < 0) contextMsg = "Slight loss due to natural mortality or light thinning.";
    else if (pctChange < 30) contextMsg = "Steady positive growth, typical of an undisturbed, maturing stand.";
    else contextMsg = "Rapid accumulation stage, forest density is increasing significantly.";

    if (pctChange > 0) {
        badge.className = 'growth-badge positive';
        badge.innerHTML = `📈 Vol. Growth (NFI 2→4): +${pctChange.toFixed(1)}% ▾`;
    } else if (pctChange < 0) {
        badge.className = 'growth-badge negative';
        badge.innerHTML = `📉 Vol. Loss (NFI 2→4): ${pctChange.toFixed(1)}% ▾`;
    } else {
        badge.className = 'growth-badge neutral';
        badge.innerHTML = `Vol. Growth (NFI 2→4): 0% ▾`;
    }

    dropdown.innerHTML = `
        <div style="font-size: 1.05rem; margin-bottom: 8px; font-weight: bold; border-bottom: 1px solid #555; padding-bottom: 6px;">
            Detailed Growth Analysis (NFI 2 to 4)
        </div>
        <div style="margin-bottom: 6px;">
            <strong>1. Absolute Volume:</strong><br>
            <span style="color:#aaa;">NFI 2:</span> ${totalV2.toFixed(1)} m³/ha<br>
            <span style="color:#aaa;">NFI 3:</span> ${totalV3.toFixed(1)} m³/ha<br>
            <span style="color:#aaa;">NFI 4:</span> ${totalV4.toFixed(1)} m³/ha<br>
            <span style="color:${netChange >= 0 ? '#81c784' : '#e57373'};">Net Change: ${netChange > 0 ? '+' : ''}${netChange.toFixed(1)} m³/ha</span>
        </div>
        <div style="margin-bottom: 6px;">
            <strong>2. Primary Species Driver:</strong><br>
            <span class="tooltip-color-box" style="background:${speciesColorMap[mainSp]};"></span> 
            <i>${mainSp}</i> (${mainSpVal > 0 ? '+' : ''}${mainSpVal.toFixed(1)} m³/ha)
        </div>
        <div style="margin-bottom: 6px;">
            <strong>3. Main Shift in Structure:</strong><br>
            Most volume change occurred in <strong>${dominantShiftDC}</strong> trees.
        </div>
        <div style="margin-bottom: 6px;">
            <strong>4. Est. Annual Growth (MAI):</strong><br>
            ~${mai.toFixed(2)} m³/ha per year
        </div>
        <div style="margin-top: 10px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; font-size: 0.8rem; line-height: 1.3;">
            ${contextMsg}
        </div>
    `;
}

function renderDamageStatus(selectedPlot) {
    const nfi2Container = document.getElementById('damage-nfi2');
    if (selectedPlot === "ALL") {
        nfi2Container.innerHTML = `<div class="damage-empty-state">Select a specific plot to see NFI 2 historical status.</div>`;
    } else {
        const d2 = damageData.nfi2[selectedPlot] || "No data recorded";
        let badgeClass = "damage-badge";
        if (d2.toLowerCase().includes("no damage")) badgeClass += " healthy";
        else if (d2.toLowerCase().includes("severe")) badgeClass += " severe";
        else if (d2 !== "No data recorded") badgeClass += " minor";
        
        nfi2Container.innerHTML = `<div class="${badgeClass}">${d2}</div>`;
    }

    const processBarsAndTable = (nfiKey, chartContainerId, tableContainerId) => {
        const chartContainer = document.getElementById(chartContainerId);
        chartContainer.innerHTML = '';
        
        let records = [];
        
        if (selectedPlot === "ALL") {
            let agg = {};
            let totalTreesOverall = 0;
            for (let plot in damageData[nfiKey]) {
                let r = damageData[nfiKey][plot];
                if(r && r.length > 0) {
                    totalTreesOverall += r[0].totalTrees;
                    r.forEach(rec => {
                        if(!agg[rec.damage]) agg[rec.damage] = 0;
                        agg[rec.damage] += rec.treesDamaged;
                    });
                }
            }
            for (let dmg in agg) {
                let pct = totalTreesOverall > 0 ? (agg[dmg] / totalTreesOverall) * 100 : 0;
                records.push({ damage: dmg, treesDamaged: agg[dmg], pct: pct }); 
            }
        } else {
            records = damageData[nfiKey][selectedPlot] || [];
        }

        records.sort((a, b) => b.pct - a.pct);

        if (records.length === 0) {
            chartContainer.innerHTML = `<div class="damage-empty-state">No damage data available</div>`;
        } else {
            records.forEach(rec => {
                const row = document.createElement('div');
                row.className = 'damage-row';
                const color = getDamageColor(rec.damage);
                
                row.innerHTML = `
                    <div class="damage-label">
                        <span>${rec.damage}</span>
                        <span>${rec.pct.toFixed(1)}%</span>
                    </div>
                    <div class="damage-bar-bg">
                        <div class="damage-bar-fill" style="width: ${rec.pct}%; background-color: ${color};"></div>
                    </div>
                `;
                chartContainer.appendChild(row);
            });
        }
        
        renderDamageTable(records, tableContainerId);
    };

    processBarsAndTable('nfi3', 'damage-nfi3', 'view-damage-nfi3-table');
    processBarsAndTable('nfi4', 'damage-nfi4', 'view-damage-nfi4-table');
}

function renderDamageTable(records, containerId) {
    const container = document.getElementById(containerId);
    if (records.length === 0) {
        container.innerHTML = `<div class="damage-empty-state" style="margin-top: 20px;">No damage data available</div>`;
        return;
    }

    let html = `<table>
        <thead>
            <tr>
                <th>Damage Agent</th>
                <th>Trees Affected</th>
                <th>% of Total Plot</th>
            </tr>
        </thead>
        <tbody>`;

    records.forEach(rec => {
        const trees = rec.treesDamaged !== undefined ? rec.treesDamaged.toFixed(1) : '-';
        html += `
            <tr>
                <td>${rec.damage}</td>
                <td>${trees}</td>
                <td>${rec.pct.toFixed(2)}%</td>
            </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function renderQualityChartAndTable(selectedPlot) {
    const chartContainer = document.getElementById('chart-quality');
    const tableContainer = document.getElementById('view-quality-table');
    
    chartContainer.innerHTML = '<div class="y-axis-label">% of Total Volume</div>';
    
    let qData = {};
    
    if (selectedPlot === "ALL") {
        let totals = { v2: 0, v3: 0, v4: 0 };
        for (let plot in qualityData) {
            for (let qc in qualityData[plot]) {
                if (!qData[qc]) qData[qc] = { v2: 0, v3: 0, v4: 0 };
                let d = qualityData[plot][qc];
                qData[qc].v2 += d.v2;
                qData[qc].v3 += d.v3;
                qData[qc].v4 += d.v4;
                totals.v2 += d.v2;
                totals.v3 += d.v3;
                totals.v4 += d.v4;
            }
        }
        for (let qc in qData) {
            qData[qc].p2 = totals.v2 > 0 ? (qData[qc].v2 / totals.v2) * 100 : 0;
            qData[qc].p3 = totals.v3 > 0 ? (qData[qc].v3 / totals.v3) * 100 : 0;
            qData[qc].p4 = totals.v4 > 0 ? (qData[qc].v4 / totals.v4) * 100 : 0;
        }
    } else {
        qData = qualityData[selectedPlot] || {};
    }

    if (Object.keys(qData).length === 0) {
        chartContainer.innerHTML += `<div class="damage-empty-state">No quality data available</div>`;
        tableContainer.innerHTML = `<div class="damage-empty-state">No quality data available</div>`;
        return;
    }

    const nfisArray = [{ key: '2', label: 'NFI 2' }, { key: '3', label: 'NFI 3' }, { key: '4', label: 'NFI 4' }];

    nfisArray.forEach(nfi => {
        const group = document.createElement('div');
        group.className = 'bar-group';
        group.style.margin = '0 10%'; 

        const barContainer = document.createElement('div');
        barContainer.className = 'stacked-bar-container';
        barContainer.style.width = '40%'; 
        barContainer.style.height = '100%'; 
        
        let segments = [];
        for (let qc in qData) {
            let pct = qData[qc][`p${nfi.key}`];
            let vol = qData[qc][`v${nfi.key}`];
            if (pct > 0) segments.push({ class: qc, pct: pct, vol: vol });
        }

        segments.sort((a, b) => parseInt(a.class) - parseInt(b.class));

        let tooltipHtml = `<div style="margin-bottom:6px; border-bottom:1px solid #555; padding-bottom:4px;">
            <strong>${nfi.label} Quality Breakdown</strong>
        </div>`;

        segments.forEach(seg => {
            const segmentDiv = document.createElement('div');
            segmentDiv.className = 'bar-segment';
            segmentDiv.style.height = `${seg.pct}%`;
            segmentDiv.style.backgroundColor = qualityColors[seg.class] || '#999';
            
            barContainer.appendChild(segmentDiv);
            
            tooltipHtml += `<div><span class="tooltip-color-box" style="background:${qualityColors[seg.class] || '#999'}"></span>Class ${seg.class}: ${seg.pct.toFixed(1)}% (${seg.vol.toFixed(1)} m³/ha)</div>`;
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
        <thead>
            <tr>
                <th>Quality Class</th>
                <th>NFI 2 (%)</th>
                <th>NFI 2 (m³)</th>
                <th>NFI 3 (%)</th>
                <th>NFI 3 (m³)</th>
                <th>NFI 4 (%)</th>
                <th>NFI 4 (m³)</th>
            </tr>
        </thead>
        <tbody>`;

    Object.keys(qData).sort().forEach(qc => {
        html += `
            <tr>
                <td>Class ${qc}</td>
                <td>${qData[qc].p2.toFixed(1)}%</td>
                <td style="color:#777">${qData[qc].v2.toFixed(2)}</td>
                <td>${qData[qc].p3.toFixed(1)}%</td>
                <td style="color:#777">${qData[qc].v3.toFixed(2)}</td>
                <td>${qData[qc].p4.toFixed(1)}%</td>
                <td style="color:#777">${qData[qc].v4.toFixed(2)}</td>
            </tr>`;
    });

    html += `</tbody></table>`;
    tableContainer.innerHTML = html;
}

function renderCarbonData(selectedPlot) {
    const chartContainer = document.getElementById('chart-carbon');
    const tableContainer = document.getElementById('table-carbon');
    
    let cData = {};

    if (selectedPlot === "ALL") {
        cData = { nfi2: { stem:0, branches_large:0, branches_small:0, leaves:0, roots:0, total:0 },
                  nfi3: { stem:0, branches_large:0, branches_small:0, leaves:0, roots:0, total:0 },
                  nfi4: { stem:0, branches_large:0, branches_small:0, leaves:0, roots:0, total:0 } };
        
        for (let plot in carbonData) {
            ['nfi2', 'nfi3', 'nfi4'].forEach(nfi => {
                for (let part in carbonData[plot][nfi]) {
                    cData[nfi][part] += carbonData[plot][nfi][part];
                }
            });
        }
    } else {
        cData = carbonData[selectedPlot];
    }

    if (!cData || cData.nfi2.total === 0) {
        chartContainer.innerHTML = `<div class="damage-empty-state">No carbon data available</div>`;
        tableContainer.innerHTML = `<div class="damage-empty-state">No carbon data available</div>`;
        return;
    }

    const maxVal = Math.max(cData.nfi2.total, cData.nfi3.total, cData.nfi4.total);
    const yPad = 40;
    const w = 400, h = 250; 
    
    const getY = (val) => h - yPad - ((val / maxVal) * (h - yPad * 2));
    
    const x2 = 50, x3 = 200, x4 = 350;
    const y2 = getY(cData.nfi2.total);
    const y3 = getY(cData.nfi3.total);
    const y4 = getY(cData.nfi4.total);

    chartContainer.innerHTML = `
        <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}">
            <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#4CAF50"/>
                    <stop offset="100%" stop-color="#2196F3"/>
                </linearGradient>
            </defs>
            
            <line x1="40" y1="${getY(maxVal)}" x2="380" y2="${getY(maxVal)}" stroke="#eee" stroke-dasharray="4"/>
            <line x1="40" y1="${getY(maxVal/2)}" x2="380" y2="${getY(maxVal/2)}" stroke="#eee" stroke-dasharray="4"/>
            <line x1="40" y1="${getY(0)}" x2="380" y2="${getY(0)}" stroke="#888"/>
            
            <path d="M${x2},${y2} L${x3},${y3} L${x4},${y4}" fill="none" stroke="url(#lineGrad)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            
            <circle cx="${x2}" cy="${y2}" r="6" fill="white" stroke="#4CAF50" stroke-width="3"/>
            <circle cx="${x3}" cy="${y3}" r="6" fill="white" stroke="#388E3C" stroke-width="3"/>
            <circle cx="${x4}" cy="${y4}" r="6" fill="white" stroke="#2196F3" stroke-width="3"/>
            
            <text x="${x2}" y="${y2 - 15}" text-anchor="middle" font-size="12" font-weight="bold" fill="#333">${cData.nfi2.total.toFixed(1)} t</text>
            <text x="${x3}" y="${y3 - 15}" text-anchor="middle" font-size="12" font-weight="bold" fill="#333">${cData.nfi3.total.toFixed(1)} t</text>
            <text x="${x4}" y="${y4 - 15}" text-anchor="middle" font-size="12" font-weight="bold" fill="#333">${cData.nfi4.total.toFixed(1)} t</text>
            
            <text x="${x2}" y="${h - 10}" text-anchor="middle" font-size="12" fill="#777">NFI 2</text>
            <text x="${x3}" y="${h - 10}" text-anchor="middle" font-size="12" fill="#777">NFI 3</text>
            <text x="${x4}" y="${h - 10}" text-anchor="middle" font-size="12" fill="#777">NFI 4</text>
        </svg>
    `;

    let html = `<table>
        <thead>
            <tr>
                <th>Biomass Component</th>
                <th>NFI 2 (t/ha)</th>
                <th>NFI 3 (t/ha)</th>
                <th>NFI 4 (t/ha)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Stem</td>
                <td>${cData.nfi2.stem.toFixed(2)}</td>
                <td>${cData.nfi3.stem.toFixed(2)}</td>
                <td>${cData.nfi4.stem.toFixed(2)}</td>
            </tr>
            <tr>
                <td>Branches > 7cm</td>
                <td>${cData.nfi2.branches_large.toFixed(2)}</td>
                <td>${cData.nfi3.branches_large.toFixed(2)}</td>
                <td>${cData.nfi4.branches_large.toFixed(2)}</td>
            </tr>
            <tr>
                <td>Branches 2-7cm</td>
                <td>${cData.nfi2.branches_small.toFixed(2)}</td>
                <td>${cData.nfi3.branches_small.toFixed(2)}</td>
                <td>${cData.nfi4.branches_small.toFixed(2)}</td>
            </tr>
            <tr>
                <td>Leaves & Fine Branches</td>
                <td>${cData.nfi2.leaves.toFixed(2)}</td>
                <td>${cData.nfi3.leaves.toFixed(2)}</td>
                <td>${cData.nfi4.leaves.toFixed(2)}</td>
            </tr>
            <tr>
                <td>Roots</td>
                <td>${cData.nfi2.roots.toFixed(2)}</td>
                <td>${cData.nfi3.roots.toFixed(2)}</td>
                <td>${cData.nfi4.roots.toFixed(2)}</td>
            </tr>
        </tbody>
        <tfoot>
            <tr style="background-color: #f0f0f0; font-weight: bold;">
                <td>TOTAL CARBON</td>
                <td>${cData.nfi2.total.toFixed(2)}</td>
                <td>${cData.nfi3.total.toFixed(2)}</td>
                <td>${cData.nfi4.total.toFixed(2)}</td>
            </tr>
        </tfoot>
    </table>`;
    
    tableContainer.innerHTML = html;
}

function updateDashboard(selectedPlot) {
    const filteredRows = selectedPlot === "ALL" 
        ? globalRawData 
        : globalRawData.filter(row => row.estadillo === selectedPlot);

    const activeSpecies = new Set();
    const dataMap = {}; 

    filteredRows.forEach(row => {
        if (!dataMap[row.dc]) {
            dataMap[row.dc] = { 
                n2: {}, n3: {}, n4: {}, 
                ba2: {}, ba3: {}, ba4: {}, 
                v2: {}, v3: {}, v4: {},
                total_n2: 0, total_n3: 0, total_n4: 0,
                total_ba2: 0, total_ba3: 0, total_ba4: 0,
                total_v2: 0, total_v3: 0, total_v4: 0
            };
        }

        const dcMap = dataMap[row.dc];
        const sp = row.species;

        if (row.n2 > 0 || row.n3 > 0 || row.n4 > 0 || row.ba2 > 0 || row.ba3 > 0 || row.ba4 > 0 || row.v2 > 0 || row.v3 > 0 || row.v4 > 0) {
            activeSpecies.add(sp);
        }

        const initSp = (metric) => { if(!dcMap[metric][sp]) dcMap[metric][sp] = 0; }
        
        initSp('n2'); initSp('n3'); initSp('n4');
        initSp('ba2'); initSp('ba3'); initSp('ba4');
        initSp('v2'); initSp('v3'); initSp('v4');

        dcMap.n2[sp] += row.n2; dcMap.n3[sp] += row.n3; dcMap.n4[sp] += row.n4;
        dcMap.ba2[sp] += row.ba2; dcMap.ba3[sp] += row.ba3; dcMap.ba4[sp] += row.ba4;
        dcMap.v2[sp] += row.v2; dcMap.v3[sp] += row.v3; dcMap.v4[sp] += row.v4;

        dcMap.total_n2 += row.n2; dcMap.total_n3 += row.n3; dcMap.total_n4 += row.n4;
        dcMap.total_ba2 += row.ba2; dcMap.total_ba3 += row.ba3; dcMap.total_ba4 += row.ba4;
        dcMap.total_v2 += row.v2; dcMap.total_v3 += row.v3; dcMap.total_v4 += row.v4;
    });

    updateLegend(activeSpecies);

    const finalData = Object.keys(dataMap)
        .map(dc => ({ dc: parseInt(dc), ...dataMap[dc] }))
        .sort((a, b) => a.dc - b.dc);

    updateGrowthStats(finalData);

    renderStackedChart(finalData, 'chart-density', 'n', 'Trees/ha');
    renderStackedChart(finalData, 'chart-basal', 'ba', 'm²/ha');
    renderStackedChart(finalData, 'chart-volume', 'v', 'm³/ha');

    renderTable(finalData, 'view-density-table', 'n', 'Trees/ha');
    renderTable(finalData, 'view-basal-table', 'ba', 'm²/ha');
    renderTable(finalData, 'view-volume-table', 'v', 'm³/ha');
    
    renderDamageStatus(selectedPlot);
    renderQualityChartAndTable(selectedPlot);
    renderCarbonData(selectedPlot);
}

function renderStackedChart(data, containerId, metricPrefix, yLabelText) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="y-axis-label">${yLabelText}</div>`;

    if (data.length === 0) {
        container.innerHTML += `<div style="margin: auto; color: #888;">No data for this plot</div>`;
        return;
    }

    let maxTotal = 0;
    data.forEach(item => {
        const localMax = Math.max(item[`total_${metricPrefix}2`], item[`total_${metricPrefix}3`], item[`total_${metricPrefix}4`]);
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
            
            const containerHeightPercent = (totalVal / maxTotal) * 100;
            barContainer.style.height = `${containerHeightPercent}%`;
            if (containerHeightPercent === 0) barContainer.style.minHeight = '1px';

            const nfiNum = nfiKey.slice(-1);
            const barColor = nfiColors[nfiNum];

            let tooltipHtml = `<div style="margin-bottom:6px; border-bottom:1px solid #555; padding-bottom:4px;">
                <strong>DC ${item.dc} - ${labelName}</strong><br>
                Total: ${totalVal.toFixed(2)} ${yLabelText.split('/')[0]}
            </div>`;

            const speciesObj = item[nfiKey];
            for (const [sp, val] of Object.entries(speciesObj)) {
                if (val > 0) {
                    const segment = document.createElement('div');
                    segment.className = `bar-segment ${patternClass}`;
                    segment.style.height = `${(val / totalVal) * 100}%`;
                    segment.style.backgroundColor = speciesColorMap[sp] || barColor;
                    barContainer.appendChild(segment);
                    tooltipHtml += `<div><span class="tooltip-color-box" style="background:${speciesColorMap[sp] || barColor}"></span>${sp}: ${val.toFixed(2)}</div>`;
                }
            }

            barContainer.addEventListener('mousemove', (e) => showTooltip(e, tooltipHtml));
            barContainer.addEventListener('mouseleave', hideTooltip);
            
            return barContainer;
        };

        group.appendChild(createStackedBar(`${metricPrefix}2`, 'NFI 2', 'nfi2-pattern'));
        group.appendChild(createStackedBar(`${metricPrefix}3`, 'NFI 3', 'nfi3-pattern'));
        group.appendChild(createStackedBar(`${metricPrefix}4`, 'NFI 4', 'nfi4-pattern'));

        const label = document.createElement('div');
        label.className = 'x-axis-label';
        label.innerText = item.dc;
        group.appendChild(label);

        const subLabels = document.createElement('div');
        subLabels.className = 'sub-labels';
        subLabels.innerHTML = '<span>2</span><span>3</span><span>4</span>';
        group.appendChild(subLabels);

        container.appendChild(group);
    });
}

function toggleView(type, btn) {
    const chartView = document.getElementById(`view-${type}-chart`);
    const tableView = document.getElementById(`view-${type}-table`);

    if (chartView.classList.contains('active')) {
        chartView.classList.remove('active');
        tableView.classList.add('active');
        btn.textContent = 'View Visuals';
    } else {
        chartView.classList.add('active');
        tableView.classList.remove('active');
        btn.textContent = 'View Table';
    }
}

function renderTable(data, containerId, metric, unit) {
    const container = document.getElementById(containerId);
    if (data.length === 0) { container.innerHTML = "No data"; return; }

    let html = `<table>
        <thead>
            <tr>
                <th>DC (cm)</th>
                <th>NFI 2 (${unit})</th>
                <th>NFI 3 (${unit})</th>
                <th>NFI 4 (${unit})</th>
            </tr>
        </thead>
        <tbody>`;

    data.forEach(row => {
        html += `
            <tr>
                <td>${row.dc}</td>
                <td>${row[`total_${metric}2`].toFixed(2)}</td>
                <td>${row[`total_${metric}3`].toFixed(2)}</td>
                <td>${row[`total_${metric}4`].toFixed(2)}</td>
            </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            navLinks.forEach(l => l.classList.remove('active'));
            
            this.classList.add('active');

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
});

loadData();