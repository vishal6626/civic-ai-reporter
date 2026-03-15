// Admin Panel JS (Full Access)

let allReports = [];

document.addEventListener('DOMContentLoaded', () => {
    // Rely on script.js globals for map and report initialization
    window.fetchReportsCallback = function(reports) {
        // Reverse array to put newest on top
        allReports = [...reports].reverse(); 
        window.filterReports(); // Apply current filter
    };
});

function getPriorityBadge(score) {
    if (score >= 8) return `<span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; color: white; background-color: #ef4444;">CRITICAL (${score})</span>`;
    if (score >= 6) return `<span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; color: white; background-color: #f97316;">HIGH (${score})</span>`;
    if (score >= 4) return `<span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; color: black; background-color: #eab308;">MEDIUM (${score})</span>`;
    return `<span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; color: white; background-color: #22c55e;">LOW (${score})</span>`;
}

function getStatusBadge(status) {
    let color = "#94a3b8";
    if (status === "Pending") color = "#ef4444"; 
    else if (status === "Verified") color = "#f97316"; 
    else if (status === "In Progress") color = "#3b82f6"; 
    else if (status === "Resolved") color = "#22c55e"; 
    
    return `<span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; color: white; background-color: ${color};">${status}</span>`;
}

function getConfidenceSeverity(conf) {
    if (conf > 0.85) return `<span style="color:#ef4444; font-weight:bold;">High</span>`;
    if (conf > 0.6) return `<span style="color:#f97316;">Medium</span>`;
    return `<span style="color:#3b82f6;">Low</span>`;
}

window.filterReports = function() {
    const statusSelect = document.getElementById('status-filter') ? document.getElementById('status-filter').value : "All";
    const searchInput = document.getElementById('search-input') ? document.getElementById('search-input').value.toLowerCase().trim() : "";
    
    let filtered = allReports;
    
    if (statusSelect !== "All") {
        filtered = filtered.filter(r => r.status === statusSelect);
    }
    
    if (searchInput !== "") {
        // If numeric, search by ID
        if (!isNaN(searchInput)) {
            filtered = filtered.filter(r => r.id.toString().includes(searchInput));
        } else {
            // Text input: filter by issue type or status
            filtered = filtered.filter(r => 
                r.issue.toLowerCase().includes(searchInput) || 
                r.status.toLowerCase().includes(searchInput)
            );
        }
    }
    
    renderAdminFeed(filtered);
}

function renderAdminFeed(reports) {
    const feedContainer = document.getElementById('feed-container');
    
    if (!reports || reports.length === 0) {
        feedContainer.innerHTML = '<p class="empty-state">No reports match the criteria.</p>';
        return;
    }
    
    feedContainer.innerHTML = '';
    
    reports.forEach((r) => {
        const badge = getStatusBadge(r.status);
        const priorityBadge = getPriorityBadge(r.priority_score);
        
        const ticketHTML = `
            <div class="ticket-item" id="ticket-${r.id}">
                <div class="ticket-info">
                    <span class="ticket-id">Ticket #${r.id} | <span class="priority-badge">Priority: ${priorityBadge}</span></span>
                    <span class="ticket-title">${r.issue.replace('_', ' ').toUpperCase()} <span style="font-weight: normal; color:#94a3b8;">(${r.confidence.toFixed(2)})</span></span>
                    <span class="ticket-date">${r.timestamp}</span>
                </div>
                <div class="ticket-actions" style="display: flex; gap: 0.5rem; align-items: center;">
                    <select class="status-select" onchange="updateStatus(${r.id}, this.value)">
                        <option value="Pending" ${r.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Verified" ${r.status === 'Verified' ? 'selected' : ''}>Verified</option>
                        <option value="In Progress" ${r.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                        <option value="Resolved" ${r.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                    </select>
                    <button class="btn btn-danger" onclick="deleteTicket(${r.id})" style="padding: 0.5rem 1rem; background-color: #7f1d1d; border: 1px solid #ef4444; color: white; border-radius: 6px; cursor: pointer;">Delete</button>
                    ${badge}
                </div>
            </div>
        `;
        feedContainer.insertAdjacentHTML('beforeend', ticketHTML);
    });
}

window.scrollToTicket = function(id) {
    const el = document.getElementById(`ticket-${id}`);
    if (el) {
        el.scrollIntoView({behavior: 'smooth', block: 'center'});
        const originalBg = el.style.backgroundColor;
        el.style.backgroundColor = '#1e293b';
        setTimeout(() => el.style.backgroundColor = originalBg, 1500);
    }
}

window.updateStatus = async function(id, newStatus) {
    try {
        const response = await fetch('/update_status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: id, status: newStatus })
        });
        
        const data = await response.json();
        if(data.success) {
            console.log(`Ticket #${id} updated to ${newStatus}`);
            // Re-fetch to update the badge immediately
            fetchReports();
        } else {
            alert(data.error || "Failed to update status.");
            fetchReports(); 
        }
    } catch (error) {
        console.error("Error updating status:", error);
    }
}

window.deleteTicket = async function(id) {
    if(!confirm(`Are you certain you want to permanently delete Ticket #${id}?`)) return;
    
    try {
        const response = await fetch('/delete_report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: id })
        });
        
        const data = await response.json();
        if(data.success) {
            console.log(`Ticket #${id} DELETED`);
            fetchReports();
        } else {
            alert(data.error || "Failed to delete ticket.");
        }
    } catch (error) {
        console.error("Error deleting:", error);
    }
}
