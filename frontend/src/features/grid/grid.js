/**
 * KONVO™ RESONANCE GRID FEATURE
 * src/features/grid/grid.js
 */

import { apiFetch } from '/src/services/api.js';

function initDiscoverTabs() {
    const tabBtns = document.querySelectorAll('.tab-navigation .tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            
            const targetId = btn.dataset.tab;
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => {
                if (content.id === targetId) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
            
            // Trigger layout recalculation for MapLibre/Leaflet maps when the tab changes
            if (targetId === 'discover-deck-map-section' && window.map) {
                setTimeout(() => window.map.resize(), 100);
            }
        });
    });
}
window.initDiscoverTabs = initDiscoverTabs;



async function initCommunitiesPage() {
    const grid = document.getElementById('communities-analytics-grid');
    if (!grid) return;

    // Form submit handler for creating a new community
    const createForm = document.getElementById('create-community-form');
    if (createForm && !createForm.dataset.listenerBound) {
        createForm.dataset.listenerBound = 'true';
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('wiz-comm-name').value;
            const description = document.getElementById('wiz-comm-desc').value;
            try {
                const res = await apiFetch('/api/communities', {
                    method: 'POST',
                    body: JSON.stringify({ name, description })
                });
                if (res) {
                    createForm.reset();
                    initCommunitiesPage();
                }
            } catch (err) {
                alert(`Domain registration failed: ${err.message}`);
            }
        });
    }

    try {
        const communities = await apiFetch('/api/communities');
        grid.innerHTML = '';
        if (!communities || communities.length === 0) {
            grid.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; font-style: italic;">No community domains active in the network registry.</div>';
            return;
        }

        communities.forEach(c => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.gap = '1rem';
            
            card.innerHTML = `
                <div>
                    <h3 style="font-family: var(--font-serif); font-size: 1.4rem; color: var(--text-primary); margin-bottom: 0.25rem;">${c.name}</h3>
                    <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--accent-amber); margin-bottom: 0.75rem;">domain/${c.slug}</div>
                    <p style="font-size: 0.9rem; line-height: 1.5; color: var(--text-secondary);">${c.description}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem; font-family: var(--font-mono); font-size: 0.75rem;">
                    <div>HEALTH INDEX: <strong style="color: var(--accent-teal);">${c.health_score}%</strong></div>
                    <div>QUALITY LEVEL: <strong style="color: var(--accent-indigo);">${c.quality_index}%</strong></div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (e) {
        grid.innerHTML = `<div style="color: var(--accent-rose); font-family: var(--font-mono);">Failed to load network domains: ${e.message}</div>`;
    }
}
window.initCommunitiesPage = initCommunitiesPage;



async function initGraphPage() {
    const container = document.getElementById('relationship-network');
    if (!container) return;

    try {
        const data = await apiFetch('/api/graph');
        if (!data || !data.nodes || data.nodes.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-family: var(--font-mono); text-align: center; padding: 3rem;">No active profiles in the relationship index.</div>';
            return;
        }

        container.innerHTML = '';
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 550;

        // Create SVG element
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.style.backgroundColor = 'var(--bg-tertiary)';
        container.appendChild(svg);

        // Force Directed layout node mapping
        const nodes = data.nodes.map((n) => ({
            ...n,
            x: width / 2 + (Math.random() - 0.5) * 150,
            y: height / 2 + (Math.random() - 0.5) * 150,
            vx: 0,
            vy: 0,
            radius: 12
        }));

        const nodeMap = {};
        nodes.forEach(n => { nodeMap[n.id] = n; });

        const links = data.edges.map(e => ({
            source: nodeMap[e.source],
            target: nodeMap[e.target],
            type: e.type,
            weight: e.weight
        })).filter(l => l.source && l.target);

        // Physics parameters
        const k = 0.04;
        const length = 120;
        const rep = 800;
        const damp = 0.85;
        const centerGravity = 0.01;

        // SVG Groups
        const linkGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        svg.appendChild(linkGroup);
        svg.appendChild(nodeGroup);

        const typeColors = {
            debate: 'var(--accent-rose)',
            collaborate: 'var(--accent-teal)',
            learn: 'var(--accent-amber)',
            mentor: 'var(--accent-indigo)',
            interact: 'var(--text-muted)'
        };

        const lines = links.map(l => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('stroke', typeColors[l.type] || 'var(--border-secondary)');
            line.setAttribute('stroke-width', (1.5 * l.weight).toString());
            line.setAttribute('stroke-opacity', '0.5');
            linkGroup.appendChild(line);
            return { element: line, link: l };
        });

        // Detail tooltip element
        const tooltip = document.createElement('div');
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = 'var(--bg-card)';
        tooltip.style.border = '1px solid var(--border-color)';
        tooltip.style.padding = '0.75rem';
        tooltip.style.borderRadius = '6px';
        tooltip.style.fontSize = '0.75rem';
        tooltip.style.fontFamily = 'var(--font-mono)';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.2s';
        tooltip.style.zIndex = '1000';
        container.appendChild(tooltip);

        const circles = nodes.map(n => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.style.cursor = 'pointer';

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('r', n.radius.toString());
            const isMe = currentUser && `USER-${currentUser.id}` === n.id;
            circle.setAttribute('fill', isMe ? 'var(--accent-amber)' : 'var(--accent-indigo)');
            circle.setAttribute('stroke', 'var(--border-color)');
            circle.setAttribute('stroke-width', '2');
            g.appendChild(circle);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.textContent = n.label;
            text.setAttribute('y', '22');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', 'var(--text-primary)');
            text.setAttribute('font-size', '10');
            text.setAttribute('font-family', 'var(--font-mono)');
            g.appendChild(text);

            nodeGroup.appendChild(g);

            // Tooltip interactivity
            g.addEventListener('mouseenter', () => {
                circle.setAttribute('stroke', 'var(--text-primary)');
                tooltip.style.opacity = '1';
                tooltip.innerHTML = `
                    <div style="font-weight:bold; color:var(--text-primary); margin-bottom:0.25rem;">${n.label}</div>
                    <div>ID: ${n.details.konvo_id}</div>
                    <div>Style: ${n.details.style}</div>
                    <div>Debate: ${n.details.debate}</div>
                    <div>Trust score: ${n.details.trust}%</div>
                `;
            });

            g.addEventListener('mousemove', (e) => {
                const rect = container.getBoundingClientRect();
                tooltip.style.left = `${e.clientX - rect.left + 15}px`;
                tooltip.style.top = `${e.clientY - rect.top + 15}px`;
            });

            g.addEventListener('mouseleave', () => {
                circle.setAttribute('stroke', 'var(--border-color)');
                tooltip.style.opacity = '0';
            });

            // Basic dragging logic
            let dragging = false;
            g.addEventListener('mousedown', (e) => {
                dragging = true;
                e.preventDefault();
            });
            window.addEventListener('mousemove', (e) => {
                if (dragging) {
                    const rect = container.getBoundingClientRect();
                    n.x = Math.max(20, Math.min(width - 20, e.clientX - rect.left));
                    n.y = Math.max(20, Math.min(height - 20, e.clientY - rect.top));
                    n.vx = 0;
                    n.vy = 0;
                }
            });
            window.addEventListener('mouseup', () => {
                dragging = false;
            });

            return { element: g, node: n };
        });

        function tick() {
            for (let i = 0; i < nodes.length; i++) {
                const n1 = nodes[i];
                for (let j = i + 1; j < nodes.length; j++) {
                    const n2 = nodes[j];
                    const dx = n1.x - n2.x;
                    const dy = n1.y - n2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    if (dist < 250) {
                        const force = rep / (dist * dist);
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;
                        n1.vx += fx;
                        n1.vy += fy;
                        n2.vx -= fx;
                        n2.vy -= fy;
                    }
                }
            }

            links.forEach(l => {
                const dx = l.target.x - l.source.x;
                const dy = l.target.y - l.source.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = k * (dist - length);
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                l.source.vx += fx;
                l.source.vy += fy;
                l.target.vx -= fx;
                l.target.vy -= fy;
            });

            nodes.forEach(n => {
                n.vx += (width / 2 - n.x) * centerGravity;
                n.vy += (height / 2 - n.y) * centerGravity;
                
                n.x += n.vx;
                n.y += n.vy;
                
                n.vx *= damp;
                n.vy *= damp;

                n.x = Math.max(20, Math.min(width - 20, n.x));
                n.y = Math.max(20, Math.min(height - 20, n.y));
            });

            lines.forEach(l => {
                l.element.setAttribute('x1', l.link.source.x.toString());
                l.element.setAttribute('y1', l.link.source.y.toString());
                l.element.setAttribute('x2', l.link.target.x.toString());
                l.element.setAttribute('y2', l.link.target.y.toString());
            });

            circles.forEach(c => {
                c.element.setAttribute('transform', `translate(${c.node.x}, ${c.node.y})`);
            });

            requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);

    } catch (e) {
        container.innerHTML = `<div style="color: var(--accent-rose); font-family: var(--font-mono); text-align: center; padding: 3rem;">Error loading network topology graph: ${e.message}</div>`;
    }
}
window.initGraphPage = initGraphPage;

// ----------------- 5. RESONANCE DISCOVERY MAP (LEAFLET) -----------------


async function initMapPage() {
    const mapElement = document.getElementById('discovery-map');
    if (!mapElement) return;

    mapElement.innerHTML = '';

    // Standard coordinates grid for seeded user nodes corresponding to DIGIPIN codes
    const DIGIPIN_MAPPING = {
        '8Y1A3B5C7D': { lat: 12.9716, lng: 77.5946, city: 'Bangalore (Indiranagar Grid)' },
        '8Y1A3B5C7E': { lat: 12.9516, lng: 77.6146, city: 'Bangalore (Koramangala Grid)' },
        '8Y1A3B9C2A': { lat: 12.9916, lng: 77.5746, city: 'Bangalore (Malleshwaram Grid)' },
        '8Y2A1B3C5D': { lat: 18.5204, lng: 73.8567, city: 'Pune (Shivajinagar Grid)' },
        '1A2B3C4D5E': { lat: 28.7041, lng: 77.1025, city: 'Delhi (Connaught Grid)' }
    };

    function getCoordsForDigipin(digipin) {
        if (!digipin) return null;
        const formatted = digipin.trim().toUpperCase();
        if (DIGIPIN_MAPPING[formatted]) {
            return DIGIPIN_MAPPING[formatted];
        }
        // Fallback translation algorithm mapping arbitrary pins
        let hash = 0;
        for (let i = 0; i < formatted.length; i++) {
            hash = formatted.charCodeAt(i) + ((hash << 5) - hash);
        }
        const mockLat = 12.9 + (Math.abs(hash % 1000) / 5000);
        const mockLng = 77.5 + (Math.abs((hash >> 3) % 1000) / 5000);
        return { lat: mockLat, lng: mockLng, city: `Grid Zone ${formatted.substring(0, 4)}` };
    }

    let centerLat = 12.9716;
    let centerLng = 77.5946;
    let myCoords = null;

    if (currentUser && currentUser.profile && currentUser.profile.digipin) {
        myCoords = getCoordsForDigipin(currentUser.profile.digipin);
        if (myCoords) {
            centerLat = myCoords.lat;
            centerLng = myCoords.lng;
        }
    }

    function createGeoJSONCircle(center, radiusInKm, points = 64) {
        const latitude = center[1];
        const longitude = center[0];
        const ret = [];
        const distanceX = radiusInKm / (111.32 * Math.cos(latitude * Math.PI / 180));
        const distanceY = radiusInKm / 110.57;

        for (let i = 0; i < points; i++) {
            const theta = (i / points) * (2 * Math.PI);
            const x = distanceX * Math.cos(theta);
            const y = distanceY * Math.sin(theta);
            ret.push([longitude + x, latitude + y]);
        }
        ret.push(ret[0]);

        return {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [ret]
            }
        };
    }

    const map = new maplibregl.Map({
        container: 'discovery-map',
        style: {
            version: 8,
            sources: {
                'basemap-tiles': {
                    type: 'raster',
                    tiles: window.ThemeManager && window.ThemeManager.getTheme() === 'light'
                        ? [
                            'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                            'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                            'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                            'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
                          ]
                        : [
                            'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                            'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                            'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                            'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
                          ],
                    tileSize: 256,
                    attribution: '&copy; OpenStreetMap &copy; CARTO'
                }
            },
            layers: [
                {
                    id: 'basemap-layer',
                    type: 'raster',
                    source: 'basemap-tiles',
                    minzoom: 0,
                    maxzoom: 20
                }
            ]
        },
        center: [centerLng, centerLat],
        zoom: 11
    });

    window.map = map;

    window.updateMapStyle = function(theme) {
        if (window.map) {
            const source = window.map.getSource('basemap-tiles');
            if (source) {
                const lightTiles = [
                    'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                    'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                    'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                    'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
                ];
                const darkTiles = [
                    'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                    'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                    'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                    'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
                ];
                const tiles = theme === 'light' ? lightTiles : darkTiles;
                source.setTiles(tiles);
            }
        }
    };

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', async () => {
        const features = [];

        if (myCoords) {
            const jitterLat = centerLat + (Math.random() - 0.5) * 0.002;
            const jitterLng = centerLng + (Math.random() - 0.5) * 0.002;

            const el = document.createElement('div');
            el.className = 'my-location-marker';
            el.innerHTML = `<div style="background-color: var(--accent-amber); border: 2.5px solid white; width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 0 10px var(--accent-amber); filter: drop-shadow(0 0 4px var(--accent-amber)); cursor: pointer;"></div>`;

            const popup = new maplibregl.Popup({ offset: 15 }).setHTML(
                `<div style="font-family: var(--font-sans); color: var(--text-primary); text-align: center; font-size: 0.8rem;">
                    <strong>Your Masked Node</strong><br>Grid: ${currentUser.profile.digipin || 'N/A'}<br>${myCoords.city}
                 </div>`
            );

            new maplibregl.Marker({ element: el })
                .setLngLat([jitterLng, jitterLat])
                .setPopup(popup)
                .addTo(map);

            features.push({
                ...createGeoJSONCircle([jitterLng, jitterLat], 0.8),
                properties: { color: 'var(--accent-amber)' }
            });
        }

        try {
            const candidates = await apiFetch('/api/compatibility/discovery');
            if (candidates && candidates.length > 0) {
                candidates.forEach(user => {
                    if (!user.user_id) return;

                    let userDigipin = user.digipin;
                    if (!userDigipin) {
                        const fallbackDigipins = {
                            1: '8Y1A3B5C7D',
                            2: '8Y1A3B5C7E',
                            3: '8Y1A3B9C2A',
                            4: '8Y2A1B3C5D',
                            5: '1A2B3C4D5E'
                        };
                        userDigipin = fallbackDigipins[user.user_id] || '8Y1A3B5C7D';
                    }

                    const userCoords = getCoordsForDigipin(userDigipin);
                    if (userCoords) {
                        const jitterLat = userCoords.lat + (Math.random() - 0.5) * 0.006;
                        const jitterLng = userCoords.lng + (Math.random() - 0.5) * 0.006;

                        let color = 'var(--text-muted)';
                        let shadowColor = 'rgba(85, 85, 98, 0.4)';
                        if (user.compatibility_score >= 80) {
                            color = 'var(--accent-indigo)';
                            shadowColor = 'rgba(79, 70, 229, 0.5)';
                        } else if (user.compatibility_score >= 60) {
                            color = 'var(--accent-teal)';
                            shadowColor = 'rgba(13, 148, 136, 0.5)';
                        }

                        const el = document.createElement('div');
                        el.className = 'user-location-marker';
                        el.innerHTML = `<div style="background-color: ${color}; border: 1.5px solid var(--border-color); width: 16px; height: 16px; border-radius: 50%; box-shadow: 0 0 10px ${shadowColor}; cursor: pointer;"></div>`;

                        const popupContent = `
                            <div style="font-family: var(--font-sans); min-width: 180px; text-align: center; color: var(--text-primary);">
                                <div style="font-family: var(--font-serif); font-size: 1.15rem; font-weight: bold; margin-bottom: 0.25rem;">${user.display_name}</div>
                                <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--accent-amber); margin-bottom: 0.5rem;">Resonance: ${user.compatibility_score}% (${user.compatibility_tier})</div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem;">MBTI: ${user.mbti_type} // Intent: ${user.relationship_intent}</div>
                                <button class="btn btn-primary" style="font-size: 0.7rem; padding: 0.35rem 0.75rem; width: 100%;" onclick="window.location.href='/discover'">Review AI Twin</button>
                            </div>
                        `;

                        const popup = new maplibregl.Popup({ offset: 15 }).setHTML(popupContent);

                        new maplibregl.Marker({ element: el })
                            .setLngLat([jitterLng, jitterLat])
                            .setPopup(popup)
                            .addTo(map);

                        features.push({
                            ...createGeoJSONCircle([jitterLng, jitterLat], 0.8),
                            properties: { color: color }
                        });
                    }
                });
            }

            if (features.length > 0) {
                map.addSource('proximity-circles', {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: features
                    }
                });

                map.addLayer({
                    id: 'circles-fill',
                    type: 'fill',
                    source: 'proximity-circles',
                    paint: {
                        'fill-color': ['get', 'color'],
                        'fill-opacity': 0.08
                    }
                });

                map.addLayer({
                    id: 'circles-outline',
                    type: 'line',
                    source: 'proximity-circles',
                    paint: {
                        'line-color': ['get', 'color'],
                        'line-width': 1,
                        'line-dasharray': [3, 3]
                    }
                });
            }

        } catch (e) {
            console.error("Failed loading discovery map markers", e);
        }
    });
}
window.initMapPage = initMapPage;


