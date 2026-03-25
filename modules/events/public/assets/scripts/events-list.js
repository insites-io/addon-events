const paginationTable = document.getElementById('paginationTable');
const searchKey = document.getElementById('search-event');
const filterEl = document.getElementById('list-filter');
const dataElement = document.getElementById('pagination-data');

let pageType = '';

if (dataElement) {
  const paginationData = JSON.parse(dataElement.textContent);
  pageType = paginationData.pageType || '';
  if (paginationTable) {
    paginationTable.pageSizeOptions = paginationData.pageSizeOptions;
    paginationTable.totalCount = paginationData.totalCount;
    paginationTable.pageNumber = paginationData.pageNumber;
    paginationTable.pageSize = paginationData.pageSize;
    paginationTable.paginationText = paginationData.paginationText;
    paginationTable.addEventListener('insPaginationChange', handlePaginationChange);
  }
}

const AJAX_PAGE_TYPES = ['upcoming-events', 'previous-events'];

// Shared fetch + replace — called by both pagination and filters
async function fetchAndReplaceGrid(overrides) {
    const cardGrid = document.getElementById('events-card-grid');

    if (!cardGrid || !AJAX_PAGE_TYPES.includes(pageType)) {
        updateUrlParams(overrides);
        return;
    }

    const currentUrl = new URL(window.location.href);

    // Build params from current URL, then apply overrides
    const merged = {
        page:     parseInt(currentUrl.searchParams.get('page')     || 1),
        per_page: parseInt(currentUrl.searchParams.get('per_page') || 12),
        search:   currentUrl.searchParams.get('search')   || '',
        category: currentUrl.searchParams.get('category') || '',
        location: currentUrl.searchParams.get('location') || '',
        sort:     currentUrl.searchParams.get('sort')     || ''
    };

    Object.entries(overrides).forEach(([key, value]) => {
        merged[key] = (value === null || value === undefined) ? '' : value;
    });

    const fetchParams = new URLSearchParams({ page_type: pageType, ...merged });

    cardGrid.style.opacity = '0.5';
    cardGrid.style.pointerEvents = 'none';

    try {
        const response = await fetch(`/api/events/list-results?${fetchParams}`);
        const data = await response.json();

        cardGrid.innerHTML = data.html;

        if (paginationTable) {
            paginationTable.totalCount = data.totalCount;
            paginationTable.pageNumber = data.pageNumber;
            paginationTable.pageSize = data.pageSize;
        }

        // Sync URL — clean up defaults to keep it tidy
        const newUrl = new URL(window.location.href);
        Object.entries(overrides).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') {
                newUrl.searchParams.delete(key);
            } else {
                newUrl.searchParams.set(key, value);
            }
        });
        if (parseInt(newUrl.searchParams.get('page') || 1) <= 1) newUrl.searchParams.delete('page');
        if (parseInt(newUrl.searchParams.get('per_page') || 12) === 12) newUrl.searchParams.delete('per_page');
        history.pushState(null, '', newUrl.toString());

        window.scrollTo({ top: cardGrid.offsetTop - 100, behavior: 'smooth' });
    } catch {
        updateUrlParams(overrides);
    } finally {
        cardGrid.style.opacity = '';
        cardGrid.style.pointerEvents = '';
    }
}

function handlePaginationChange(event) {
    const { pageNumber, pageSize } = event.detail;
    fetchAndReplaceGrid({ page: pageNumber, per_page: pageSize });
}

if (searchKey) {
    searchKey.addEventListener('insIconClick', handleSearch);
    searchKey.addEventListener('insInput', e => {
        if (e.detail.keyCode === 13) handleSearch();
    });
}

function handleSearch() {
    fetchAndReplaceGrid({ search: searchKey.value.trim(), page: 1 });
}

if (filterEl) {
    filterEl.addEventListener('insFilterApply', (event) => {
        const { Category, Location, 'Sort by': sortLabel } = event.detail;
        fetchAndReplaceGrid({
            category: (Category && Category.toLowerCase() !== 'all') ? Category : null,
            location: (Location && Location.toLowerCase() !== 'all') ? Location : null,
            sort:     sortLabel || null,
            page:     1
        });
    });
}

function updateUrlParams(params) {
    const url = new URL(window.location.href);

    Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined) {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
    });

    window.location.href = url.toString();
}
