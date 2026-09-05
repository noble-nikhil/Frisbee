import { createBrowserRouter, Navigate } from 'react-router'
import { AppShell } from '@/components/layout/app-shell'
import { RedirectIfAuthed, RequireAdmin, RequireAuth, RequireSession } from '@/features/auth/guards'
import { RouteError } from '@/pages/route-error'

// Every page is lazy: the shell + home is the only thing the first paint needs.
const page = (loader: () => Promise<{ default: React.ComponentType }>) => ({ lazy: async () => ({ Component: (await loader()).default }) })

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      { path: '/', ...page(() => import('@/pages/landing')) },
      {
        element: <RedirectIfAuthed />,
        children: [
          { path: '/login', ...page(() => import('@/pages/auth/login')) },
          { path: '/signup', ...page(() => import('@/pages/auth/signup')) },
          { path: '/forgot', ...page(() => import('@/pages/auth/forgot')) },
        ],
      },
      {
        element: <RequireSession />,
        children: [
          { path: '/onboarding', ...page(() => import('@/pages/onboarding')) },
          { path: '/verify', ...page(() => import('@/pages/auth/verify')) },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/home', ...page(() => import('@/pages/home')) },
              { path: '/discover', ...page(() => import('@/pages/discover')) },
              { path: '/people/:uid', ...page(() => import('@/pages/profile')) },
              { path: '/groups', ...page(() => import('@/pages/groups/list')) },
              { path: '/groups/:id', ...page(() => import('@/pages/groups/detail')) },
              { path: '/communities', ...page(() => import('@/pages/communities/list')) },
              { path: '/communities/request', ...page(() => import('@/pages/communities/request')) },
              { path: '/communities/:id', ...page(() => import('@/pages/communities/detail')) },
              { path: '/happening', ...page(() => import('@/pages/happening/list')) },
              { path: '/happening/:kind/:id', ...page(() => import('@/pages/happening/detail')) },
              { path: '/rides', ...page(() => import('@/pages/rides/list')) },
              { path: '/rides/:id', ...page(() => import('@/pages/rides/detail')) },
              { path: '/errands', ...page(() => import('@/pages/errands/list')) },
              { path: '/errands/:id', ...page(() => import('@/pages/errands/detail')) },
              { path: '/teams', ...page(() => import('@/pages/teams/list')) },
              { path: '/teams/:id', ...page(() => import('@/pages/teams/detail')) },
              { path: '/tutoring', ...page(() => import('@/pages/tutoring/list')) },
              { path: '/tutoring/apply', ...page(() => import('@/pages/tutoring/apply')) },
              { path: '/tutoring/bookings', ...page(() => import('@/pages/tutoring/bookings')) },
              { path: '/tutoring/:tutorId', ...page(() => import('@/pages/tutoring/detail')) },
              { path: '/support', ...page(() => import('@/pages/support')) },
              { path: '/messages', ...page(() => import('@/pages/messages/list')) },
              { path: '/messages/:threadId', ...page(() => import('@/pages/messages/thread')) },
              { path: '/notifications', ...page(() => import('@/pages/notifications')) },
              { path: '/search', ...page(() => import('@/pages/search')) },
              { path: '/me', ...page(() => import('@/pages/me/index')) },
              { path: '/me/edit', ...page(() => import('@/pages/me/edit')) },
              { path: '/me/settings', ...page(() => import('@/pages/me/settings')) },
              {
                element: <RequireAdmin />,
                children: [{ path: '/admin', ...page(() => import('@/pages/admin')) }],
              },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/home" replace /> },
    ],
  },
])
