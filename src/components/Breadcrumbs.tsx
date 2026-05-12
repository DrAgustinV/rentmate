import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

interface BreadcrumbSegment {
  label: string;
  path: string;
  isLast: boolean;
}

export function Breadcrumbs() {
  const location = useLocation();
  
  const breadcrumbMap: Record<string, string> = {
    'properties': 'Properties',
    'rentals': 'Rentals',
    'configuration': 'Configuration',
    'profile': 'Profile',
    'identity': 'Identity Verification',
    'settings': 'Settings',
    'admin': 'Admin',
    'tickets': 'Tickets',
    'maintenance': 'Maintenance',
    'tenants': 'Tenants',
    'details': 'Details',
    'documents': 'Documents',
  };

  const generateBreadcrumbs = (): BreadcrumbSegment[] => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbSegment[] = [];

    let currentPath = "";
    pathSegments.forEach((segment, index) => {
      const isLast = index === pathSegments.length - 1;

      // Skip UUID segments
      if (segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        currentPath += `/${segment}`;
        return;
      }

      currentPath += `/${segment}`;

      // Use breadcrumbMap or generate human-readable labels
      const label = breadcrumbMap[segment] || segment
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      breadcrumbs.push({
        label,
        path: currentPath,
        isLast,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumbs on home/dashboard
  if (location.pathname === "/" || location.pathname === "/dashboard") {
    return null;
  }

  // Don't show breadcrumbs on auth pages
  if (location.pathname.startsWith("/auth") || location.pathname.startsWith("/reset-password") || location.pathname.startsWith("/verify-email")) {
    return null;
  }

  // Don't show for public pages
  if (location.pathname === "/pricing" || location.pathname === "/about" || location.pathname === "/privacy" || location.pathname === "/terms" || location.pathname === "/help") {
    return null;
  }

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <div className="container py-3 overflow-x-auto">
      <Breadcrumb>
        <BreadcrumbList className="flex-nowrap"
          aria-label="Breadcrumb navigation"
        >
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/properties" className="flex items-center gap-1">
                <Home className="h-3.5 w-3.5" />
                <span>Properties</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center gap-1.5">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.path}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
