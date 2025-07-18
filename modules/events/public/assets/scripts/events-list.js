const paginationTable = document.getElementById('paginationTable');
const searchKey = document.getElementById('search-event');
const filterEl = document.getElementById('list-filter');
const dataElement = document.getElementById('pagination-data');

if (dataElement) {
  const paginationData = JSON.parse(dataElement.textContent);
  if (paginationTable) {
    paginationTable.pageSizeOptions = paginationData.pageSizeOptions;
    paginationTable.totalCount = paginationData.totalCount;
    paginationTable.pageNumber = paginationData.pageNumber;
    paginationTable.pageSize = paginationData.pageSize;
    paginationTable.paginationText = paginationData.paginationText;
    paginationTable.addEventListener('insPaginationChange', handlePaginationChange);
  }
}

function handlePaginationChange(event) {
    const { pageNumber, pageSize } = event.detail;
    updateUrlParams({ page: pageNumber, per_page: pageSize });
}

if (searchKey) {
    searchKey.addEventListener('insIconClick', handleSearch);
    searchKey.addEventListener('insInput', e => {
        if (e.detail.keyCode === 13) handleSearch();
    });
}

function handleSearch() {
    updateUrlParams({ search: searchKey.value.trim(), page: 1 }); 
}

 // Filters
if (filterEl) {
      filterEl.addEventListener('insFilterApply', (event) => {
           const { Category, Location, "Sort by": sortLabel } = event.detail;
           const updatedParams = {};

           // Categories
           updatedParams.category = (Category && Category.toLowerCase() !== 'all') ? Category : null;

           // Locations
           updatedParams.location = (Location && Location.toLowerCase() !== 'all') ? Location : null;

           // Sort by
           updatedParams.sort = (sortLabel) ? sortLabel : null;

           updatedParams.page = 1; 
           updateUrlParams(updatedParams);
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