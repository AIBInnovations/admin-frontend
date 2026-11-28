import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { DetailSkeleton, ErrorState } from '@/components/common/detail'
import { BookForm } from '@/components/books/BookForm'
import { useBook } from '@/components/books/useBook'

/** /content/books/new and /content/books/:bookId/edit */
export function BookEditorPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const mode = bookId ? 'edit' : 'create'
  const { book, loading, error, reload } = useBook(bookId)

  if (mode === 'edit' && !book) {
    if (loading && !error) return <DetailSkeleton />
    return (
      <ErrorState
        title={error?.notFound ? 'Book not found' : error?.forbidden ? 'You cannot open this book' : 'This book could not be loaded'}
        message={error?.notFound ? 'It may have been removed, or the link is wrong.' : error?.message}
        onRetry={error?.notFound || error?.forbidden ? undefined : reload}
        back={{ label: 'Back to Books', href: '/content/books' }}
      />
    )
  }

  const title = mode === 'create' ? 'Add Book' : 'Edit Book'
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={mode === 'create' ? 'Add a new book to the catalog.' : 'Update the book details below.'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Books', href: '/content/books' },
          ...(book ? [{ label: book.title, href: `/content/books/${book._id}` }] : []), { label: title },
        ]}
      />
      <BookForm key={book?._id ?? 'new'} mode={mode} book={book} onReload={reload} />
    </div>
  )
}
