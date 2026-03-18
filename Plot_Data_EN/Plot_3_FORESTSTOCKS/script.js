
const tooltip = document.getElementById('tooltip');
let globalRawData = []; 
let uniqueEstadillos = new Set(); 
let uniqueSpecies = new Set();

const speciesColors = [
    '#4CAF50', '#2196F3', '#FFC107', '#E91E63', '#9C27B0', 
    '#00BCD4', '#FF9800', '#795548', '#607D8B', '#8BC34A',
    '#F44336', '#3F51B5', '#009688', '#CDDC39', '#FF5722'
];
const speciesColorMap = {};

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

async function loadData() {
    try {
        const response = await fetch('PlotForestStocks_EN.csv');
        const csvText = await response.text();
        
        parseRawData(csvText);
        assignSpeciesColors();
        populateDropdown();
        const firstPlot = Array.from(uniqueEstadillos)[0];
        updateDashboard(firstPlot);
        
        document.getElementById('estadillo-filter').addEventListener('change', (e) => {
            updateDashboard(e.target.value);
        });

    } catch (error) {
        console.error("Error loading CSV.", error);
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

function assignSpeciesColors() {
    let colorIndex = 0;
    Array.from(uniqueSpecies).sort().forEach(species => {
        speciesColorMap[species] = speciesColors[colorIndex % speciesColors.length];
        colorIndex++;
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

    const speciesToDisplay = Array.from(uniqueSpecies).filter(s => activeSpecies.has(s)).sort();

    if(speciesToDisplay.length === 0) {
        legendContainer.innerHTML = '<span>No species data available</span>';
        return;
    }

    speciesToDisplay.forEach(species => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `<div class="legend-color" style="background: ${speciesColorMap[species]};"></div> ${species}`;
        legendContainer.appendChild(item);
    });
}

function updateGrowthStats(data) {
    let totalV2 = 0;
    let totalV4 = 0;
    let speciesGrowth = {};
    let dcShift = { young: 0, medium: 0, mature: 0 }; 

    data.forEach(item => {
        totalV2 += item.total_v2;
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

function updateDashboard(selectedPlot) {
    const filteredRows = globalRawData.filter(row => row.estadillo === selectedPlot);

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

    renderStackedChart(finalData, 'chart-density', 'n', 'Stems/ha');
    renderStackedChart(finalData, 'chart-basal', 'ba', 'm²/ha');
    renderStackedChart(finalData, 'chart-volume', 'v', 'm³/ha');
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
            if(containerHeightPercent === 0) barContainer.style.minHeight = '1px';

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
                    segment.style.backgroundColor = speciesColorMap[sp];
                    barContainer.appendChild(segment);

                    tooltipHtml += `<div><span class="tooltip-color-box" style="background:${speciesColorMap[sp]}"></span>${sp}: ${val.toFixed(2)}</div>`;
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

loadData();