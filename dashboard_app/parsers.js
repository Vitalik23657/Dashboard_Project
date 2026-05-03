const cleanVal = (val) => {
    if (!val || val === 'NA' || val === '"NA"') return '-';
    return val.replace(/"/g, '').trim();
};

function parseRawData(csvText) {
    const lines = csvText.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row || row.length < 15) continue;

        const estadillo  = row[0].trim();
        const speciesName = row[4].replace(/"/g, '').trim();

        uniqueEstadillos.add(estadillo);
        if (speciesName) uniqueSpecies.add(speciesName);

        globalRawData.push({
            estadillo,
            species: speciesName,
            dc: parseInt(row[5].trim()),
            n2:  parseFloat(row[6])  || 0,
            n3:  parseFloat(row[9])  || 0,
            n4:  parseFloat(row[12]) || 0,
            ba2: parseFloat(row[7])  || 0,
            ba3: parseFloat(row[10]) || 0,
            ba4: parseFloat(row[13]) || 0,
            v2:  parseFloat(row[8])  || 0,
            v3:  parseFloat(row[11]) || 0,
            v4:  parseFloat(row[14]) || 0,
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
            damage:       row[4].replace(/"/g, '').trim(),
            treesDamaged: parseFloat(row[5]) || 0,
            totalTrees:   parseFloat(row[6]) || 0,
            pct:          parseFloat(row[7]) || 0,
        });
    }
}

function parseQualityData(csvText) {
    const lines = csvText.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row || row.length < 13) continue;

        const estadillo = row[0].trim();
        const qClass    = row[3].replace(/"/g, '').trim();
        const num       = (val) => val === 'NA' ? 0 : parseFloat(val) || 0;

        if (!qualityData[estadillo]) qualityData[estadillo] = {};
        qualityData[estadillo][qClass] = {
            v2: num(row[4]),  p2: num(row[6]),
            v3: num(row[7]),  p3: num(row[9]),
            v4: num(row[10]), p4: num(row[12]),
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
            nfi2: { stem: p(row[3]),  branches_large: p(row[4]),  branches_small: p(row[5]),  leaves: p(row[6]),  roots: p(row[7]),  total: p(row[8])  },
            nfi3: { stem: p(row[9]),  branches_large: p(row[10]), branches_small: p(row[11]), leaves: p(row[12]), roots: p(row[13]), total: p(row[14]) },
            nfi4: { stem: p(row[15]), branches_large: p(row[16]), branches_small: p(row[17]), leaves: p(row[18]), roots: p(row[19]), total: p(row[20]) },
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