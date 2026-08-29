import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0f18]">
      <div className="w-full max-w-md mx-4 rounded border border-[#1c2a39] bg-[#0c141f] p-6">
        <div className="flex mb-4 gap-2">
          <AlertCircle className="h-8 w-8 text-[#f16b52]" />
          <h1 className="text-2xl font-bold text-[#e5eff4]">404 Page Not Found</h1>
        </div>
        <p className="mt-4 text-sm text-[#7892a8]">
          Did you forget to add the page to the router?
        </p>
      </div>
    </div>
  );
}
