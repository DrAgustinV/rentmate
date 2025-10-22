// Responsive typography system for consistent text sizing across the application

export const responsiveHeadings = {
  h1: "text-2xl md:text-3xl lg:text-4xl font-bold",
  h2: "text-xl md:text-2xl lg:text-3xl font-semibold",
  h3: "text-lg md:text-xl lg:text-2xl font-semibold",
  h4: "text-base md:text-lg font-semibold",
  body: "text-sm md:text-base",
  small: "text-xs md:text-sm",
} as const;
