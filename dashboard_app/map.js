let leafletMap = null;
let plotMarkers = {};
let mapBounds = [];
let bmpBoundaryLayer = null;

const utmProjection = "+proj=utm +zone=30 +datum=WGS84 +units=m +no_defs";
const wgs84Projection = "+proj=longlat +datum=WGS84 +no_defs";

function initMap() {
    leafletMap = L.map('map', { attributionControl: false }).setView([42.8, -4.5], 9); 
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
    }).addTo(leafletMap);

    loadBMPBoundaries();
}

function loadBMPBoundaries() {
    fetch('BMP_boundaries_wgs84.geojson')
        .then(response => response.json())
        .then(data => {
            bmpBoundaryLayer = L.geoJSON(data, {
                style: {
                    color: '#2d6a2d',
                    weight: 2,
                    opacity: 0.85,
                    fillColor: '#4a9e4a',
                    fillOpacity: 0.12,
                    interactive: false
                }
            }).addTo(leafletMap);

            const bounds = bmpBoundaryLayer.getBounds();
            leafletMap.fitBounds(bounds, { padding: [-20, -20] });

            const paddedBounds = bounds.pad(0.3);
            leafletMap.setMaxBounds(paddedBounds);
            leafletMap.setMinZoom(leafletMap.getZoom() - 1);
        })
        .catch(err => console.warn('BMP boundaries not loaded:', err));
}

function parseAndRenderMapData(csvText) {
    if (!leafletMap) initMap();
    
    const lines = csvText.trim().split('\n');
    
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row || row.length < 6) continue;
        
        const estadillo = row[0].trim();
        const coorX = parseFloat(row[1]);
        const coorY = parseFloat(row[2]);
        const municipality = row[5] ? row[5].replace(/"/g, '') : '';

        if (isNaN(coorX) || isNaN(coorY)) continue;

        const convertedCoords = proj4(utmProjection, wgs84Projection, [coorX, coorY]);
        const lng = convertedCoords[0];
        const lat = convertedCoords[1];

        const marker = L.circleMarker([lat, lng], {
            radius: 6,
            fillColor: "#4A90A4",
            color: "#ffffff",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.7
        }).addTo(leafletMap);

        marker.bindTooltip(
            `<strong>Plot ${estadillo}</strong><br>${municipality}`,
            { direction: 'top', offset: [0, -8], opacity: 0.92 }
        );

        marker.on('click', () => {
            const select = document.getElementById('estadillo-filter');
            if (select) select.value = estadillo;
            disabledSpecies.clear();
            setPlotInURL(estadillo);
            updateDashboard(estadillo);
        });

        marker.on('mouseover', () => {
            if (marker._isSelected) return;
            marker.setStyle({ fillColor: '#2a6f8a', radius: 8 });
            leafletMap.getContainer().style.cursor = 'pointer';
        });

        marker.on('mouseout', () => {
            if (marker._isSelected) return;
            marker.setStyle({ fillColor: '#4A90A4', radius: 6 });
            leafletMap.getContainer().style.cursor = '';
        });

        plotMarkers[estadillo] = marker;
        mapBounds.push([lat, lng]);
    }

    if (mapBounds.length > 0) {
        leafletMap.fitBounds(mapBounds, { padding: [30, 30] });
    }
}

function highlightMapPlot(selectedPlot) {
    if (!leafletMap) return;

    Object.entries(plotMarkers).forEach(([id, marker]) => {
        marker._isSelected = false;
        marker.setStyle({
            fillColor: "#4A90A4",
            radius: 6,
            color: "#ffffff",
            weight: 1,
            fillOpacity: 0.7
        });
    });

    if (selectedPlot === 'ALL') {
        if (mapBounds.length > 0) {
            leafletMap.fitBounds(mapBounds, { padding: [30, 30] });
        }
        return;
    }

    const targetMarker = plotMarkers[selectedPlot];
    if (targetMarker) {
        targetMarker._isSelected = true;
        targetMarker.setStyle({
            fillColor: "#E53935",
            radius: 11,
            color: "#ffffff",
            weight: 2,
            fillOpacity: 1
        });
        targetMarker.bringToFront();
    }
}