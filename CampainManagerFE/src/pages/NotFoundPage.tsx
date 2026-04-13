import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl text-white">Page not found</h1>
      <p className="mt-2 text-sm text-mist">That URL does not exist in this app.</p>
      <Link to="/campaigns" className="mt-6 text-accent hover:underline">
        Back to campaigns
      </Link>
    </div>
  );
}
