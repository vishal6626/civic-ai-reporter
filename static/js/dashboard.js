// User dashboard JS (Read-Only feed mapping)

document.addEventListener('DOMContentLoaded', () => {
    // Rely on script.js globals for initialization
    window.fetchReportsCallback = populateUserFeed;
});

function getStatusBadge(status) {
    let color = "#94a3b8";
    if (status === "Pending") color = "#ef4444"; // Red
    else if (status === "Verified") color = "#f97316"; // Orange
    else if (status === "In Progress") color = "#3b82f6"; // Blue
    else if (status === "Resolved") color = "#22c55e"; // Green
    
    return `<span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; color: white; background-color: ${color};">${status}</span>`;
}

function populateUserFeed(reports) {
    const feedContainer = document.getElementById('feed-container');
    
    if (!reports || reports.length === 0) {
        feedContainer.innerHTML = '<p class="empty-state">No reports found.</p>';
        return;
    }
    
    feedContainer.innerHTML = '';
    
    // Slice only the latest 20 for the user view
    const latestReports = reports.slice(0, 20);

    latestReports.forEach((r) => {
        const badge = getStatusBadge(r.status);
        
        const ticketHTML = `
            <div class="ticket-item" style="pointer-events: none;">
                <div class="ticket-info">
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <span class="ticket-id">Ticket #${r.id}</span>
                        ${badge}
                    </div>
                    <span class="ticket-title">${r.issue.replace('_', ' ').toUpperCase()} <span style="font-weight: normal; color:#94a3b8;">(${r.confidence.toFixed(2)})</span></span>
                    <span class="ticket-date">${r.timestamp} • Location: ${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}</span>
                </div>
            </div>
        `;
        feedContainer.insertAdjacentHTML('beforeend', ticketHTML);
    });
}
