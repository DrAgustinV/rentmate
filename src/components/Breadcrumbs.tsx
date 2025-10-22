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
  
  const generateBreadcrumbs = (): BreadcrumbSegment[] => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbSegment[] = [];

    let currentPath = "";
    pathSegments.forEach((segment, index) => {
      const isLast = index === pathSegments.length - 1;

      // Handle special cases
      if (segment === "properties") {
        // Map "properties" to dashboard since that's where the property list is shown
        breadcrumbs.push({
          label: "Properties",
          path: "/dashboard",
          isLast,
        });
        currentPath += `/${segment}`;
        return;
      } else if (segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // Skip UUID segments completely
        currentPath += `/${segment}`;
        return;
      }

      currentPath += `/${segment}`;

      // Generate human-readable labels
      let label = segment
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      if (segment === "tickets" && index > 0) {
        label = "Tickets";
      } else if (segment === "maintenance") {
        label = "Maintenance";
      }

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

  return (
    <div className="container py-3 overflow-x-auto">
      <Breadcrumb>
        <BreadcrumbList className="flex-nowrap"
          aria-label="Breadcrumb navigation"
        >
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard" className="flex items-center gap-1">
                <Home className="h-3.5 w-3.5" />
                <span>Dashboard</span>
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
