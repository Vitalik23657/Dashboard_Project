let globalRawData    = [];
let uniqueEstadillos = new Set();
let uniqueSpecies    = new Set();
let disabledSpecies  = new Set();
let disabledNFIs     = new Set();

let damageData   = { nfi2: {}, nfi3: {}, nfi4: {} };
let qualityData  = {};
let carbonData   = {};
let qualityDescriptions = {};
let statusData      = {};
let treeLayerData   = {};
let shrubLayerData  = {};

const speciesColorMap = {};

function assignSpeciesColors() {
    Array.from(uniqueSpecies).sort().forEach((species, i) => {
        speciesColorMap[species] = SPECIES_PALETTE[i % SPECIES_PALETTE.length];
    });
}

function populateDropdown() {
    const select = document.getElementById('estadillo-filter');
    Array.from(uniqueEstadillos)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach(plot => {
            const option = document.createElement('option');
            option.value = plot;
            option.textContent = `${t('plot_label')} ${plot}`;
            select.appendChild(option);
        });
}

function updateDashboard(selectedPlot) {
    const filteredRows = selectedPlot === 'ALL'
        ? globalRawData
        : globalRawData.filter(row => row.estadillo === selectedPlot);

    const activeSpecies = new Set();
    filteredRows.forEach(row => {
        if (row.n2>0||row.n3>0||row.n4>0||row.ba2>0||row.ba3>0||row.ba4>0||row.v2>0||row.v3>0||row.v4>0) {
            activeSpecies.add(row.species);
        }
    });
    updateLegend(activeSpecies);

    const dataMap = {};
    filteredRows.forEach(row => {
        if (disabledSpecies.has(row.species)) return;
        const sp = row.species;
        if (!dataMap[row.dc]) {
            dataMap[row.dc] = {
                n2:{}, n3:{}, n4:{}, ba2:{}, ba3:{}, ba4:{}, v2:{}, v3:{}, v4:{},
                total_n2:0, total_n3:0, total_n4:0,
                total_ba2:0, total_ba3:0, total_ba4:0,
                total_v2:0, total_v3:0, total_v4:0,
            };
        }
        const d = dataMap[row.dc];
        ['n2','n3','n4','ba2','ba3','ba4','v2','v3','v4'].forEach(k => { if (!d[k][sp]) d[k][sp] = 0; });
        d.n2[sp]+=row.n2;   d.n3[sp]+=row.n3;   d.n4[sp]+=row.n4;
        d.ba2[sp]+=row.ba2; d.ba3[sp]+=row.ba3; d.ba4[sp]+=row.ba4;
        d.v2[sp]+=row.v2;   d.v3[sp]+=row.v3;   d.v4[sp]+=row.v4;
        d.total_n2+=row.n2;   d.total_n3+=row.n3;   d.total_n4+=row.n4;
        d.total_ba2+=row.ba2; d.total_ba3+=row.ba3; d.total_ba4+=row.ba4;
        d.total_v2+=row.v2;   d.total_v3+=row.v3;   d.total_v4+=row.v4;
    });

    const finalData = Object.keys(dataMap)
        .map(dc => ({ dc: parseInt(dc), ...dataMap[dc] }))
        .sort((a, b) => a.dc - b.dc);

    updateGrowthStats(finalData);
    renderStackedChart(finalData, 'chart-density', 'n',  'Trees/ha');
    renderStackedChart(finalData, 'chart-basal',   'ba', 'm²/ha');
    renderStackedChart(finalData, 'chart-volume',  'v',  'm³/ha');
    renderTable(finalData, 'view-density-table', 'n',  'Trees/ha');
    renderTable(finalData, 'view-basal-table',   'ba', 'm²/ha');
    renderTable(finalData, 'view-volume-table',  'v',  'm³/ha');
    renderDamageStatus(selectedPlot);
    renderQualityChartAndTable(selectedPlot);
    renderCarbonData(selectedPlot);
    renderForestStatus(selectedPlot);
}

document.getElementById('growth-badge').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('growth-dropdown').classList.toggle('show');
});

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
            fetch('../Plot_Data_EN/Plot_7_FORESTSTATUS/PlotShrubLayer_EN.csv'),
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
        renderNFILegend();
        renderQualityLegend();
        renderQualityDefinitions();

        const urlPlot     = getPlotFromURL();
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
            const plot   = getPlotFromURL();
            const select = document.getElementById('estadillo-filter');
            const value  = plot && uniqueEstadillos.has(plot) ? plot : 'ALL';
            select.value = value;
            disabledSpecies.clear();
            updateDashboard(value);
        });

    } catch (error) {
        console.error('Error loading CSV files.', error);
    }
}

loadData();