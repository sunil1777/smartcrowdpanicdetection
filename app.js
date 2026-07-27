const API_BASE = '/api';

const CAMERAS = [
    { id: 'NorthEntrance', name: 'North Entrance' },
    { id: 'MainLobby', name: 'Main Lobby' },
    { id: 'CentralPlaza', name: 'Central Plaza' },
    { id: 'FoodCourt', name: 'Food Court' },
    { id: 'SouthExit', name: 'South Exit' },
    { id: 'EastCorridor', name: 'East Corridor' }
];

// Clock
setInterval(() => {
    const now = new Date();
    document.getElementById('clock').innerHTML = `
        ${now.toLocaleTimeString('en-US', { hour12: false })}
        <span>${now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
    `;
}, 1000);

let totalIncidents = 0;

// Fetch Status
async function fetchStatus() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        const data = await response.json();
        
        // Top Nav updates
        const sysStatus = document.getElementById('global-system-status');
        if(data.global_severity === 'CRITICAL' || data.global_severity === 'HIGH') {
            sysStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> WARNING DETECTED`;
            sysStatus.className = 'value text-danger';
        } else if (data.global_severity === 'MEDIUM') {
            sysStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ELEVATED`;
            sysStatus.className = 'value text-warning';
        } else {
            sysStatus.innerHTML = `<i class="fa-solid fa-check-circle"></i> SYSTEM NORMAL`;
            sysStatus.className = 'value text-success';
        }

        let totalPeople = 0;
        let totalScore = 0;

        // Render Zone Grid and Feeds
        const zoneGrid = document.getElementById('zone-grid');
        zoneGrid.innerHTML = '';
        
        CAMERAS.forEach(cam => {
            const camData = data.cameras[cam.id];
            if (!camData) return;

            totalPeople += camData.crowd_density;
            totalScore += camData.panic_score;

            // Update Feeds
            const dot = document.getElementById(`dot-${cam.id}`);
            const dens = document.getElementById(`dens-${cam.id}`);
            const score = document.getElementById(`score-${cam.id}`);
            const bar = document.getElementById(`bar-${cam.id}`);
            const card = document.getElementById(`cam-${cam.id}`);

            dens.textContent = camData.crowd_density;
            const perc = Math.min(Math.round(camData.panic_score * 100), 100);
            score.textContent = `${perc}%`;
            bar.style.width = `${perc}%`;

            let colorClass = 'normal';
            if (camData.severity === 'CRITICAL' || camData.severity === 'HIGH') colorClass = 'panic';
            else if (camData.severity === 'MEDIUM') colorClass = 'warning';

            dot.className = `dot ${colorClass}`;
            bar.className = `feed-bar-fill ${colorClass}-bg`;
            card.className = `feed-card border-${colorClass}`;

            // Build Zone Cards
            const zoneHtml = `
                <div class="zone-card">
                    <div class="zone-card-top">
                        <span><span class="dot ${colorClass}"></span> ${cam.name}</span>
                        <span style="color: var(--text-muted)"><i class="fa-solid fa-rotate"></i> just now</span>
                    </div>
                    <div class="zone-card-bottom">
                        <span class="zone-status-text ${colorClass === 'normal' ? 'text-success' : (colorClass === 'warning' ? 'text-warning' : 'text-danger')}">${colorClass.toUpperCase()}</span>
                        <div class="zone-view-btn"><i class="fa-solid fa-eye"></i> View</div>
                    </div>
                </div>
            `;
            zoneGrid.innerHTML += zoneHtml;
        });

        // Update Top Stats
        document.getElementById('stat-total-people').textContent = totalPeople;
        const avgDensity = ((totalScore / CAMERAS.length) * 100).toFixed(1);
        document.getElementById('stat-avg-density').textContent = `${avgDensity}%`;
        document.getElementById('avg-density-ring').setAttribute('stroke-dasharray', `${avgDensity}, 100`);
        document.getElementById('analytics-avg-density').innerHTML = `${avgDensity}% <i class="fa-solid fa-arrow-trend-${avgDensity > 50 ? 'up' : 'down'}"></i>`;
        
        const speedEl = document.getElementById('analytics-speed');
        const flowEl = document.getElementById('analytics-flow');
        const flowArrows = document.getElementById('flow-arrows');
        
        if (data.global_severity === 'CRITICAL' || data.global_severity === 'HIGH') {
            speedEl.innerHTML = `<span class="text-danger">High / Erratic</span>`;
            flowEl.innerHTML = `<span class="text-danger">Scattering</span>`;
            flowArrows.style.display = 'inline';
        } else {
            speedEl.innerHTML = `Normal`;
            flowEl.innerHTML = `Directional <i class="fa-solid fa-arrow-right"></i><i class="fa-solid fa-arrow-right"></i>`;
            flowArrows.style.display = 'none';
        }
        
        // Simulate Wind Speed oscillation
        const windVal = (3.5 + Math.sin(Date.now() / 5000) * 1.5).toFixed(1);
        document.getElementById('analytics-wind').innerHTML = `${windVal} <span class="unit" style="font-size: 10px; color: var(--text-muted);">km/h</span>`;

    } catch (error) {
        console.error('Error:', error);
    }
}

// Fetch Alerts
async function fetchAlerts() {
    try {
        const response = await fetch(`${API_BASE}/alerts`);
        const alerts = await response.json();
        
        totalIncidents = alerts.length;
        document.getElementById('stat-incidents').textContent = totalIncidents;
        
        const unacked = alerts.filter(a => a.acknowledged === 0);
        document.getElementById('val-alerts').textContent = unacked.length;
        
        // Active Alerts Widget
        const alertsWidget = document.getElementById('alerts-widget');
        if (unacked.length === 0) {
            alertsWidget.innerHTML = `
                <div class="no-alerts">
                    <i class="fa-regular fa-circle-check"></i>
                    <p>No active alerts</p>
                </div>
            `;
        } else {
            const topAlert = unacked[0];
            const alertTime = new Date(topAlert.timestamp + 'Z').toLocaleTimeString('en-US', { hour12: false });
            alertsWidget.innerHTML = `
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span class="text-danger" style="font-weight: bold; font-size: 11px;"><i class="fa-solid fa-triangle-exclamation"></i> PANIC</span>
                        <span style="color: var(--text-muted); font-size: 10px;"><i class="fa-regular fa-clock"></i> ${alertTime}</span>
                    </div>
                    <div style="font-weight: 600; margin-bottom: 4px;">${topAlert.camera_id}</div>
                    <div style="color: var(--text-secondary); font-size: 10px; line-height: 1.4;">${topAlert.severity}: Abnormal scattering movement detected. Potential stampede risk.</div>
                </div>
            `;
        }

        // System Activity Log
        const logList = document.getElementById('log-list');
        logList.innerHTML = '';
        alerts.slice(0, 10).forEach(alert => {
            const date = new Date(alert.timestamp + 'Z');
            const timeStr = date.toLocaleTimeString('en-US', { hour12: false });
            
            let icon = '<i class="fa-solid fa-circle-check" style="color: var(--color-success)"></i>';
            if(alert.severity === 'CRITICAL' || alert.severity === 'HIGH') icon = '<i class="fa-solid fa-triangle-exclamation" style="color: var(--color-danger)"></i>';
            else if(alert.severity === 'MEDIUM') icon = '<i class="fa-solid fa-triangle-exclamation" style="color: var(--color-warning)"></i>';
            
            const ackBtn = alert.acknowledged === 0 
                ? `<button class="log-ack-btn" onclick="ackAlert(${alert.id})">Acknowledge</button>` 
                : `<i class="fa-solid fa-check text-success"></i>`;

            logList.innerHTML += `
                <div class="log-item">
                    <div class="log-icon">${icon}</div>
                    <div class="log-message">${alert.severity} detected at ${alert.camera_id}</div>
                    <div class="log-time">${timeStr}</div>
                    <div>${ackBtn}</div>
                </div>
            `;
        });
    } catch(err) {
        console.error('Fetch Alerts Error:', err);
    }
}

async function ackAlert(id) {
    await fetch(`${API_BASE}/alerts/${id}/acknowledge`, {method: 'POST'});
    fetchAlerts();
}

async function triggerPanic() {
    const btn = document.querySelector('.btn-danger');
    const originalText = btn.innerHTML;
    try {
        btn.innerHTML = `<i class="fa-solid fa-check"></i> Triggered!`;
        btn.style.backgroundColor = 'var(--color-success)';
        
        await fetch(`${API_BASE}/simulate_panic`, { method: 'POST' });
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.backgroundColor = '';
        }, 2000);
    } catch (error) {
        console.error('Error simulating panic:', error);
        btn.innerHTML = originalText;
    }
}

// Export data to CSV
async function exportData() {
    try {
        const response = await fetch(`${API_BASE}/alerts`);
        const alerts = await response.json();
        
        if (alerts.length === 0) {
            alert("No incidents recorded yet to export.");
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "ID,Camera Zone,Severity,Panic Score,Crowd Density,Description,Timestamp,Acknowledged\n";
        
        alerts.forEach(alert => {
            const row = [
                alert.id,
                `"${alert.camera_id}"`,
                alert.severity,
                alert.panic_score.toFixed(4),
                alert.crowd_density,
                `"${alert.description}"`,
                `"${alert.timestamp}"`,
                alert.acknowledged === 1 ? 'Yes' : 'No'
            ].join(",");
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `SOC_Incident_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
    } catch (error) {
        console.error('Error exporting data:', error);
        alert("Failed to export data.");
    }
}

setInterval(fetchStatus, 1000);
setInterval(fetchAlerts, 5000);
fetchStatus();
fetchAlerts();
