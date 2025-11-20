import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Pagination,
  Grid,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  MenuItem,
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import { IFilterOption } from '../services/types';

export const DEFAULT_FILTER: IFilterOption = {
  limit: 10,
  nextToken: undefined,
  sortBy: undefined,
  sortOrder: 'asc',
};

export interface FetchResult<Item> {
  items: Item[];
  count: number;
}

export interface GenericListProps<Item, FilterOptions extends IFilterOption> {
  title?: string;
  columns?: string[]; // header labels
  initialFilter?: FilterOptions;
  rowsPerPage?: number;

  fetch: (filter: FilterOptions) => Promise<FetchResult<Item>>;

  create?: () => Promise<void> | void;
  onEdit?: (item: Item) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;

  getId?: (item: Item) => string;

  renderRow: (
    item: Item,
    handlers: { onEdit?: (item: Item) => void; onDelete?: (id: string) => void }
  ) => React.ReactNode;

  // Optional custom filter UI. Receives current draft filter and setter.
  renderFilterFields?: (
    draftFilter: FilterOptions,
    setDraftFilter: (f: FilterOptions) => void
  ) => React.ReactNode;

  // Optional: restrict which fields are allowed to be sorted and provide labels
  // Example: [{ field: 'name', label: 'Name' }, { field: 'updatedAt', label: 'Updated' }]
  sortableFields?: { field: string; label: string }[];

  // Optional: custom renderer for the actions cell per row. If provided, this
  // will be used instead of the default Edit/Delete buttons. The renderer
  // receives the item only — the parent is expected to wire any handlers
  // (for example calling store functions) from within the renderer. This
  // simplifies the API and gives the page full control over action behavior.
  renderActions?: (item: Item) => React.ReactNode;

  items: Item[];
  count: number;
}

export function ItemList<Item, FilterOptions extends IFilterOption>({
  title = 'List',
  columns = [],
  initialFilter,
  rowsPerPage = 10,
  fetch,
  create,
  onEdit,
  onDelete,
  getId = (i: any) => (i && (i.id || i._id || String(i))) as string,
  renderRow,
  renderFilterFields,
  sortableFields,
  renderActions,
  items,
  count
}: GenericListProps<Item, FilterOptions>) {
  const mergedInitialFilter = useMemo(() => {
    return { ...(DEFAULT_FILTER as FilterOptions), ...(initialFilter || ({} as FilterOptions)) } as FilterOptions;
  }, [initialFilter]);

  // active filter used for fetching
  const [filter, setFilter] = useState<FilterOptions>(mergedInitialFilter);
  // draft filter used for UI edits; apply will commit draft -> filter
  const [draftFilter, setDraftFilter] = useState<FilterOptions>(mergedInitialFilter);

  const [page, setPage] = useState(1);
  const effectiveRows = rowsPerPage;
  const [loading, setLoading] = useState<boolean>(false);

  const pageCount = Math.max(1, Math.ceil((count || items.length) / effectiveRows));

  const load = async (f: FilterOptions) => {
    try {
      setLoading(true);
      const withLimit = { ...(f as any), limit: f.limit ?? effectiveRows } as FilterOptions;
      const res = await fetch(withLimit);
      return res;
    } catch (err) {
      console.error('ItemList fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleApplyFilter = async () => {
    setPage(1);
    setFilter(draftFilter);
    await load(draftFilter);
  };

  const handleCreate = async () => {
    if (create) {
      await create();
      await load(filter);
    }
  };

  const handleEdit = async (item: Item) => {
    if (onEdit) {
      await onEdit(item);
      await load(filter);
    }
  };

  const handleDelete = async (id: string) => {
    if (onDelete) {
      await onDelete(id);
      const newCount = Math.max(0, (count || items.length) - 1);
      const newPageCount = Math.max(1, Math.ceil(newCount / effectiveRows));
      if (page > newPageCount) setPage(newPageCount);
      await load(filter);
    }
  };

  const displayed = useMemo(() => {
    const start = (page - 1) * effectiveRows;
    const end = start + effectiveRows;
    return items.slice(start, end);
  }, [items, page, effectiveRows]);

  return (
    <Box className="item-list">
      <Grid container alignItems="center" spacing={2}>
        <Grid className="item-list-header">
          <Typography variant="h5" className="item-list-title">{title}</Typography>
        </Grid>
        {create && (
          <Grid>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              color="primary"
              onClick={handleCreate}
              className="item-list-create-button"
            >
              Create
            </Button>
          </Grid>
        )}
      </Grid>

      <Box mt={2}>
        <Accordion className="item-list-filter">
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Filter</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2} alignItems="center" className="item-list-filter-grid">
              {/* Default filter controls (always included) */}
              <Grid className="item-list-filter-field">
                <TextField
                  select
                  fullWidth
                  label="Limit"
                  value={draftFilter.limit ?? rowsPerPage}
                  onChange={(e) => setDraftFilter({ ...(draftFilter as any), limit: Number(e.target.value) } as FilterOptions)}
                  className="item-list-textfield"
                >
                  {[5, 10, 20, 50].map((v) => (
                    <MenuItem key={v} value={v}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid className="item-list-filter-field">
                {sortableFields && sortableFields.length > 0 ? (
                  <TextField
                    select
                    fullWidth
                    label="Sort By"
                    value={draftFilter.sortBy ?? ''}
                    onChange={(e) =>
                      setDraftFilter({ ...(draftFilter as any), sortBy: e.target.value || undefined } as FilterOptions)
                    }
                  >
                    <MenuItem value="">Any</MenuItem>
                    {sortableFields.map((s) => (
                      <MenuItem key={s.field} value={s.field}>
                        {s.label}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <TextField
                    fullWidth
                    label="Sort By"
                    value={draftFilter.sortBy ?? ''}
                    onChange={(e) => setDraftFilter({ ...(draftFilter as any), sortBy: e.target.value || undefined } as FilterOptions)}
                  />
                )}
              </Grid>

              <Grid className="item-list-filter-field">
                <TextField
                  select
                  fullWidth
                  label="Sort Order"
                  value={draftFilter.sortOrder ?? 'asc'}
                  onChange={(e) =>
                    setDraftFilter({ ...(draftFilter as any), sortOrder: (e.target.value as 'asc' | 'desc') } as FilterOptions)
                  }
                  className="item-list-textfield"
                >
                  <MenuItem value="asc">Ascending</MenuItem>
                  <MenuItem value="desc">Descending</MenuItem>
                </TextField>
              </Grid>

              {/* Custom filter fields (if provided) receive the draft filter and setter) */}
              {renderFilterFields ? renderFilterFields(draftFilter, setDraftFilter) : null}

              <Grid>
                <Button variant="contained" onClick={handleApplyFilter} className="item-list-apply-button">
                  Apply
                </Button>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Box>

      <Box mt={2}>
        <TableContainer component={Paper} className="item-list-table">
          <Table>
            {columns.length > 0 && (
              <TableHead>
                <TableRow>
                  {columns.map((c, idx) => (
                    <TableCell key={idx}>{c}</TableCell>
                  ))}
                  {(renderActions || onEdit || onDelete) && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
            )}

            <TableBody>
              {displayed.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="item-list-no-items">
                    {loading ? (
                      <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <Typography>No items found.</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                displayed.map(item => {
                  const id = getId(item);
                  const rendered = renderRow(item, {
                    onEdit: onEdit ? () => handleEdit(item) : undefined,
                    onDelete: onDelete ? (iId: string) => handleDelete(iId) : undefined,
                  });

                  if (React.isValidElement(rendered) && (rendered.type === TableRow || (rendered as any).props?.children)) {
                    return React.cloneElement(rendered as React.ReactElement<any>, { key: id, className: `${(rendered as any).props?.className || ''} item-list-custom-row` } as any);
                  }

                  return (
                    <TableRow key={id} className="item-list-row">
                      {Array.isArray(rendered) ? rendered : <TableCell>{rendered}</TableCell>}
                      {(renderActions || onEdit || onDelete) && (
                        <TableCell align="right">
                          {renderActions ? (
                            renderActions(item)
                          ) : (
                            <>
                              {onEdit && (
                                <Button style={{ marginRight: '5px' }} variant="contained" size="small" onClick={() => handleEdit(item)} className="item-list-action-button item-list-action-edit">
                                  Edit
                                </Button>
                              )}
                              {onDelete && (
                                <Button variant="contained" size="small" onClick={() => handleDelete(id)} className="item-list-action-button item-list-action-delete">
                                  Delete
                                </Button>
                              )}
                            </>
                          )}
                        </TableCell>
                      )}
                     </TableRow>
                   );
                 })
               )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box mt={2} display="flex" justifyContent="center" className="item-list-pagination">
          <Pagination count={pageCount} page={page} onChange={(_, value) => setPage(value)} color="primary" />
        </Box>
      </Box>
    </Box>
  );
}
