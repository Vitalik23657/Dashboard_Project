let leafletMap = null;
let plotMarkers = {};
let mapBounds = [];

const utmProjection = "+proj=utm +zone=30 +datum=WGS84 +units=m +no_defs";
const wgs84Projection = "+proj=longlat +datum=WGS84 +no_defs";

function initMap() {
    leafletMap = L.map('map').setView([42.8, -4.5], 9); 
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(leafletMap);
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
        const county = row[4] ? row[4].replace(/"/g, '') : '';
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

        marker.bindPopup(`
            <div style="font-family: sans-serif; text-align: center;">
                <strong style="font-size: 1.1em; color: #333;">Plot ${estadillo}</strong><br>
                <span style="color: #666;">${municipality}</span><br>
                <span style="color: #888; font-size: 0.9em;">(${county})</span>
            </div>
        `);

        plotMarkers[estadillo] = marker;
        mapBounds.push([lat, lng]);
    }

    if (mapBounds.length > 0) {
        leafletMap.fitBounds(mapBounds, { padding: [30, 30] });
    }
}

function highlightMapPlot(selectedPlot) {
    if (!leafletMap) return;

    Object.values(plotMarkers).forEach(marker => {
        marker.setStyle({
            fillColor: "#4A90A4",
            radius: 6,
            color: "#ffffff",
            weight: 1,
            fillOpacity: 0.7
        });
        marker.closePopup();
    });

    if (selectedPlot === 'ALL') {
        if (mapBounds.length > 0) {
            leafletMap.fitBounds(mapBounds, { padding: [30, 30] });
        }
        return;
    }

    const targetMarker = plotMarkers[selectedPlot];
    if (targetMarker) {
        targetMarker.setStyle({
            fillColor: "#E53935",
            radius: 11,
            color: "#000000",
            weight: 2,
            fillOpacity: 1
        });
        targetMarker.bringToFront();
        
        leafletMap.panTo(targetMarker.getLatLng(), { animate: true, duration: 0.5 });
        targetMarker.openPopup();
    }
}