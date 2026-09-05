import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { Button } from '@/components/ui'

export function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-h1">{notFound ? 'Page not found' : 'Something broke'}</h1>
      <p className="max-w-sm text-body text-ink-2">
        {notFound ? "That link doesn't go anywhere." : 'Reload the page. If it keeps happening, tell us.'}
      </p>
      <Link to="/home">
        <Button variant="secondary">Go home</Button>
      </Link>
    </div>
  )
}
