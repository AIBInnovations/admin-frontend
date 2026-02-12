import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, MoreVertical, Pencil, Trash2, Search, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { subjectsService, Subject, SubjectFormData, DeleteImpact } from '@/services/subjects.service';
import { SubjectFormModal } from '@/components/subjects/SubjectFormModal';
import { DeleteSubjectModal } from '@/components/subjects/DeleteSubjectModal';

export function SubjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [activeFilter, setActiveFilter] = useState<string>(searchParams.get('status') || 'all');
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<DeleteImpact | null>(null);
  const [loadingDeleteImpact, setLoadingDeleteImpact] = useState(false);

  // Fetch subjects
  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await subjectsService.getSubjects({
        page: currentPage,
        limit: 20,
        search: searchQuery || undefined,
        is_active: activeFilter === 'all' ? null : activeFilter === 'active',
        sort_by: 'display_order',
        sort_order: 'asc',
      });

      if (response.success && response.data) {
        setSubjects(response.data.entities || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotalCount(response.data.pagination?.total || 0);
      }
    } catch (error) {
      toast.error('Failed to load subjects');
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, activeFilter]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // Update URL params
  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchQuery) params.search = searchQuery;
    if (activeFilter !== 'all') params.status = activeFilter;
    if (currentPage > 1) params.page = currentPage.toString();
    setSearchParams(params);
  }, [searchQuery, activeFilter, currentPage, setSearchParams]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Create subject
  const handleCreate = () => {
    setModalMode('create');
    setSelectedSubject(null);
    setFormModalOpen(true);
  };

  // Edit subject
  const handleEdit = (subject: Subject) => {
    setModalMode('edit');
    setSelectedSubject(subject);
    setFormModalOpen(true);
  };

  // Delete subject
  const handleDeleteClick = async (subject: Subject) => {
    setSelectedSubject(subject);
    setDeleteModalOpen(true);
    setLoadingDeleteImpact(true);

    try {
      const response = await subjectsService.getDeleteImpact(subject._id);
      if (response.success && response.data) {
        setDeleteImpact(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch delete impact:', error);
      setDeleteImpact(null);
    } finally {
      setLoadingDeleteImpact(false);
    }
  };

  // Form submit handler
  const handleFormSubmit = async (data: SubjectFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await subjectsService.createSubject(data);
        if (response.success) {
          toast.success('Subject created successfully');
          fetchSubjects();
        }
      } else if (selectedSubject) {
        const response = await subjectsService.updateSubject(selectedSubject._id, data);
        if (response.success) {
          toast.success('Subject updated successfully');
          fetchSubjects();
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save subject');
      throw error;
    }
  };

  // Delete confirm handler
  const handleDeleteConfirm = async () => {
    if (!selectedSubject) return;

    try {
      const response = await subjectsService.deleteSubject(selectedSubject._id);
      if (response.success) {
        toast.success('Subject deleted successfully');
        fetchSubjects();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete subject');
      throw error;
    }
  };

  // Toggle active status
  const handleToggleActive = async (subject: Subject) => {
    try {
      const response = await subjectsService.toggleActive(subject._id, !subject.is_active);
      if (response.success) {
        toast.success(`Subject ${!subject.is_active ? 'activated' : 'deactivated'} successfully`);
        fetchSubjects();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects"
        description="Manage medical subjects and specialties"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Content' },
          { label: 'Subjects' },
        ]}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Subject
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      {!loading && subjects && (
        <div className="text-sm text-muted-foreground">
          Showing {subjects.length} of {totalCount} subjects
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Order</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-32">Packages</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-32">Created</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-64" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : subjects.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-muted-foreground">
                      {searchQuery || activeFilter !== 'all'
                        ? 'No subjects found matching your filters'
                        : 'No subjects yet'}
                    </p>
                    {!searchQuery && activeFilter === 'all' && (
                      <Button onClick={handleCreate} variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Create your first subject
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // Subject rows
              subjects.map((subject) => (
                <TableRow key={subject._id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <GripVertical className="h-3 w-3 cursor-grab text-muted-foreground" />
                      <span className="text-sm font-medium">{subject.display_order}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                        {subject.name.charAt(0)}
                      </div>
                      <span className="font-medium">{subject.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {subject.description || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {subject.packages_count || 0} {subject.packages_count === 1 ? 'package' : 'packages'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={subject.is_active}
                        onCheckedChange={() => handleToggleActive(subject)}
                        className="scale-75"
                      />
                      <span className="text-xs text-muted-foreground">
                        {subject.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(subject.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(subject)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(subject)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <SubjectFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        subject={selectedSubject}
        mode={modalMode}
      />

      {/* Delete Modal */}
      <DeleteSubjectModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        subject={selectedSubject}
        deleteImpact={deleteImpact}
        isLoadingImpact={loadingDeleteImpact}
      />
    </div>
  );
}
