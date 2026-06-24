let currentLang = 'en';

function getPlotFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('plot');
}

function setPlotInURL(plotId) {
    const url = new URL(window.location);
    
    if (plotId === 'ALL') {
        url.searchParams.delete('plot');
    } else {
        url.searchParams.set('plot', plotId);
    }
    
    history.pushState(null, '', url.toString());
}

function setLanguage(lang) {
    currentLang = lang;
    document.getElementById('lang-en').classList.toggle('active', lang === 'en');
    document.getElementById('lang-es').classList.toggle('active', lang === 'es');
    applyTranslations();
    const plot = document.getElementById('estadillo-filter').value;
    updateDashboard(plot);
    renderNFILegend();
    renderQualityLegend();
    renderQualityDefinitions();
}

function applyTranslations() {

    [
        ['#stocks-section h2',  'nav_stocks'],
        ['#damage-section h2',  'damage_title'],
        ['#quality-section h2', 'quality_title'],
        ['#carbon-section h2',  'carbon_title'],
        ['#status-section h2',  'status_title'],
    ].forEach(([sel, key]) => {
        const el = document.querySelector(sel);
        if (el) el.textContent = t(key);
    });

    const filterLabel = document.querySelector('label[for="estadillo-filter"]');
    if (filterLabel) filterLabel.textContent = t('filter_plot');

    const allOption = document.querySelector('#estadillo-filter option[value="ALL"]');
    if (allOption) allOption.textContent = t('all_plots');

    Array.from(document.getElementById('estadillo-filter').options).forEach(opt => {
        if (opt.value !== 'ALL') opt.textContent = `${t('plot_label')} ${opt.value}`;
    });

    [['species-filter-btn', 'species_filter'], ['nfi-filter-btn', 'nfi_filter']].forEach(([id, key]) => {
        const btn = document.getElementById(id);
        if (btn && btn.childNodes[0]) btn.childNodes[0].textContent = t(key) + ' ';
    });

    const chartTitleMap = {
        'chart-density': 'density_title',
        'chart-basal':   'basal_title',
        'chart-volume':  'volume_title',
    };
    Object.entries(chartTitleMap).forEach(([chartId, key]) => {
        const card = document.getElementById(chartId)?.closest('.chart-card');
        const title = card?.querySelector('.chart-title');
        if (title) title.textContent = t(key);
    });

    const damageTitleMap = {
        'damage-nfi2': 'damage_nfi2_title',
        'damage-nfi3': 'damage_nfi3_title',
        'damage-nfi4': 'damage_nfi4_title',
    };
    Object.entries(damageTitleMap).forEach(([chartId, key]) => {
        const card = document.getElementById(chartId)?.closest('.chart-card');
        const title = card?.querySelector('.chart-title');
        if (title) title.textContent = t(key);
    });

    const staticTitles = document.querySelectorAll('[data-i18n]');
    staticTitles.forEach(el => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });

    const summary = document.querySelector('details summary');
    if (summary) summary.textContent = t('quality_definitions');

    document.querySelectorAll('.toggle-btn').forEach(btn => {
        const card      = btn.closest('.chart-card');
        if (!card) return;
        const activeTable = card.querySelector('.view-container.table-scroll.active, [id*="-table"].active');
        btn.textContent = activeTable ? t('view_visuals') : t('view_table');
    });

    document.querySelectorAll('[onclick="selectAllSpecies()"], [onclick="selectAllNFI()"]')
        .forEach(el => el.textContent = t('select_all'));
    document.querySelectorAll('[onclick="deselectAllSpecies()"], [onclick="deselectAllNFI()"]')
        .forEach(el => el.textContent = t('deselect_all'));
}

function toggleView(type, btn) {
    const chartView = document.getElementById(`view-${type}-chart`);
    const tableView = document.getElementById(`view-${type}-table`);
    if (chartView.classList.contains('active')) {
        chartView.classList.remove('active');
        tableView.classList.add('active');
        btn.textContent = t('view_visuals');
    } else {
        chartView.classList.add('active');
        tableView.classList.remove('active');
        btn.textContent = t('view_table');
    }
}

function toggleSpeciesDropdown() {
    const dd    = document.getElementById('species-dropdown');
    const arrow = document.getElementById('species-filter-arrow');
    const isOpen = dd.style.display === 'block';
    dd.style.display  = isOpen ? 'none' : 'block';
    arrow.textContent = isOpen ? '▾' : '▴';
}

function selectAllSpecies() {
    disabledSpecies.clear();
    updateDashboard(document.getElementById('estadillo-filter').value);
}

function deselectAllSpecies() {
    uniqueSpecies.forEach(sp => disabledSpecies.add(sp));
    updateDashboard(document.getElementById('estadillo-filter').value);
}

function updateLegend(activeSpecies) {
    const legendContainer = document.getElementById('species-legend');
    legendContainer.innerHTML = '';

    const speciesToDisplay = Array.from(uniqueSpecies).filter(s => activeSpecies.has(s)).sort();

    if (speciesToDisplay.length === 0) {
        legendContainer.innerHTML = `<span style="padding:8px 14px; color:#888; font-size:13px;">${t('no_species_data')}</span>`;
        updateSpeciesCount(0, 0);
        return;
    }

    speciesToDisplay.forEach(species => {
        const item = document.createElement('div');
        item.style.cssText = 'display:flex; align-items:center; gap:10px; padding:7px 14px; cursor:pointer; transition:background 0.15s;';
        item.onmouseenter = () => item.style.background = '#f5f5f5';
        item.onmouseleave = () => item.style.background = '';

        const checkbox = document.createElement('input');
        checkbox.type  = 'checkbox';
        checkbox.checked = !disabledSpecies.has(species);
        checkbox.style.cssText = 'width:15px; height:15px; cursor:pointer; flex-shrink:0;';
        checkbox.style.accentColor = speciesColorMap[species];

        const colorBox = document.createElement('div');
        colorBox.style.cssText = `width:13px; height:13px; border-radius:3px; flex-shrink:0; background:${speciesColorMap[species]};`;

        const label = document.createElement('span');
        label.innerText   = species;
        label.style.cssText = 'font-size:13px; white-space:nowrap; color:' +
            (disabledSpecies.has(species) ? '#aaa' : '#222') + ';' +
            (disabledSpecies.has(species) ? 'text-decoration:line-through;' : '');

        item.appendChild(checkbox);
        item.appendChild(colorBox);
        item.appendChild(label);

        item.addEventListener('click', (e) => {
            e.stopPropagation();
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
    const allSelected = active === total;
    badge.textContent = allSelected ? t('nfi_all').replace('3', total) : `${active}/${total}`;
    badge.style.background = allSelected ? '#e8f5e9' : '#fff3e0';
    badge.style.color      = allSelected ? '#2e7d32' : '#e65100';
}

function toggleNFIDropdown() {
    const dd    = document.getElementById('nfi-dropdown');
    const arrow = document.getElementById('nfi-filter-arrow');
    const isOpen = dd.style.display === 'block';
    dd.style.display  = isOpen ? 'none' : 'block';
    arrow.textContent = isOpen ? '▾' : '▴';
}

function selectAllNFI() {
    disabledNFIs.clear();
    renderNFILegend();
    updateDashboard(document.getElementById('estadillo-filter').value);
}

function deselectAllNFI() {
    NFI_KEYS.forEach(k => disabledNFIs.add(k));
    renderNFILegend();
    updateDashboard(document.getElementById('estadillo-filter').value);
}

function renderNFILegend() {
    const container = document.getElementById('nfi-legend');
    container.innerHTML = '';

    const nfis = [
        { key: 'nfi2', label: t('nfi_2'), patternClass: 'nfi2-pattern' },
        { key: 'nfi3', label: t('nfi_3'), patternClass: 'nfi3-pattern' },
        { key: 'nfi4', label: t('nfi_4'), patternClass: 'nfi4-pattern' },
    ];

    nfis.forEach(({ key, label }) => {
        const isDisabled = disabledNFIs.has(key);
        const item = document.createElement('div');
        item.style.cssText = 'display:flex; align-items:center; gap:10px; padding:7px 14px; cursor:pointer; transition:background 0.15s;';
        item.onmouseenter = () => item.style.background = '#f5f5f5';
        item.onmouseleave = () => item.style.background = '';

        const checkbox = document.createElement('input');
        checkbox.type    = 'checkbox';
        checkbox.checked = !isDisabled;
        checkbox.style.cssText = 'width:15px; height:15px; cursor:pointer; flex-shrink:0;';

        const patternBox = document.createElement('div');
        patternBox.className = `nfi-legend-box ${key}-pattern`;
        patternBox.style.flexShrink = '0';

        const labelEl = document.createElement('span');
        labelEl.innerText   = label;
        labelEl.style.cssText = `font-size:13px; white-space:nowrap; color:${isDisabled ? '#aaa' : '#222'};` +
            (isDisabled ? 'text-decoration:line-through;' : '');

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

    const active = NFI_KEYS.length - disabledNFIs.size;
    const badge  = document.getElementById('nfi-filter-count');
    const allSelected = active === NFI_KEYS.length;
    badge.textContent = allSelected ? t('nfi_all') : `${active}/${NFI_KEYS.length}`;
    badge.style.background = allSelected ? '#e8f5e9' : '#fff3e0';
    badge.style.color      = allSelected ? '#2e7d32' : '#e65100';
}

document.addEventListener('click', (e) => {
    const growthDropdown = document.getElementById('growth-dropdown');
    const growthBadge    = document.getElementById('growth-badge');
    if (growthDropdown && !growthDropdown.contains(e.target) && e.target !== growthBadge) {
        growthDropdown.classList.remove('show');
    }

    [
        { wrapperId: 'nfi-filter-wrapper',     dropdownId: 'nfi-dropdown',     arrowId: 'nfi-filter-arrow'     },
        { wrapperId: 'species-filter-wrapper', dropdownId: 'species-dropdown', arrowId: 'species-filter-arrow' },
    ].forEach(({ wrapperId, dropdownId, arrowId }) => {
        const wrapper = document.getElementById(wrapperId);
        if (wrapper && !wrapper.contains(e.target)) {
            const dd    = document.getElementById(dropdownId);
            const arrow = document.getElementById(arrowId);
            if (dd)    dd.style.display  = 'none';
            if (arrow) arrow.textContent = '▾';
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const navLinks   = document.querySelectorAll('.nav-links a');
    const sectionIds = ['map-section', 'natural-section', 'stocks-section', 'damage-section', 'quality-section', 'carbon-section', 'status-section'];
    const NAV_HEIGHT = 60;

    function updateActiveNav() {
        let currentId = sectionIds[0];
        for (const id of sectionIds) {
            const el = document.getElementById(id);
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            if (rect.top <= NAV_HEIGHT + 20) currentId = id;
        }
        navLinks.forEach(l => {
            const href = l.getAttribute('href');
            if (href) l.classList.toggle('active', href.replace('#', '') === currentId);
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetEl = document.querySelector(this.getAttribute('href'));
            if (targetEl) {
                const top = targetEl.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT - 8;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });

    window.addEventListener('scroll', updateActiveNav, { passive: true });
    updateActiveNav();
});