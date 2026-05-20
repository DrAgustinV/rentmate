import { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { updateOnboardingProgress } from "@/services/profileService";

export type TourType = "properties" | "rentals";

interface OnboardingTourProps {
  userId: string;
  run: boolean;
  onFinish: () => void;
  tourType?: TourType;
}

export function OnboardingTour({ userId, run, onFinish, tourType = "properties" }: OnboardingTourProps) {
  const { t } = useLanguage();
  const [Joyride, setJoyride] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import("react-joyride").then((mod) => {
      setJoyride(() => mod.Joyride);
    });
  }, []);

  const isPropertiesTour = tourType === "properties";
  const wasRunning = useRef(run);
  wasRunning.current = run;

  useEffect(() => {
    return () => {
      if (wasRunning.current) {
        localStorage.setItem(
          `tour_taken_${userId}_${isPropertiesTour ? "properties" : "rentals"}`,
          "true"
        );
      }
    };
  }, [userId, isPropertiesTour]);

  const tourSteps = isPropertiesTour
    ? [
        {
          target: "body" as const,
          content: t("welcome.tour.welcome"),
          placement: "center" as const,
          disableBeacon: true,
        },
        {
          target: "[data-tour='properties-header']" as const,
          content: t("welcome.tour.propertiesHeader"),
          placement: "bottom" as const,
        },
        {
          target: "[data-tour='add-property-btn']" as const,
          content: t("welcome.tour.addProperty"),
          placement: "bottom" as const,
        },
        {
          target: "[data-tour='bulk-import-btn']" as const,
          content: t("welcome.tour.bulkImport"),
          placement: "left" as const,
        },
        {
          target: "[data-tour='nav-configuration']" as const,
          content: t("welcome.tour.configuration"),
          placement: "right" as const,
        },
        {
          target: "body" as const,
          content: t("welcome.tour.complete"),
          placement: "center" as const,
        },
      ]
    : [
        {
          target: "body" as const,
          content: t("welcome.tourRentals.welcome"),
          placement: "center" as const,
          disableBeacon: true,
        },
        {
          target: "[data-tour='rentals-header']" as const,
          content: t("welcome.tourRentals.rentalsHeader"),
          placement: "bottom" as const,
        },
        {
          target: "[data-tour='rentals-toggle']" as const,
          content: t("welcome.tourRentals.archiveToggle"),
          placement: "bottom" as const,
        },
        {
          target: "[data-tour='rentals-checklist']" as const,
          content: t("welcome.tourRentals.checklist"),
          placement: "right" as const,
        },
        {
          target: "body" as const,
          content: t("welcome.tourRentals.complete"),
          placement: "center" as const,
        },
      ];

  const handleJoyrideCallback = useCallback(async (data: { status: string }) => {
    const { status } = data;
    const finishedStatuses = ["finished", "skipped", "stopped"];

    if (finishedStatuses.includes(status)) {
      const progressUpdate = isPropertiesTour
        ? { tour_taken: true }
        : { rentals_tour_taken: true };

      try {
        await updateOnboardingProgress(userId, progressUpdate);
      } catch (err) {
        console.error("Failed to save tour progress:", err);
      }

      localStorage.setItem(`tour_taken_${userId}_${isPropertiesTour ? "properties" : "rentals"}`, "true");
      onFinish();
    }
  }, [userId, onFinish, isPropertiesTour]);

  if (!Joyride) {
    return null;
  }

  return (
    <Joyride
      steps={tourSteps}
      run={run}
      continuous
      showSkipButton
      showProgress
      floaterProps={{
        disableAnimation: true,
      }}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          zIndex: 10000,
        },
      }}
      callback={handleJoyrideCallback}
    />
  );
}

