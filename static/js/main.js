// ==========================================================================
// App State & Elements
// ==========================================================================
const state = {
    allNotes: [],      // Flattened array of all release notes items
    activeFilter: 'All', // Category filter: 'All', 'Feature', 'Change', etc.
    searchQuery: '',   // Keyword search filter
    theme: 'dark'      // Default theme
};

// DOM Elements
const elements = {
    themeToggle: document.getElementById('theme-toggle'),
    refreshBtn: document.getElementById('refresh-btn'),
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    categoryPills: document.getElementById('category-pills'),
    notesList: document.getElementById('notes-list'),
    emptyState: document.getElementById('empty-state'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    scrollTopBtn: document.getElementById('scroll-top-btn'),
    cacheStatus: document.getElementById('cache-status'),
    
    // Stats elements
    statTotal: document.getElementById('stat-total'),
    statFeature: document.getElementById('stat-feature'),
    statChange: document.getElementById('stat-change'),
    statBreaking: document.getElementById('stat-breaking'),
    statIssue: document.getElementById('stat-issue'),
    statAnnouncement: document.getElementById('stat-announcement'),
    statItems: document.querySelectorAll('.stat-item')
};

// ==========================================================================
// Initialization & Event Listeners
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    fetchReleaseNotes();
});

function setupEventListeners() {
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Refresh button
    elements.refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Search input
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.searchClear.addEventListener('click', clearSearch);
    
    // Category Filter pills
    elements.categoryPills.addEventListener('click', handleCategoryClick);
    
    // Reset filters button in empty state
    elements.resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Scroll to top button
    window.addEventListener('scroll', handleWindowScroll);
    elements.scrollTopBtn.addEventListener('click', scrollToTop);
    
    // Stats card click to filter
    elements.statItems.forEach(item => {
        item.addEventListener('click', () => {
            const cat = item.getAttribute('data-category');
            if (cat) {
                setCategoryFilter(cat);
            }
        });
    });
}

// ==========================================================================
// Theme Management
// ==========================================================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    state.theme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon();
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('theme', state.theme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = elements.themeToggle.querySelector('i');
    if (state.theme === 'dark') {
        icon.className = 'fa-solid fa-sun';
    } else {
        icon.className = 'fa-solid fa-moon';
    }
}

// ==========================================================================
// Feed Fetching & Parsing
// ==========================================================================
async function fetchReleaseNotes(bypassCache = false) {
    showLoadingState();
    
    const url = bypassCache ? '/api/releases?refresh=true' : '/api/releases';
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch release notes.');
        }
        
        // Process and flatten the data
        processReleaseNotes(data.entries);
        updateStats();
        updateCacheStatus(data.source);
        renderNotes();
        
    } catch (error) {
        console.error('Error fetching release notes:', error);
        renderErrorState(error.message);
    }
}

function processReleaseNotes(entries) {
    const flattened = [];
    let itemId = 0;
    
    entries.forEach(entry => {
        const dateStr = entry.title;
        const link = entry.link;
        const updated = entry.updated;
        
        entry.items.forEach(item => {
            itemId++;
            flattened.push({
                id: `note-${itemId}`,
                date: dateStr,
                updated: updated,
                link: link,
                category: item.category,
                content: item.content
            });
        });
    });
    
    state.allNotes = flattened;
}

// ==========================================================================
// Stats Update
// ==========================================================================
function updateStats() {
    const counts = {
        All: state.allNotes.length,
        Feature: 0,
        Change: 0,
        Breaking: 0,
        Issue: 0,
        Announcement: 0
    };
    
    state.allNotes.forEach(note => {
        const cat = note.category;
        if (counts.hasOwnProperty(cat)) {
            counts[cat]++;
        } else {
            // Log or group other categories under General/Announcement?
            // BigQuery uses Feature, Change, Breaking, Issue, Announcement.
        }
    });
    
    // Update elements
    elements.statTotal.innerText = counts.All;
    elements.statFeature.innerText = counts.Feature;
    elements.statChange.innerText = counts.Change;
    elements.statBreaking.innerText = counts.Breaking;
    elements.statIssue.innerText = counts.Issue;
    elements.statAnnouncement.innerText = counts.Announcement;
}

function updateCacheStatus(source) {
    elements.cacheStatus.className = 'feed-status';
    const textSpan = elements.cacheStatus.querySelector('.status-text');
    
    if (source === 'cache') {
        elements.cacheStatus.classList.add('cached');
        textSpan.innerText = 'Loaded from cache';
    } else {
        elements.cacheStatus.classList.add('online');
        textSpan.innerText = 'Live feed loaded';
    }
}

// ==========================================================================
// Filtering & Search
// ==========================================================================
function handleCategoryClick(e) {
    const button = e.target.closest('.pill-btn');
    if (!button) return;
    
    const filter = button.getAttribute('data-filter');
    setCategoryFilter(filter);
}

function setCategoryFilter(filter) {
    state.activeFilter = filter;
    
    // Update active class on pills
    const pills = elements.categoryPills.querySelectorAll('.pill-btn');
    pills.forEach(pill => {
        if (pill.getAttribute('data-filter') === filter) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });
    
    // Update active class on sidebar items for better sync
    elements.statItems.forEach(item => {
        if (item.getAttribute('data-category') === filter) {
            item.classList.add('active-stat');
        } else {
            item.classList.remove('active-stat');
        }
    });
    
    renderNotes();
}

function handleSearchInput(e) {
    state.searchQuery = e.target.value.toLowerCase().trim();
    
    // Toggle Search Clear Button
    if (state.searchQuery) {
        elements.searchClear.style.display = 'block';
    } else {
        elements.searchClear.style.display = 'none';
    }
    
    renderNotes();
}

function clearSearch() {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.searchClear.style.display = 'none';
    renderNotes();
}

function resetFilters() {
    clearSearch();
    setCategoryFilter('All');
}

// ==========================================================================
// Rendering Logic
// ==========================================================================
function showLoadingState() {
    elements.refreshBtn.disabled = true;
    const refreshIcon = elements.refreshBtn.querySelector('i');
    if (refreshIcon) refreshIcon.classList.add('fa-spin');
    
    elements.emptyState.style.display = 'none';
    
    // Display skeletons
    elements.notesList.innerHTML = `
        <div class="skeleton-card glass-panel">
            <div class="skeleton-header">
                <div class="skeleton-badge"></div>
                <div class="skeleton-date"></div>
            </div>
            <div class="skeleton-line short"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line medium"></div>
        </div>
        <div class="skeleton-card glass-panel">
            <div class="skeleton-header">
                <div class="skeleton-badge"></div>
                <div class="skeleton-date"></div>
            </div>
            <div class="skeleton-line short"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
        </div>
        <div class="skeleton-card glass-panel">
            <div class="skeleton-header">
                <div class="skeleton-badge"></div>
                <div class="skeleton-date"></div>
            </div>
            <div class="skeleton-line short"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line medium"></div>
        </div>
    `;
}

function renderErrorState(message) {
    elements.refreshBtn.disabled = false;
    const refreshIcon = elements.refreshBtn.querySelector('i');
    if (refreshIcon) refreshIcon.classList.remove('fa-spin');
    
    elements.notesList.innerHTML = '';
    elements.emptyState.style.display = 'flex';
    elements.emptyState.querySelector('h3').innerText = 'Connection Error';
    elements.emptyState.querySelector('p').innerText = `We couldn't load the release notes: ${message}. Check your internet connection.`;
    elements.emptyState.querySelector('i').className = 'fa-solid fa-triangle-exclamation empty-icon text-breaking';
}

function renderNotes() {
    elements.refreshBtn.disabled = false;
    const refreshIcon = elements.refreshBtn.querySelector('i');
    if (refreshIcon) refreshIcon.classList.remove('fa-spin');
    
    // Filter notes
    const filtered = state.allNotes.filter(note => {
        // Category Filter
        const matchesCategory = state.activeFilter === 'All' || note.category === state.activeFilter;
        
        // Search Query Filter
        let matchesSearch = true;
        if (state.searchQuery) {
            const dateMatch = note.date.toLowerCase().includes(state.searchQuery);
            const catMatch = note.category.toLowerCase().includes(state.searchQuery);
            const contentMatch = note.content.toLowerCase().includes(state.searchQuery);
            matchesSearch = dateMatch || catMatch || contentMatch;
        }
        
        return matchesCategory && matchesSearch;
    });
    
    // Render
    elements.notesList.innerHTML = '';
    
    if (filtered.length === 0) {
        elements.emptyState.style.display = 'flex';
        elements.emptyState.querySelector('h3').innerText = 'No Release Notes Found';
        elements.emptyState.querySelector('p').innerText = 'Try modifying your search keywords or choosing a different category filter.';
        elements.emptyState.querySelector('i').className = 'fa-solid fa-folder-open empty-icon';
        return;
    }
    
    elements.emptyState.style.display = 'none';
    
    const fragment = document.createDocumentFragment();
    
    filtered.forEach((note, index) => {
        const card = document.createElement('div');
        card.className = 'note-card glass-panel';
        card.style.animationDelay = `${index * 0.05}s`;
        
        // Parse date for visual clarity
        const badgeClass = getBadgeClass(note.category);
        
        // Highlight terms if search query exists
        let dateHtml = note.date;
        let contentHtml = note.content;
        
        if (state.searchQuery) {
            dateHtml = highlightText(dateHtml, state.searchQuery);
            // Highlight content html is tricky because of HTML tags.
            // We should use a regex helper that avoids breaking HTML tags.
            contentHtml = highlightHTML(contentHtml, state.searchQuery);
        }
        
        card.innerHTML = `
            <div class="note-header">
                <div class="note-header-left">
                    <span class="badge ${badgeClass}">${note.category}</span>
                    <span class="note-date">${dateHtml}</span>
                </div>
                <div class="note-actions">
                    <button class="btn-card-action tweet-btn" title="Tweet this update">
                        <i class="fa-brands fa-x-twitter"></i> <span>Tweet</span>
                    </button>
                    ${note.link ? `<a href="${note.link}" class="btn-card-action console-link" target="_blank" rel="noopener" title="View details in Google Cloud Console"><i class="fa-solid fa-external-link"></i> <span>Console</span></a>` : ''}
                </div>
            </div>
            <div class="note-body">${contentHtml}</div>
        `;
        
        // Click to select/highlight card
        card.addEventListener('click', () => {
            selectCard(card);
        });
        
        // Click to tweet
        const tweetButton = card.querySelector('.tweet-btn');
        if (tweetButton) {
            tweetButton.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent toggling selection on card click
                shareOnTwitter(note);
            });
        }
        
        fragment.appendChild(card);
    });
    
    elements.notesList.appendChild(fragment);
}

function getBadgeClass(category) {
    switch (category.toLowerCase()) {
        case 'feature': return 'badge-feature';
        case 'change': return 'badge-change';
        case 'breaking': return 'badge-breaking';
        case 'issue': return 'badge-issue';
        case 'announcement': return 'badge-announcement';
        default: return 'badge-general';
    }
}

// ==========================================================================
// Highlighting Helpers (Avoid breaking HTML markup)
// ==========================================================================
function highlightText(text, query) {
    if (!query) return text;
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, '<span class="highlight-text">$1</span>');
}

/**
 * Highlights a query inside an HTML string without corrupting existing HTML tags/attributes.
 */
function highlightHTML(html, query) {
    if (!query) return html;
    
    // We break the string into text chunks and HTML tags
    // Matches html tags, e.g. <a href="...">, </code>
    const tagRegex = /(<[^>]+>)/g;
    const parts = html.split(tagRegex);
    
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    
    for (let i = 0; i < parts.length; i++) {
        // If it's a text chunk (not a tag)
        if (!parts[i].startsWith('<')) {
            parts[i] = parts[i].replace(regex, '<span class="highlight-text">$1</span>');
        }
    }
    
    return parts.join('');
}

// ==========================================================================
// Scroll & Top Button
// ==========================================================================
function handleWindowScroll() {
    if (window.scrollY > 300) {
        elements.scrollTopBtn.classList.add('show');
    } else {
        elements.scrollTopBtn.classList.remove('show');
    }
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// ==========================================================================
// Card Selection & Tweet Utilities
// ==========================================================================
function selectCard(cardElement) {
    const isSelected = cardElement.classList.contains('selected');
    
    // Remove selected state from all notes
    document.querySelectorAll('.note-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Toggle active selection state
    if (!isSelected) {
        cardElement.classList.add('selected');
    }
}

function shareOnTwitter(note) {
    // Strip HTML to get plain description text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = note.content;
    const plainText = tempDiv.innerText || tempDiv.textContent || '';
    
    // Prefix and Suffix configurations
    const prefix = `BigQuery ${note.category} (${note.date}): `;
    const suffix = `\n\n#BigQuery #GoogleCloud`;
    
    // Tweet limit is 280. Link counts as 23 characters.
    const maxBodyLength = 280 - prefix.length - suffix.length - 23 - 5;
    
    let tweetContent = plainText.trim();
    if (tweetContent.length > maxBodyLength) {
        tweetContent = tweetContent.substring(0, maxBodyLength - 3) + '...';
    }
    
    const tweetText = `${prefix}"${tweetContent}"${suffix}`;
    const targetUrl = note.link || 'https://cloud.google.com/bigquery/docs/release-notes';
    
    const xShareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(targetUrl)}`;
    window.open(xShareUrl, '_blank');
}

