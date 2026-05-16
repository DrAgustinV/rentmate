import { Link } from "react-router-dom";
import { useBrand } from "@/contexts/BrandContext";

interface LogoPillProps {
  linkTo: string;
}

export function LogoPill({ linkTo }: LogoPillProps) {
  const { brandName } = useBrand();

  return (
    <Link to={linkTo} className="flex items-center">
      <div className="flex items-center gap-2 bg-white/90 rounded-full px-3 py-1.5 shadow-sm">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'hsl(var(--header-background))' }}
        >
          <span className="text-white font-bold text-sm">RE</span>
        </div>
        <span
          className="font-bold text-lg tracking-tight"
          style={{ color: 'hsl(var(--header-background))' }}
        >
          {brandName}
        </span>
      </div>
    </Link>
  );
}
