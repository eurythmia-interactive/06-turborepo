import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock } from 'lucide-react';

interface MaintenancePageProps {
  searchParams: Promise<{ message?: string; scheduledEnd?: string }>;
}

export default async function MaintenancePage({ searchParams }: MaintenancePageProps) {
  const params = await searchParams;
  const message =
    params.message || 'We are performing scheduled maintenance. Please check back later.';
  const scheduledEnd = params.scheduledEnd;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <Card className="mx-4 max-w-md">
        <CardHeader>
          <div className="flex justify-center">
            <div className="rounded-full bg-orange-100 p-4 dark:bg-orange-950">
              <AlertTriangle className="size-12 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <CardTitle className="mt-4 text-center text-2xl">System Under Maintenance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">{message}</p>

          {scheduledEnd && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-muted p-3">
              <Clock className="size-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Expected to end at <strong>{new Date(scheduledEnd).toLocaleString()}</strong>
              </p>
            </div>
          )}

          <div className="pt-4 text-center text-sm text-muted-foreground">
            <p>We apologize for any inconvenience.</p>
            <p className="mt-2">
              If you are an administrator, you can still access the{' '}
              <a href="/admin" className="font-medium text-primary hover:underline">
                admin dashboard
              </a>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
