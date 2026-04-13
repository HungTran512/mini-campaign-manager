import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '@/app/AuthLayout';
import { ProtectedLayout } from '@/app/ProtectedLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { CampaignDashboardPage } from '@/features/campaigns/CampaignDashboardPage';
import { RecipientsListPage } from '@/features/recipients/RecipientsListPage';
import { CampaignDetailPage } from '@/features/campaigns/CampaignDetailPage';
import { CampaignListPage } from '@/features/campaigns/CampaignListPage';
import { CampaignNewPage } from '@/features/campaigns/CampaignNewPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: '/register',
    element: <AuthLayout />,
    children: [{ index: true, element: <RegisterPage /> }],
  },
  {
    path: '/campaigns',
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <CampaignListPage /> },
      { path: 'new', element: <CampaignNewPage /> },
      { path: ':id', element: <CampaignDetailPage /> },
    ],
  },
  {
    path: '/dashboard',
    element: <ProtectedLayout />,
    children: [{ index: true, element: <CampaignDashboardPage /> }],
  },
  {
    path: '/recipients',
    element: <ProtectedLayout />,
    children: [{ index: true, element: <RecipientsListPage /> }],
  },
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <NotFoundPage /> },
]);
