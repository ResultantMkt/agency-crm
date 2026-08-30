import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-lg border border-gray-700/50">
      <div className="w-[300px] shrink-0 flex flex-col border-r border-gray-700/50">
        <div className="px-4 py-4 border-b border-gray-700/50">
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="flex-1 p-3 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>
  )
}
