import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { User, FileText, ClipboardCheck } from "lucide-react";

export function ContractsTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stepper skeleton */}
      <div className="bg-muted/30 rounded-xl p-4 border">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <Skeleton className="w-10 h-10 rounded-full" />
                <Skeleton className="w-12 h-3 mt-2 hidden sm:block" />
              </div>
              {i < 3 && <Skeleton className="flex-1 h-1 mx-2 rounded" />}
            </div>
          ))}
        </div>
      </div>

      {/* Section 1: Tenant Overview skeleton */}
      <Card className="card-shine">
        <CardHeader className="pb-4 cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div>
                <Skeleton className="w-32 h-5 mb-1" />
                <Skeleton className="w-24 h-3" />
              </div>
            </div>
            <Skeleton className="w-5 h-5 rounded" />
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Contract skeleton */}
      <Card className="card-shine">
        <CardHeader className="pb-4 cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div>
                <Skeleton className="w-40 h-5 mb-1" />
                <Skeleton className="w-48 h-3" />
              </div>
            </div>
            <Skeleton className="w-5 h-5 rounded" />
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-6">
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Inspections skeleton */}
      <Card className="card-shine">
        <CardHeader className="pb-4 cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div>
                <Skeleton className="w-36 h-5 mb-1" />
                <Skeleton className="w-44 h-3" />
              </div>
            </div>
            <Skeleton className="w-5 h-5 rounded" />
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-6">
          <div className="text-center py-8">
            <Skeleton className="h-10 w-10 mx-auto rounded-full mb-3" />
            <Skeleton className="h-4 w-32 mx-auto mb-2" />
            <Skeleton className="h-3 w-48 mx-auto" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}