import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useProjectStore, type ProjectOrder } from "../../../store/useProjectStore";

// The page of projects on screen, and the search, filters and paging behind it.
export function useProjectList({ filterOngoing, order }: { filterOngoing: boolean; order?: ProjectOrder }) {
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const [searchParams, setSearchParams] = useSearchParams();

  // Arriving here from a dashboard/notification row (e.g. "Recent
  // Deliveries") jumps straight to that one project via an exact server-side
  // id match, rather than relying on the free-text search possibly matching
  // more than one row (or not matching a name with unusual punctuation).
  const focusedProjectId = searchParams.get("projectId");

  const clearFocusedProject = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("projectId");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Search/filters are sent to the server rather than applied client-side,
  // so the browser never has to hold more than one page of projects.
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [printStatusFilter, setPrintStatusFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string | number | undefined>(
    undefined,
  );
  const [paginationModel, setPaginationModel] = useState({
    page: 0, // MUI DataGrid pages are 0-indexed; the API is 1-indexed.
    pageSize: 20,
  });

  // Debounce the search box so every keystroke doesn't fire a request.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Any new search/filter should land back on page 1.
  const filterKey = JSON.stringify([debouncedSearch, printStatusFilter, customerFilter, focusedProjectId]);
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
  }

  // Shared by the auto-refetch effect below and the manual refresh button -
  // "refresh" means reload whatever the user is currently looking at
  // (same page, same search/filters), not reset any of it. When a
  // `projectId` is focused, the server ignores every other filter and
  // returns just that one project (see GET /projects, project_id param).
  const loadProjects = useCallback(() => {
    fetchProjects({
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
      search: debouncedSearch,
      printStatus: printStatusFilter,
      customerId: customerFilter,
      projectId: focusedProjectId || undefined,
      view: filterOngoing ? "ongoing" : undefined,
      order,
    });
  }, [
    fetchProjects,
    paginationModel,
    debouncedSearch,
    printStatusFilter,
    customerFilter,
    focusedProjectId,
    filterOngoing,
    order,
  ]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    focusedProjectId,
    clearFocusedProject,
    searchInput,
    setSearchInput,
    printStatusFilter,
    setPrintStatusFilter,
    customerFilter,
    setCustomerFilter,
    paginationModel,
    setPaginationModel,
    loadProjects,
  };
}
