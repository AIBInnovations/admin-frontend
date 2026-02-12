import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/common/DataTable';
import { SearchWithFilters } from '@/components/common/SearchBar';
import { Plus, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { subjectsService, Subject, SubjectFormData, DeleteImpact } from '@/services/subjects.service';
import { SubjectFormModal } from '@/components/subjects/SubjectFormModal';
import { DeleteSubjectModal } from '@/components/subjects/DeleteSubjectModal';
import { useSubjectsColumns } from './SubjectsPage.columns';
import { FilterConfig } from '@/components/common/SearchBar';

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

  // Filter configuration
  const filters: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'All Subjects', value: 'all' },
        { label: 'Active Only', value: 'active' },
        { label: 'Inactive Only', value: 'inactive' },
      ],
      placeholder: 'Filter by status',
      defaultValue: 'all',
    },
  ];

  // Column definitions
  const columns = useSubjectsColumns({
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
    onToggleActive: handleToggleActive,
  });

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

      <SearchWithFilters
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search subjects..."
        filters={filters}
        activeFilters={{ status: activeFilter }}
        onFiltersChange={(filters) => setActiveFilter(filters.status)}
      />

      <DataTable
        data={subjects}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: BookOpen,
          title:
            searchQuery || activeFilter !== 'all'
              ? 'No subjects found matching your filters'
              : 'No subjects yet',
          description:
            !searchQuery && activeFilter === 'all'
              ? 'Get started by creating your first subject'
              : undefined,
          action:
            !searchQuery && activeFilter === 'all' ? (
              <Button onClick={handleCreate} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create your first subject
              </Button>
            ) : undefined,
        }}
        getRowKey={(subject) => subject._id}
      />

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
