const tooltip = document.getElementById('tooltip');
let globalRawData = []; 
let uniqueEstadillos = new Set(); 
let uniqueSpecies = new Set();

let disabledSpecies = new Set();

let damageData = { nfi2: {}, nfi3: {}, nfi4: {} };
let qualityData = {}; 
let carbonData = {};
let qualityDescriptions = {};

let statusData = {};
let treeLayerData = {};
let shrubLayerData = {};
let disabledNFIs = new Set();

const speciesPalette = [
    '#EF9A9A', '#B71C1C', '#D500F9', '#76FF03', '#69F0AE', 
    '#00BCD4', '#FF9800', '#795548', '#607D8B', '#8BC34A',
    '#FFEA00', '#3F51B5', '#009688', '#827717', '#FF5722',
    '#3E2723', '#FF4081', '#263238'
];
const speciesColorMap = {};

const qualityColors = {
    '1': '#1b5e20', '2': '#4caf50', '3': '#8bc34a', 
    '4': '#ffc107', '5': '#ff9800', '6': '#d32f2f', 'NA': '#9e9e9e' 
};

// ── URL routing ──────────────────────────────────────────────
function getPlotFromURL() {
    const match = window.location.hash.match(/^#plot(.+)$/);
    return match ? match[1] : null;
}

function setPlotInURL(plotId) {
    const newHash = plotId === "ALL" ? "" : `#plot${plotId}`;
    history.pushState(null, "", newHash || window.location.pathname);
}

// ── Species dropdown ─────────────────────────────────────────
function toggleSpeciesDropdown() {
    const dd = document.getElementById('species-dropdown');
    const arrow = document.getElementById('species-filter-arrow');
    const isOpen = dd.style.display === 'block';
    dd.style.display = isOpen ? 'none' : 'block';
    arrow.textContent = isOpen ? '▾' : '▴';
}


function toggleNFIDropdown() {
    const dd = document.getElementById('nfi-dropdown');
    const arrow = document.getElementById('nfi-filter-arrow');
    const isOpen = dd.style.display === 'block';
    dd.style.display = isOpen ? 'none' : 'block';
    arrow.textContent = isOpen ? '▾' : '▴';
}

function selectAllNFI() {
    disabledNFIs.clear();
    renderNFILegend();
    updateDashboard(document.getElementById('estadillo-filter').value);
}

function deselectAllNFI() {
    disabledNFIs.add('nfi2');
    disabledNFIs.add('nfi3');
    disabledNFIs.add('nfi4');
    renderNFILegend();
    updateDashboard(document.getElementById('estadillo-filter').value);
}

function renderNFILegend() {
    const container = document.getElementById('nfi-legend');
    container.innerHTML = '';

    const nfis = [
        { key: 'nfi2', label: 'NFI 2', patternClass: 'nfi2-pattern' },
        { key: 'nfi3', label: 'NFI 3', patternClass: 'nfi3-pattern' },
        { key: 'nfi4', label: 'NFI 4', patternClass: 'nfi4-pattern' }
    ];

    nfis.forEach(({ key, label, patternClass }) => {
        const item = document.createElement('div');
        item.style.cssText = 'display:flex; align-items:center; gap:10px; padding:7px 14px; cursor:pointer; transition:background 0.15s;';
        item.onmouseenter = () => item.style.background = '#f5f5f5';
        item.onmouseleave = () => item.style.background = '';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !disabledNFIs.has(key);
        checkbox.style.cssText = 'width:15px; height:15px; cursor:pointer; flex-shrink:0;';

        const patternBox = document.createElement('div');
        patternBox.className = `nfi-legend-box ${patternClass}`;
        patternBox.style.flexShrink = '0';

        const labelEl = document.createElement('span');
        labelEl.innerText = label;
        labelEl.style.cssText = 'font-size:13px; white-space:nowrap; color:' +
            (disabledNFIs.has(key) ? '#aaa' : '#222') + ';' +
            (disabledNFIs.has(key) ? 'text-decoration:line-through;' : '');

        item.appendChild(checkbox);
        item.appendChild(patternBox);
        item.appendChild(labelEl);

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            if (disabledNFIs.has(key)) disabledNFIs.delete(key);
            else disabledNFIs.add(key);
            renderNFILegend();
            updateDashboard(document.getElementById('estadillo-filter').value);
        });

        container.appendChild(item);
    });

    // update badge count
    const active = 3 - disabledNFIs.size;
    const badge = document.getElementById('nfi-filter-count');
    badge.textContent = (active === 3) ? 'All 3' : `${active}/3`;
    badge.style.background = (active === 3) ? '#e8f5e9' : '#fff3e0';
    badge.style.color = (active === 3) ? '#2e7d32' : '#e65100';
}

function selectAllSpecies() {
    disabledSpecies.clear();
    updateDashboard(document.getElementById('estadillo-filter').value);
}

function deselectAllSpecies() {
    uniqueSpecies.forEach(sp => disabledSpecies.add(sp));
    updateDashboard(document.getElementById('estadillo-filter').value);
}

// ── Single global click handler ──────────────────────────────
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
    const nfiWrapper = document.getElementById('nfi-filter-wrapper');
    if (nfiWrapper && !nfiWrapper.contains(e.target)) {
        const dd = document.getElementById('nfi-dropdown');
        const arrow = document.getElementById('nfi-filter-arrow');
        if (dd) dd.style.display = 'none';
        if (arrow) arrow.textContent = '▾';
    }
    const wrapper = document.getElementById('species-filter-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        const dd = document.getElementById('species-dropdown');
        const arrow = document.getElementById('species-filter-arrow');
        if (dd) dd.style.display = 'none';
        if (arrow) arrow.textContent = '▾';
    }
});

function getDamageColor(damageType) {
    const d = damageType.toLowerCase();
    if (d.includes('no damage')) return '#4CAF50'; 
    if (d.includes('competition')) return '#FF9800'; 
    if (d.includes('fire')) return '#D84315'; 
    if (d.includes('insects') || d.includes('fungi') || d.includes('biotic')) return '#d32f2f'; 
    return '#78909c'; 
}

function showTooltip(e, htmlContent) {
    tooltip.innerHTML = htmlContent;
    tooltip.style.opacity = '1';
    tooltip.style.left = e.pageX + 'px';
    tooltip.style.top = e.pageY + 'px';
}

function hideTooltip() { tooltip.style.opacity = '0'; }

// ── Data loading ─────────────────────────────────────────────
async function loadData() {
    try {
        const [resVol, resD2, resD3, resD4, resQual, resCarb, resQualDesc, resStatus, resTree, resShrub] = await Promise.all([
            fetch('../Plot_Data_EN/Plot_3_FORESTSTOCKS/PlotForestStocks_EN.csv'),
            fetch('../Plot_Data_EN/Plot_4_FORESTDAMAGE/DamageNFI2_EN.csv'),
            fetch('../Plot_Data_EN/Plot_4_FORESTDAMAGE/DamageNFI3_EN.csv'),
            fetch('../Plot_Data_EN/Plot_4_FORESTDAMAGE/DamageNFI4_EN.csv'),
            fetch('../Plot_Data_EN/Plot_5_WOODQUALITY/PlotQuality_EN.csv'),
            fetch('../Plot_Data_EN/Plot_6_CARBON/PlotCarbon_EN.csv'),
            fetch('../Plot_Data_EN/Plot_5_WOODQUALITY/WoodQualityDescription.csv'),
            fetch('../Plot_Data_EN/Plot_7_FORESTSTATUS/Plot_ForestEstatus_EN.csv'),
            fetch('../Plot_Data_EN/Plot_7_FORESTSTATUS/PlotTreeLayer_EN.csv'),
            fetch('../Plot_Data_EN/Plot_7_FORESTSTATUS/PlotShrubLayer_EN.csv')
        ]);

        parseRawData(await resVol.text());
        parseDamageNFI2(await resD2.text());
        parseDamageNFI34(await resD3.text(), 'nfi3');
        parseDamageNFI34(await resD4.text(), 'nfi4');
        parseQualityData(await resQual.text());
        parseCarbonData(await resCarb.text());
        parseQualityDescriptions(await resQualDesc.text());
        parseStatusData(await resStatus.text());
        parseTreeLayerData(await resTree.text());   
        parseShrubLayerData(await resShrub.text());

        assignSpeciesColors();
        populateDropdown();
        renderQualityLegend();
        renderQualityDefinitions();
        renderNFILegend();

        const urlPlot = getPlotFromURL();
        const sortedPlots = Array.from(uniqueEstadillos).sort((a, b) => parseInt(a) - parseInt(b));
        const initialPlot = urlPlot && uniqueEstadillos.has(urlPlot) ? urlPlot : sortedPlots[0];
        document.getElementById('estadillo-filter').value = initialPlot;
        updateDashboard(initialPlot);

        document.getElementById('estadillo-filter').addEventListener('change', (e) => {
            disabledSpecies.clear();
            setPlotInURL(e.target.value);
            updateDashboard(e.target.value);
        });

        window.addEventListener('popstate', () => {
            const plot = getPlotFromURL();
            const select = document.getElementById('estadillo-filter');
            const value = plot && uniqueEstadillos.has(plot) ? plot : "ALL";
            select.value = value;
            disabledSpecies.clear();
            updateDashboard(value);
        });

    } catch (error) {
        console.error("Error loading CSV files.", error);
    }
}

// ── Parsers ──────────────────────────────────────────────────
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
            estadillo, species: speciesName, dc: parseInt(row[5].trim()),
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
        damageData.nfi2[row[0].trim()] = row[3].replace(/"/g, '').trim();
    }
}

function parseDamageNFI34(csvText, nfiKey) {
    const lines = csvText.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row || row.length < 8) continue;
        const estadillo = row[0].trim();
        if (!damageData[nfiKey][estadillo]) damageData[nfiKey][estadillo] = [];
        damageData[nfiKey][estadillo].push({
            damage: row[4].replace(/"/g, '').trim(),
            treesDamaged: parseFloat(row[5]) || 0,
            totalTrees: parseFloat(row[6]) || 0,
            pct: parseFloat(row[7]) || 0
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
        const p = (val) => parseFloat(val) || 0;
        carbonData[estadillo] = {
            nfi2: { stem: p(row[3]), branches_large: p(row[4]), branches_small: p(row[5]), leaves: p(row[6]), roots: p(row[7]), total: p(row[8]) },
            nfi3: { stem: p(row[9]), branches_large: p(row[10]), branches_small: p(row[11]), leaves: p(row[12]), roots: p(row[13]), total: p(row[14]) },
            nfi4: { stem: p(row[15]), branches_large: p(row[16]), branches_small: p(row[17]), leaves: p(row[18]), roots: p(row[19]), total: p(row[20]) }
        };
    }
}

function parseQualityDescriptions(csvText) {
    const lines = csvText.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const match = line.match(/^(\d+),\s*"([^"]+)"/);
        if (match) qualityDescriptions[match[1]] = match[2];
    }
}

const cleanVal = (val) => {
    if (!val || val === 'NA' || val === '"NA"') return '-';
    return val.replace(/"/g, '').trim();
};

function parseStatusData(csvText) {
    const lines = csvText.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row || row.length < 45) continue;
        statusData[row[0].trim()] = row.map(cleanVal);
    }
}

function parseTreeLayerData(csvText) {
    const lines = csvText.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row || row.length < 31) continue;
        const estadillo = row[0].trim();
        if (!treeLayerData[estadillo]) treeLayerData[estadillo] = [];
        treeLayerData[estadillo].push(row.map(cleanVal));
    }
}

function parseShrubLayerData(csvText) {
    const lines = csvText.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row || row.length < 9) continue;
        const estadillo = row[0].trim();
        if (!shrubLayerData[estadillo]) shrubLayerData[estadillo] = [];
        shrubLayerData[estadillo].push(row.map(cleanVal));
    }
}

// ── Setup ────────────────────────────────────────────────────
function assignSpeciesColors() {
    Array.from(uniqueSpecies).sort().forEach((species, i) => {
        speciesColorMap[species] = speciesPalette[i % speciesPalette.length];
    });
}

function populateDropdown() {
    const select = document.getElementById('estadillo-filter');
    Array.from(uniqueEstadillos).sort((a, b) => parseInt(a) - parseInt(b)).forEach(plot => {
        const option = document.createElement('option');
        option.value = plot;
        option.textContent = `Plot ${plot}`;
        select.appendChild(option);
    });
}

// ── Species legend (dropdown) ────────────────────────────────
function updateLegend(activeSpecies) {
    const legendContainer = document.getElementById('species-legend');
    legendContainer.innerHTML = '';

    const speciesToDisplay = Array.from(uniqueSpecies).filter(s => activeSpecies.has(s)).sort();

    if (speciesToDisplay.length === 0) {
        legendContainer.innerHTML = '<span style="padding:8px 14px; color:#888; font-size:13px;">No species data</span>';
        updateSpeciesCount(0, 0);
        return;
    }

    speciesToDisplay.forEach(species => {
        const item = document.createElement('div');
        item.style.cssText = 'display:flex; align-items:center; gap:10px; padding:7px 14px; cursor:pointer; transition:background 0.15s;';
        item.onmouseenter = () => item.style.background = '#f5f5f5';
        item.onmouseleave = () => item.style.background = '';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !disabledSpecies.has(species);
        checkbox.style.cssText = 'width:15px; height:15px; cursor:pointer; flex-shrink:0;';
        checkbox.style.accentColor = speciesColorMap[species];

        const colorBox = document.createElement('div');
        colorBox.style.cssText = 'width:13px; height:13px; border-radius:3px; flex-shrink:0; background:' + speciesColorMap[species] + ';';

        const label = document.createElement('span');
        label.innerText = species;
        label.style.cssText = 'font-size:13px; white-space:nowrap; color:' +
            (disabledSpecies.has(species) ? '#aaa' : '#222') + ';' +
            (disabledSpecies.has(species) ? 'text-decoration:line-through;' : '');

        item.appendChild(checkbox);
        item.appendChild(colorBox);
        item.appendChild(label);

        item.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent closing dropdown
            if (disabledSpecies.has(species)) disabledSpecies.delete(species);
            else disabledSpecies.add(species);
            updateDashboard(document.getElementById('estadillo-filter').value);
        });

        legendContainer.appendChild(item);
    });

    const active = speciesToDisplay.filter(s => !disabledSpecies.has(s)).length;
    updateSpeciesCount(active, speciesToDisplay.length);
}

function updateSpeciesCount(active, total) {
    const badge = document.getElementById('species-filter-count');
    if (!badge) return;
    badge.textContent = (active === total) ? ('All ' + total) : (active + '/' + total);
    badge.style.background = (active === total) ? '#e8f5e9' : '#fff3e0';
    badge.style.color = (active === total) ? '#2e7d32' : '#e65100';
}

// ── Quality legend & definitions ─────────────────────────────
function renderQualityLegend() {
    const legendContainer = document.getElementById('quality-legend');
    legendContainer.innerHTML = '';
    for (let i = 1; i <= 6; i++) {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.style.cursor = 'help';
        item.innerHTML = `<div class="legend-color" style="background:${qualityColors[i]};"></div> Class ${i}`;
        if (qualityDescriptions[i]) {
            const tooltipHtml = `<div style="max-width:250px;white-space:normal;line-height:1.4;"><strong>Quality Class ${i}</strong><br><span style="color:#ddd;font-size:0.8rem;display:inline-block;margin-top:4px;">${qualityDescriptions[i]}</span></div>`;
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
        if (qualityDescriptions[i]) {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.gap = '12px';
            row.style.alignItems = 'flex-start';
            row.innerHTML = `
                <div style="flex-shrink:0;display:flex;align-items:center;gap:6px;width:85px;font-weight:bold;color:#333;">
                    <div class="legend-color" style="background:${qualityColors[i]};"></div> Class ${i}
                </div>
                <div style="color:#555;line-height:1.4;">${qualityDescriptions[i]}</div>`;
            container.appendChild(row);
        }
    }
}

// ── Growth stats ─────────────────────────────────────────────
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
            if (!speciesGrowth[sp]) speciesGrowth[sp] = 0;
            speciesGrowth[sp] += (item.v4[sp] || 0) - (item.v2[sp] || 0);
        });
    });

    const badge = document.getElementById('growth-badge');
    const dropdown = document.getElementById('growth-dropdown');
    let netChange = totalV4 - totalV2;

    if (totalV2 === 0 && totalV4 === 0) {
        badge.className = 'growth-badge neutral';
        badge.innerHTML = 'NFI 2 → 4 Volume Growth: 0%';
        dropdown.innerHTML = 'No data available or all species filtered out.';
        return;
    }

    let mainSp = null, mainSpVal = 0;
    for (let sp in speciesGrowth) {
        if (Math.abs(speciesGrowth[sp]) > Math.abs(mainSpVal)) { mainSpVal = speciesGrowth[sp]; mainSp = sp; }
    }

    let dominantShiftDC = "Young (< 20cm)", maxShiftVal = dcShift.young;
    if (Math.abs(dcShift.medium) > Math.abs(maxShiftVal)) { dominantShiftDC = "Medium (20-35cm)"; maxShiftVal = dcShift.medium; }
    if (Math.abs(dcShift.mature) > Math.abs(maxShiftVal)) { dominantShiftDC = "Mature (> 35cm)"; maxShiftVal = dcShift.mature; }

    let mai = netChange / 30;
    let pctChange = totalV2 === 0 ? 100 : (netChange / totalV2) * 100;

    let contextMsg = "";
    if (pctChange < -30) contextMsg = "Severe loss. Likely indicates planned harvesting (clearcutting) or a major natural disturbance.";
    else if (pctChange < 0) contextMsg = "Slight to moderate loss, typical of natural mortality or standard selective thinning.";
    else if (pctChange < 70) contextMsg = "Steady positive growth, typical of an undisturbed, maturing stand over this timeframe.";
    else contextMsg = "Rapid accumulation stage. Exceptionally fast-growing or dense regenerating forest.";

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
        <div style="font-size:1.05rem;margin-bottom:8px;font-weight:bold;border-bottom:1px solid #555;padding-bottom:6px;">Detailed Growth Analysis (NFI 2 to 4)</div>
        <div style="margin-bottom:6px;">
            <strong>1. Absolute Volume:</strong><br>
            <span style="color:#aaa;">NFI 2:</span> ${totalV2.toFixed(1)} m³/ha<br>
            <span style="color:#aaa;">NFI 3:</span> ${totalV3.toFixed(1)} m³/ha<br>
            <span style="color:#aaa;">NFI 4:</span> ${totalV4.toFixed(1)} m³/ha<br>
            <span style="color:${netChange >= 0 ? '#81c784' : '#e57373'};">Net Change: ${netChange > 0 ? '+' : ''}${netChange.toFixed(1)} m³/ha</span>
        </div>
        <div style="margin-bottom:6px;">
            <strong>2. Primary Species Driver:</strong><br>
            <span class="tooltip-color-box" style="background:${speciesColorMap[mainSp]};"></span>
            <i>${mainSp}</i> (${mainSpVal > 0 ? '+' : ''}${mainSpVal.toFixed(1)} m³/ha)
        </div>
        <div style="margin-bottom:6px;">
            <strong>3. Main Shift in Structure:</strong><br>
            Most volume change occurred in <strong>${dominantShiftDC}</strong> trees.
        </div>
        <div style="margin-bottom:6px;">
            <strong>4. Est. Annual Growth (MAI):</strong><br>
            ~${mai.toFixed(2)} m³/ha per year (NOTE: we should consider mortality and ingrowth)
        </div>
        <div style="margin-top:10px;padding:8px;background:rgba(255,255,255,0.1);border-radius:4px;font-size:0.8rem;line-height:1.3;">${contextMsg}</div>`;
}

// ── Damage ───────────────────────────────────────────────────
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
            let agg = {}, totalTreesOverall = 0;
            for (let plot in damageData[nfiKey]) {
                let r = damageData[nfiKey][plot];
                if (r && r.length > 0) {
                    totalTreesOverall += r[0].totalTrees;
                    r.forEach(rec => { if (!agg[rec.damage]) agg[rec.damage] = 0; agg[rec.damage] += rec.treesDamaged; });
                }
            }
            for (let dmg in agg) records.push({ damage: dmg, treesDamaged: agg[dmg], pct: totalTreesOverall > 0 ? (agg[dmg] / totalTreesOverall) * 100 : 0 });
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
                row.innerHTML = `
                    <div class="damage-label"><span>${rec.damage}</span><span>${rec.pct.toFixed(1)}%</span></div>
                    <div class="damage-bar-bg"><div class="damage-bar-fill" style="width:${rec.pct}%;background-color:${getDamageColor(rec.damage)};"></div></div>`;
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
    if (records.length === 0) { container.innerHTML = `<div class="damage-empty-state" style="margin-top:20px;">No damage data available</div>`; return; }
    let html = `<table><thead><tr><th>Damage Agent</th><th>Trees Affected</th><th>% of Total Plot</th></tr></thead><tbody>`;
    records.forEach(rec => {
        html += `<tr><td>${rec.damage}</td><td>${rec.treesDamaged !== undefined ? rec.treesDamaged.toFixed(1) : '-'}</td><td>${rec.pct.toFixed(2)}%</td></tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ── Quality ──────────────────────────────────────────────────
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
                qData[qc].v2 += d.v2; qData[qc].v3 += d.v3; qData[qc].v4 += d.v4;
                totals.v2 += d.v2; totals.v3 += d.v3; totals.v4 += d.v4;
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
    [{ key: '2', label: 'NFI 2' }, { key: '3', label: 'NFI 3' }, { key: '4', label: 'NFI 4' }].forEach(nfi => {
        const group = document.createElement('div');
        group.className = 'bar-group';
        group.style.margin = '0 10%';
        const barContainer = document.createElement('div');
        barContainer.className = 'stacked-bar-container';
        barContainer.style.width = '40%';
        barContainer.style.height = '100%';
        let segments = [];
        for (let qc in qData) {
            let pct = qData[qc][`p${nfi.key}`], vol = qData[qc][`v${nfi.key}`];
            if (pct > 0) segments.push({ class: qc, pct, vol });
        }
        segments.sort((a, b) => parseInt(a.class) - parseInt(b.class));
        let tooltipHtml = `<div style="margin-bottom:6px;border-bottom:1px solid #555;padding-bottom:4px;"><strong>${nfi.label} Quality Breakdown</strong></div>`;
        segments.forEach(seg => {
            const div = document.createElement('div');
            div.className = 'bar-segment';
            div.style.height = `${seg.pct}%`;
            div.style.backgroundColor = qualityColors[seg.class] || '#999';
            barContainer.appendChild(div);
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
    let html = `<table><thead><tr><th>Quality Class</th><th>NFI 2 (%)</th><th>NFI 2 (m³/ha)</th><th>NFI 3 (%)</th><th>NFI 3 (m³/ha)</th><th>NFI 4 (%)</th><th>NFI 4 (m³/ha)</th></tr></thead><tbody>`;
    Object.keys(qData).sort().forEach(qc => {
        html += `<tr><td>Class ${qc}</td><td>${qData[qc].p2.toFixed(1)}%</td><td style="color:#777">${qData[qc].v2.toFixed(2)}</td><td>${qData[qc].p3.toFixed(1)}%</td><td style="color:#777">${qData[qc].v3.toFixed(2)}</td><td>${qData[qc].p4.toFixed(1)}%</td><td style="color:#777">${qData[qc].v4.toFixed(2)}</td></tr>`;
    });
    html += `</tbody></table>`;
    tableContainer.innerHTML = html;
}

// ── Carbon ───────────────────────────────────────────────────
function renderCarbonData(selectedPlot) {
    const chartContainer = document.getElementById('chart-carbon');
    const tableContainer = document.getElementById('table-carbon');
    let cData = {};
    if (selectedPlot === "ALL") {
        cData = {
            nfi2: { stem:0, branches_large:0, branches_small:0, leaves:0, roots:0, total:0 },
            nfi3: { stem:0, branches_large:0, branches_small:0, leaves:0, roots:0, total:0 },
            nfi4: { stem:0, branches_large:0, branches_small:0, leaves:0, roots:0, total:0 }
        };
        for (let plot in carbonData) {
            ['nfi2','nfi3','nfi4'].forEach(nfi => { for (let part in carbonData[plot][nfi]) cData[nfi][part] += carbonData[plot][nfi][part]; });
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
    const yPad = 40, w = 400, h = 250;
    const getY = (val) => h - yPad - ((val / maxVal) * (h - yPad * 2));
    const x2 = 50, x3 = 200, x4 = 350;
    const y2 = getY(cData.nfi2.total), y3 = getY(cData.nfi3.total), y4 = getY(cData.nfi4.total);
    chartContainer.innerHTML = `
        <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}">
            <defs><linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#4CAF50"/><stop offset="100%" stop-color="#2196F3"/></linearGradient></defs>
            <line x1="40" y1="${getY(maxVal)}" x2="380" y2="${getY(maxVal)}" stroke="#eee" stroke-dasharray="4"/>
            <line x1="40" y1="${getY(maxVal/2)}" x2="380" y2="${getY(maxVal/2)}" stroke="#eee" stroke-dasharray="4"/>
            <line x1="40" y1="${getY(0)}" x2="380" y2="${getY(0)}" stroke="#888"/>
            <path d="M${x2},${y2} L${x3},${y3} L${x4},${y4}" fill="none" stroke="url(#lineGrad)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="${x2}" cy="${y2}" r="6" fill="white" stroke="#4CAF50" stroke-width="3"/>
            <circle cx="${x3}" cy="${y3}" r="6" fill="white" stroke="#388E3C" stroke-width="3"/>
            <circle cx="${x4}" cy="${y4}" r="6" fill="white" stroke="#2196F3" stroke-width="3"/>
            <text x="${x2}" y="${y2-15}" text-anchor="middle" font-size="12" font-weight="bold" fill="#333">${cData.nfi2.total.toFixed(1)} t/ha</text>
            <text x="${x3}" y="${y3-15}" text-anchor="middle" font-size="12" font-weight="bold" fill="#333">${cData.nfi3.total.toFixed(1)} t/ha</text>
            <text x="${x4}" y="${y4-15}" text-anchor="middle" font-size="12" font-weight="bold" fill="#333">${cData.nfi4.total.toFixed(1)} t/ha</text>
            <text x="${x2}" y="${h-10}" text-anchor="middle" font-size="12" fill="#777">NFI 2</text>
            <text x="${x3}" y="${h-10}" text-anchor="middle" font-size="12" fill="#777">NFI 3</text>
            <text x="${x4}" y="${h-10}" text-anchor="middle" font-size="12" fill="#777">NFI 4</text>
        </svg>`;
    tableContainer.innerHTML = `
        <table>
            <thead><tr><th>Biomass Component</th><th>NFI 2 (t/ha)</th><th>NFI 3 (t/ha)</th><th>NFI 4 (t/ha)</th></tr></thead>
            <tbody>
                <tr><td>Stem</td><td>${cData.nfi2.stem.toFixed(2)}</td><td>${cData.nfi3.stem.toFixed(2)}</td><td>${cData.nfi4.stem.toFixed(2)}</td></tr>
                <tr><td>Branches > 7cm</td><td>${cData.nfi2.branches_large.toFixed(2)}</td><td>${cData.nfi3.branches_large.toFixed(2)}</td><td>${cData.nfi4.branches_large.toFixed(2)}</td></tr>
                <tr><td>Branches 2-7cm</td><td>${cData.nfi2.branches_small.toFixed(2)}</td><td>${cData.nfi3.branches_small.toFixed(2)}</td><td>${cData.nfi4.branches_small.toFixed(2)}</td></tr>
                <tr><td>Leaves & Fine Branches</td><td>${cData.nfi2.leaves.toFixed(2)}</td><td>${cData.nfi3.leaves.toFixed(2)}</td><td>${cData.nfi4.leaves.toFixed(2)}</td></tr>
                <tr><td>Roots</td><td>${cData.nfi2.roots.toFixed(2)}</td><td>${cData.nfi3.roots.toFixed(2)}</td><td>${cData.nfi4.roots.toFixed(2)}</td></tr>
            </tbody>
            <tfoot><tr style="background:#f0f0f0;font-weight:bold;"><td>TOTAL CARBON</td><td>${cData.nfi2.total.toFixed(2)}</td><td>${cData.nfi3.total.toFixed(2)}</td><td>${cData.nfi4.total.toFixed(2)}</td></tr></tfoot>
        </table>`;
}

// ── Forest Status ────────────────────────────────────────────
function renderForestStatus(selectedPlot) {
    const tableGen = document.getElementById('table-general-status');
    const tableTree = document.getElementById('table-tree-layer');
    const tableShrub = document.getElementById('table-shrub-layer');
    const noDataMsg = `<div class="damage-empty-state">Please select a specific plot to view detailed Forest Status attributes.</div>`;
    if (selectedPlot === "ALL") { tableGen.innerHTML = noDataMsg; tableTree.innerHTML = noDataMsg; tableShrub.innerHTML = noDataMsg; return; }

    const fmt = (val) => { if (!val || val === '-') return '-'; const num = parseFloat(val); return isNaN(num) ? val : num.toFixed(2); };

    const stData = statusData[selectedPlot];
    if (!stData) {
        tableGen.innerHTML = `<div class="damage-empty-state">No status data for this plot.</div>`;
    } else {
        const metrics = [
            { label: 'Canopy (%)', i2: 6, i3: 7, i4: 8 },
            { label: 'Density (trees/ha)', i2: 9, i3: 10, i4: 11 },
            { label: 'Dominant Height Ho (m)', i2: 12, i3: 13, i4: 14 },
            { label: 'Mean Height Hm (m)', i2: 15, i3: 16, i4: 17 },
            { label: 'Quad. Mean Diameter Dg (cm)', i2: 18, i3: 19, i4: 20 },
            { label: 'Mean Diameter Dm (cm)', i2: 21, i3: 22, i4: 23 },
            { label: 'Dead Trees', i2: 24, i3: 25, i4: 26 },
            { label: 'Composition', i2: 27, i3: 28, i4: 29 },
            { label: 'Structure', i2: 30, i3: 31, i4: 32 },
            { label: 'Shannon Index', i2: 33, i3: 34, i4: 35 },
            { label: 'Slenderness', i2: 36, i3: 37, i4: 38 },
            { label: 'SDIR', i2: 39, i3: 40, i4: 41 },
            { label: 'Hart Index', i2: 42, i3: 43, i4: 44 }
        ];
        let htmlGen = `<table><thead><tr><th>Variable</th><th class="text-center">NFI 2</th><th class="text-center">NFI 3</th><th class="text-center">NFI 4</th></tr></thead><tbody>`;
        metrics.forEach(m => { htmlGen += `<tr><td>${m.label}</td><td class="text-center">${fmt(stData[m.i2])}</td><td class="text-center">${fmt(stData[m.i3])}</td><td class="text-center">${fmt(stData[m.i4])}</td></tr>`; });
        htmlGen += `</tbody></table>`;
        tableGen.innerHTML = htmlGen;
    }

    const trData = treeLayerData[selectedPlot];
    if (!trData || trData.length === 0) {
        tableTree.innerHTML = `<div class="damage-empty-state">No tree layer data for this plot.</div>`;
    } else {
        let htmlTr = `<table><thead><tr><th rowspan="2">Species</th><th colspan="2" class="text-center">Age</th><th colspan="3" class="text-center">Development Stage</th><th colspan="2" class="text-center">Origin</th><th colspan="3" class="text-center">Cover (%)</th><th colspan="3" class="text-center">Regeneration</th></tr><tr><th class="text-center">NFI 3</th><th class="text-center">NFI 4</th><th class="text-center">NFI 2</th><th class="text-center">NFI 3</th><th class="text-center">NFI 4</th><th class="text-center">NFI 3</th><th class="text-center">NFI 4</th><th class="text-center">NFI 2</th><th class="text-center">NFI 3</th><th class="text-center">NFI 4</th><th class="text-center">NFI 2</th><th class="text-center">NFI 3</th><th class="text-center">NFI 4</th></tr></thead><tbody>`;
        trData.forEach(row => { htmlTr += `<tr><td>${row[2]}</td><td class="text-center">${fmt(row[6])}</td><td class="text-center">${fmt(row[7])}</td><td class="text-center">${row[9]}</td><td class="text-center">${row[11]}</td><td class="text-center">${row[13]}</td><td class="text-center">${row[15]}</td><td class="text-center">${row[19]}</td><td class="text-center">${fmt(row[22])}</td><td class="text-center">${fmt(row[23])}</td><td class="text-center">${fmt(row[24])}</td><td class="text-center">${row[26]}</td><td class="text-center">${row[28]}</td><td class="text-center">${row[30]}</td></tr>`; });
        htmlTr += `</tbody></table>`;
        tableTree.innerHTML = htmlTr;
    }

    const shData = shrubLayerData[selectedPlot];
    if (!shData || shData.length === 0) {
        tableShrub.innerHTML = `<div class="damage-empty-state">No shrub layer data for this plot.</div>`;
    } else {
        let htmlSh = `<table><thead><tr><th rowspan="2">Species</th><th colspan="3" class="text-center">Canopy (%)</th><th colspan="3" class="text-center">Hm (dm)</th></tr><tr><th class="text-center">NFI 2</th><th class="text-center">NFI 3</th><th class="text-center">NFI 4</th><th class="text-center">NFI 2</th><th class="text-center">NFI 3</th><th class="text-center">NFI 4</th></tr></thead><tbody>`;
        shData.forEach(row => { htmlSh += `<tr><td>${row[2]}</td><td class="text-center">${fmt(row[3])}</td><td class="text-center">${fmt(row[4])}</td><td class="text-center">${fmt(row[5])}</td><td class="text-center">${fmt(row[6])}</td><td class="text-center">${fmt(row[7])}</td><td class="text-center">${fmt(row[8])}</td></tr>`; });
        htmlSh += `</tbody></table>`;
        tableShrub.innerHTML = htmlSh;
    }
}

// ── Dashboard update ─────────────────────────────────────────
function updateDashboard(selectedPlot) {
    const filteredRows = selectedPlot === "ALL" ? globalRawData : globalRawData.filter(row => row.estadillo === selectedPlot);
    const activeSpecies = new Set();
    filteredRows.forEach(row => {
        if (row.n2>0||row.n3>0||row.n4>0||row.ba2>0||row.ba3>0||row.ba4>0||row.v2>0||row.v3>0||row.v4>0) activeSpecies.add(row.species);
    });
    updateLegend(activeSpecies);

    const dataMap = {};
    filteredRows.forEach(row => {
        if (disabledSpecies.has(row.species)) return;
        const sp = row.species;
        if (!dataMap[row.dc]) dataMap[row.dc] = { n2:{}, n3:{}, n4:{}, ba2:{}, ba3:{}, ba4:{}, v2:{}, v3:{}, v4:{}, total_n2:0, total_n3:0, total_n4:0, total_ba2:0, total_ba3:0, total_ba4:0, total_v2:0, total_v3:0, total_v4:0 };
        const d = dataMap[row.dc];
        ['n2','n3','n4','ba2','ba3','ba4','v2','v3','v4'].forEach(k => { if (!d[k][sp]) d[k][sp] = 0; });
        d.n2[sp]+=row.n2; d.n3[sp]+=row.n3; d.n4[sp]+=row.n4;
        d.ba2[sp]+=row.ba2; d.ba3[sp]+=row.ba3; d.ba4[sp]+=row.ba4;
        d.v2[sp]+=row.v2; d.v3[sp]+=row.v3; d.v4[sp]+=row.v4;
        d.total_n2+=row.n2; d.total_n3+=row.n3; d.total_n4+=row.n4;
        d.total_ba2+=row.ba2; d.total_ba3+=row.ba3; d.total_ba4+=row.ba4;
        d.total_v2+=row.v2; d.total_v3+=row.v3; d.total_v4+=row.v4;
    });

    const finalData = Object.keys(dataMap).map(dc => ({ dc: parseInt(dc), ...dataMap[dc] })).sort((a, b) => a.dc - b.dc);

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
    renderForestStatus(selectedPlot);
}

// ── Charts ───────────────────────────────────────────────────
function renderStackedChart(data, containerId, metricPrefix, yLabelText) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="y-axis-label">${yLabelText}</div>`;
    if (data.length === 0) { container.innerHTML += `<div style="margin:auto;color:#888;">No data for selected filters</div>`; return; }

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
            const pct = (totalVal / maxTotal) * 100;
            barContainer.style.height = `${pct}%`;
            if (pct === 0) barContainer.style.minHeight = '1px';

            let tooltipHtml = `<div style="margin-bottom:6px;border-bottom:1px solid #555;padding-bottom:4px;"><strong>DC ${item.dc} - ${labelName}</strong><br>Total: ${totalVal.toFixed(2)} ${yLabelText.split('/')[0]}</div>`;
            for (const [sp, val] of Object.entries(item[nfiKey])) {
                if (val > 0) {
                    const seg = document.createElement('div');
                    seg.className = `bar-segment ${patternClass}`;
                    seg.style.height = `${(val / totalVal) * 100}%`;
                    seg.style.backgroundColor = speciesColorMap[sp];
                    barContainer.appendChild(seg);
                    tooltipHtml += `<div><span class="tooltip-color-box" style="background:${speciesColorMap[sp]}"></span>${sp}: ${val.toFixed(2)}</div>`;
                }
            }
            barContainer.addEventListener('mousemove', (e) => showTooltip(e, tooltipHtml));
            barContainer.addEventListener('mouseleave', hideTooltip);
            return barContainer;
        };

        if (!disabledNFIs.has('nfi2')) group.appendChild(createStackedBar(`${metricPrefix}2`, 'NFI 2', 'nfi2-pattern'));
        if (!disabledNFIs.has('nfi3')) group.appendChild(createStackedBar(`${metricPrefix}3`, 'NFI 3', 'nfi3-pattern'));
        if (!disabledNFIs.has('nfi4')) group.appendChild(createStackedBar(`${metricPrefix}4`, 'NFI 4', 'nfi4-pattern'));

        const label = document.createElement('div');
        label.className = 'x-axis-label';
        label.innerText = item.dc;
        group.appendChild(label);

        const subLabels = document.createElement('div');
        subLabels.className = 'sub-labels';
        subLabels.innerHTML = ['nfi2','nfi3','nfi4']
            .filter(k => !disabledNFIs.has(k))
            .map(k => `<span>${k.replace('nfi','')}</span>`)
            .join('');
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
    if (data.length === 0) { container.innerHTML = `<div style="padding:20px;color:#888;">No data for selected filters</div>`; return; }
    let html = `<table><thead><tr><th>DC (cm)</th><th>NFI 2 (${unit})</th><th>NFI 3 (${unit})</th><th>NFI 4 (${unit})</th></tr></thead><tbody>`;
    data.forEach(row => { html += `<tr><td>${row.dc}</td><td>${row[`total_${metric}2`].toFixed(2)}</td><td>${row[`total_${metric}3`].toFixed(2)}</td><td>${row[`total_${metric}4`].toFixed(2)}</td></tr>`; });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ── Nav smooth scroll ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            const targetElement = document.querySelector(this.getAttribute('href'));
            if (targetElement) window.scrollTo({ top: targetElement.offsetTop - 80, behavior: 'smooth' });
        });
    });
});

loadData();