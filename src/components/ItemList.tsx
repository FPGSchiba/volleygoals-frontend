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

  const pageCount = Math.max(1, Math.ceil((count || items.length) / effectiveRows));

  const load = async (f: FilterOptions) => {
    try {
      const withLimit = { ...(f as any), limit: f.limit ?? effectiveRows } as FilterOptions;
      const res = await fetch(withLimit);
    } catch (err) {
      console.error('ItemList fetch error', err);
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
    <Box>
      <Grid container alignItems="center" spacing={2}>
        <Grid>
          <Typography variant="h5">{title}</Typography>
        </Grid>
        {create && (
          <Grid>
            <Button startIcon={<AddIcon />} variant="contained" color="primary" onClick={handleCreate}>
              Create
            </Button>
          </Grid>
        )}
      </Grid>

      <Box mt={2}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Filter</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2} alignItems="center">
              {/* Default filter controls (always included) */}
              <Grid>
                <TextField
                  select
                  fullWidth
                  label="Limit"
                  value={draftFilter.limit ?? rowsPerPage}
                  onChange={(e) => setDraftFilter({ ...(draftFilter as any), limit: Number(e.target.value) } as FilterOptions)}
                >
                  {[5, 10, 20, 50].map((v) => (
                    <MenuItem key={v} value={v}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid>
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

              <Grid>
                <TextField
                  select
                  fullWidth
                  label="Sort Order"
                  value={draftFilter.sortOrder ?? 'asc'}
                  onChange={(e) =>
                    setDraftFilter({ ...(draftFilter as any), sortOrder: (e.target.value as 'asc' | 'desc') } as FilterOptions)
                  }
                >
                  <MenuItem value="asc">Ascending</MenuItem>
                  <MenuItem value="desc">Descending</MenuItem>
                </TextField>
              </Grid>

              {/* Custom filter fields (if provided) receive the draft filter and setter) */}
              {renderFilterFields ? renderFilterFields(draftFilter, setDraftFilter) : null}

              <Grid>
                <Button variant="outlined" onClick={handleApplyFilter}>
                  Apply
                </Button>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Box>

      <Box mt={2}>
        <TableContainer component={Paper}>
          <Table>
            {columns.length > 0 && (
              <TableHead>
                <TableRow>
                  {columns.map((c, idx) => (
                    <TableCell key={idx}>{c}</TableCell>
                  ))}
                  {(onEdit || onDelete) && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
            )}

            <TableBody>
              {displayed.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}>
                    <Typography>No items found.</Typography>
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
                    return React.cloneElement(rendered as React.ReactElement, { key: id });
                  }

                  return (
                    <TableRow key={id}>
                      {Array.isArray(rendered) ? rendered : <TableCell>{rendered}</TableCell>}
                      {(onEdit || onDelete) && (
                        <TableCell align="right">
                          {onEdit && (
                            <Button size="small" onClick={() => handleEdit(item)}>
                              Edit
                            </Button>
                          )}
                          {onDelete && (
                            <Button size="small" onClick={() => handleDelete(id)}>
                              Delete
                            </Button>
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

        <Box mt={2} display="flex" justifyContent="center">
          <Pagination count={pageCount} page={page} onChange={(_, value) => setPage(value)} color="primary" />
        </Box>
      </Box>
    </Box>
  );
}
