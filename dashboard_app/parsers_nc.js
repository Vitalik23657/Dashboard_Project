// ─────────────────────────────────────────────────────────────────────────────
// Non-continuity (NC) plots
//
// These plots do not have continuity across the three inventories (or are not
// pine/oak stands). Their CSVs share the same fields as the main dataset but
// with a different column layout: 4 extra columns (ClaIFN3, SubclaseIFN3,
// ClaIFN4, SubclaseIFN4) are inserted after the coordinates, the coordinates
// are WGS84 lat/lng instead of UTM, and some files reorder the value columns.
// To stay robust against all of that we parse strictly by HEADER NAME and
// feed the existing global structures, so the renderers stay untouched.
//
// A plot is fully comparable with the following inventory only when it is
// classified there as Class A, Subclass 1 (A-1). plotMeta records that so we
// can warn when it is not.
// ─────────────────────────────────────────────────────────────────────────────

const plotMeta    = {};   // estadillo -> { cla3, sub3, cla4, sub4 }
const ncPlots     = new Set();
const ncMapPoints = [];    // { est, lat, lng, muni }

// ── CSV helpers ──────────────────────────────────────────────────────────────

// Quote-aware line splitter: keeps commas that live inside quoted fields
// (e.g. "E.L.M. de Valderrueda, E.L.M. de La Sota") and strips the quotes.
function parseCSVLine(line) {
    const out = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') { cur += '"'; i++; }
                else inQuotes = false;
            } else cur += ch;
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            out.push(cur); cur = '';
        } else cur += ch;
    }
    out.push(cur);
    return out;
}

function ncHeaderIndex(headerLine) {
    const idx = {};
    parseCSVLine(headerLine).forEach((name, i) => { idx[name.trim()] = i; });
    return idx;
}

// Iterate data rows of an NC CSV, calling fn(get, row) where get(name) returns
// the trimmed value of the named column ('' if absent).
function forEachNCRow(csvText, fn) {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length);
    if (lines.length < 2) return;
    const idx = ncHeaderIndex(lines[0]);
    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        const get = (name) => {
            const j = idx[name];
            return (j === undefined || row[j] === undefined) ? '' : row[j].trim();
        };
        fn(get, row, idx);
    }
}

const ncNum = (v) => {
    if (v === undefined || v === '' || v === 'NA') return 0;
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
};

// ── Parsers (populate the shared global structures) ──────────────────────────

function parseSituationNC(csvText) {
    forEachNCRow(csvText, (get) => {
        const est = get('Estadillo');
        if (!est) return;

        plotMeta[est] = {
            cla3: get('ClaIFN3'), sub3: get('SubclaseIFN3'),
            cla4: get('ClaIFN4'), sub4: get('SubclaseIFN4'),
        };
        ncPlots.add(est);
        uniqueEstadillos.add(est);   // make every NC plot selectable

        const lat = parseFloat(get('lat'));
        const lng = parseFloat(get('lng'));
        if (!isNaN(lat) && !isNaN(lng)) {
            ncMapPoints.push({ est, lat, lng, muni: get('Municipality') });
        }
    });
}

function parseRawDataNC(csvText) {
    forEachNCRow(csvText, (get) => {
        const est = get('Estadillo');
        if (!est) return;
        const species = get('SpeciesName');

        uniqueEstadillos.add(est);
        if (species) uniqueSpecies.add(species);

        globalRawData.push({
            estadillo: est,
            species,
            nc: true,                         // flag: excluded from the ALL aggregate
            dc: parseInt(get('DC'), 10),
            n2: ncNum(get('N_NFI2')),  n3: ncNum(get('N_NFI3')),  n4: ncNum(get('N_NFI4')),
            ba2: ncNum(get('BA_NFI2')), ba3: ncNum(get('BA_NFI3')), ba4: ncNum(get('BA_NFI4')),
            v2: ncNum(get('V_NFI2')),  v3: ncNum(get('V_NFI3')),  v4: ncNum(get('V_NFI4')),
        });
    });
}

function parseNaturalConditionsNC(csvText) {
    forEachNCRow(csvText, (get) => {
        const est = get('Estadillo');
        if (!est) return;
        naturalConditionsData[est] = {
            altitude:      cleanVal(get('Altitude_m')),
            fuelModel:     cleanVal(get('FuelModel')),
            aspect:        cleanVal(get('Aspect')),
            slope:         cleanVal(get('Slope')),
            exposure:      cleanVal(get('Exposure')),
            stoniness:     cleanVal(get('Stoniness')),
            texture:       cleanVal(get('Texture')),
            bioRegion:     cleanVal(get('BioRigion')),
            organicMatter: cleanVal(get('OrganicMatter')),
            soilPH:        cleanVal(get('SoilpH')),
            soilType:      cleanVal(get('SoilType')),
        };
    });
}

function parseDamageNFI2NC(csvText) {
    forEachNCRow(csvText, (get) => {
        const est = get('Estadillo');
        if (!est) return;
        const dmg = get('DamageNFI2_EN') || get('DamageNFI2');
        if (dmg && dmg !== 'NA') damageData.nfi2[est] = dmg;
    });
}

function parseDamageNFI34NC(csvText, nfiKey, n) {
    forEachNCRow(csvText, (get) => {
        const est = get('Estadillo');
        if (!est) return;
        const damage = get('DamageNFI' + n);
        if (!damage || damage === 'NA') return;
        if (!damageData[nfiKey][est]) damageData[nfiKey][est] = [];
        damageData[nfiKey][est].push({
            damage,
            treesDamaged: ncNum(get('TreesDamNFI' + n)),
            totalTrees:   ncNum(get('TotalTreesNFI' + n)),
            pct:          ncNum(get('PercentageDamageNFI' + n)),
        });
    });
}

function parseCarbonNC(csvText) {
    forEachNCRow(csvText, (get) => {
        const est = get('Estadillo');
        if (!est) return;
        const inv = (s) => ({
            stem:           ncNum(get('Stem_NFI' + s)),
            branches_large: ncNum(get('BranchesOver7cm_NFI' + s)),
            branches_small: ncNum(get('Branches7to2cm_NFI' + s)),
            leaves:         ncNum(get('BranchesUnder2cmLeaves_NFI' + s)),
            roots:          ncNum(get('Roots_NFI' + s)),
            total:          ncNum(get('TotalC_NFI' + s)),
        });
        carbonData[est] = { nfi2: inv(2), nfi3: inv(3), nfi4: inv(4) };
    });
}

function parseQualityNC(csvText) {
    forEachNCRow(csvText, (get) => {
        const est = get('Estadillo');
        if (!est) return;
        const qClass = get('Quality');
        if (!qClass || qClass === 'NA') return;
        if (!qualityData[est]) qualityData[est] = {};
        qualityData[est][qClass] = {
            v2: ncNum(get('VCC_m3_ha_IFN2')), p2: ncNum(get('Porc_VCC_IFN2')),
            v3: ncNum(get('VCC_m3_ha_IFN3')), p3: ncNum(get('Porc_VCC_IFN3')),
            v4: ncNum(get('VCC_m3_ha_IFN4')), p4: ncNum(get('Porc_VCC_IFN4')),
        };
    });
}

// The NC general-status file reorders columns heavily, so we rebuild a row in
// the exact positional layout renderForestStatus() expects (indices 6..44).
function parseStatusNC(csvText) {
    forEachNCRow(csvText, (get) => {
        const est = get('Estadillo');
        if (!est) return;
        const arr = new Array(45).fill('');
        arr[0]  = est;
        arr[3]  = get('YearNFI2');       arr[4]  = get('YearNFI3');       arr[5]  = get('YearNFI4');
        arr[6]  = get('CanopyNFI2');     arr[7]  = get('CanopyNFI3');     arr[8]  = get('CanopyNFI4');
        arr[9]  = get('NtreesNFI2');     arr[10] = get('NtreesNFI3');     arr[11] = get('NtreesNFI4');
        arr[12] = get('HoNFI2');         arr[13] = get('HoNFI3');         arr[14] = get('HoNFI4');
        arr[15] = get('HmNFI2');         arr[16] = get('HmNFI3');         arr[17] = get('HmNFI4');
        arr[18] = get('DgNFI2');         arr[19] = get('DgNFI3');         arr[20] = get('DgNFI4');
        arr[21] = get('DmNFI2');         arr[22] = get('DmNFI3');         arr[23] = get('DmNFI4');
        arr[24] = get('DeadTreesNFI2');  arr[25] = get('DeadTreesNFI3');  arr[26] = get('DeadTreesNFI4');
        arr[27] = get('CompositionNFI2');arr[28] = get('CompositionNFI3');arr[29] = get('CompositionNFI4');
        arr[30] = get('StructureNFI2');  arr[31] = get('StructureNFI3');  arr[32] = get('StructureNFI4');
        arr[33] = get('ShannonNFI2');    arr[34] = get('ShannonNFI3');    arr[35] = get('ShannonNFI4');
        arr[36] = get('SlendernessNFI2');arr[37] = get('SlendernessNFI3');arr[38] = get('SlendernessNFI4');
        arr[39] = get('SDIR_NFI2');      arr[40] = get('SDIR_NFI3');      arr[41] = get('SDIR_NFI4');
        arr[42] = get('HartNFI2');       arr[43] = get('HartNFI3');       arr[44] = get('HartNFI4');
        statusData[est] = arr.map(cleanVal);
    });
}

// Tree layer: same field order as the main file with 6 columns inserted after
// Estadillo, so slicing from SpeciesID reproduces the original layout exactly.
function parseTreeLayerNC(csvText) {
    forEachNCRow(csvText, (get, row, idx) => {
        const est = get('Estadillo');
        if (!est || idx['SpeciesID'] === undefined) return;
        const oldRow = [row[idx['Estadillo']]].concat(row.slice(idx['SpeciesID']));
        if (oldRow.length < 31) return;
        if (!treeLayerData[est]) treeLayerData[est] = [];
        treeLayerData[est].push(oldRow.map(cleanVal));
    });
}

// Shrub layer interleaves canopy/height per inventory, so rebuild the grouped
// layout the renderer reads (canopy 2/3/4 then Hm 2/3/4).
function parseShrubLayerNC(csvText) {
    forEachNCRow(csvText, (get) => {
        const est = get('Estadillo');
        if (!est) return;
        const oldRow = [
            get('Estadillo'), get('SpeciesID'), get('SpeciesName'),
            get('CanopySHRNFI2'), get('CanopySHRNFI3'), get('CanopySHRNFI4'),
            get('HmSHRNFI2'), get('HmSHRNFI3'), get('HmSHRNFI4'),
        ];
        if (!shrubLayerData[est]) shrubLayerData[est] = [];
        shrubLayerData[est].push(oldRow.map(cleanVal));
    });
}

// ── Continuity warning ───────────────────────────────────────────────────────

const isNAclass = (c) => !c || c === 'NA' || c === '-';
const isA1      = (c, s) => c === 'A' && s === '1';

// Build the human-readable comparability notes for an NC plot. Empty array
// means the plot is A-1 wherever it appears (data are directly comparable).
function getContinuityMessages(m) {
    const msgs = [];

    if (isNAclass(m.cla3) && isNAclass(m.cla4)) {
        msgs.push(t('nc_warn_only_ifn2'));
        return msgs;
    }

    if (isNAclass(m.cla3))            msgs.push(t('nc_warn_absent_ifn3'));
    else if (!isA1(m.cla3, m.sub3))   msgs.push(t('nc_warn_ifn3').replace('{c}', `${m.cla3}-${m.sub3}`));

    if (isNAclass(m.cla4))            msgs.push(t('nc_warn_absent_ifn4'));
    else if (!isA1(m.cla4, m.sub4))   msgs.push(t('nc_warn_ifn4').replace('{c}', `${m.cla4}-${m.sub4}`));

    return msgs;
}

function renderContinuityWarning(selectedPlot) {
    const el = document.getElementById('continuity-warning');
    if (!el) return;

    const m = selectedPlot !== 'ALL' ? plotMeta[selectedPlot] : null;
    const msgs = m ? getContinuityMessages(m) : [];

    if (!m || msgs.length === 0) {
        el.style.display = 'none';
        el.innerHTML = '';
        return;
    }

    el.style.display = 'block';
    el.innerHTML = `
        <div class="cw-title">⚠ ${t('nc_badge')} ${selectedPlot}</div>
        <div class="cw-intro">${t('nc_intro')}</div>
        <ul class="cw-list">${msgs.map(x => `<li>${x}</li>`).join('')}</ul>`;
}
