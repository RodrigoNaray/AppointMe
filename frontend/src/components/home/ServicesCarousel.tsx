import { useMemo, useState, useEffect, useRef } from "react";
import { Clock, Scissors } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useBookingStore, selectAddService } from "@/stores/bookingStore";
import type { Service } from "@/types/service";

interface ServicesCarouselProps {
  services: Service[];
}

const CARD_MIN_WIDTH_MOBILE = 280;
const CARD_MAX_WIDTH = 320;
const GAP_PX = 16;
const SPEED_PX_PER_SEC = 30;

export function ServicesCarousel({ services }: ServicesCarouselProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const addService = useBookingStore(selectAddService);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const duplicatedServices = useMemo(
    () => (services.length > 1 ? [...services, ...services] : services),
    [services],
  );

  const animationDuration = useMemo(() => {
    if (services.length <= 1) return 30;
    const cardWidth =
      trackRef.current?.children[0] instanceof HTMLElement
        ? (trackRef.current.children[0] as HTMLElement).offsetWidth
        : CARD_MAX_WIDTH;
    const step = cardWidth + GAP_PX;
    const setWidth = services.length * step;
    return Math.max(15, setWidth / SPEED_PX_PER_SEC);
  }, [services.length]);

  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.style.setProperty(
        "--marquee-duration",
        `${animationDuration}s`,
      );
    }
  }, [animationDuration]);

  useEffect(() => {
    const handleResize = () => {
      if (!trackRef.current) return;
      const cardWidth =
        trackRef.current.children[0] instanceof HTMLElement
          ? (trackRef.current.children[0] as HTMLElement).offsetWidth
          : CARD_MAX_WIDTH;
      const step = cardWidth + GAP_PX;
      const setWidth = services.length * step;
      const duration = Math.max(15, setWidth / SPEED_PX_PER_SEC);
      trackRef.current.style.setProperty(
        "--marquee-duration",
        `${duration}s`,
      );
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [services.length]);

  const handleTouchStart = () => setIsPaused(true);
  const handleTouchEnd = () => {
    window.setTimeout(() => setIsPaused(false), 4000);
  };
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  return (
    <div className="relative -mx-4 overflow-hidden">
      <div
        ref={trackRef}
        className={`marquee-track gap-4 px-4${isPaused ? " paused" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {duplicatedServices.map((service, idx) => (
          <div
            key={`${service.id}-${idx}`}
            className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            style={{
              minWidth: `${CARD_MIN_WIDTH_MOBILE}px`,
              maxWidth: `${CARD_MAX_WIDTH}px`,
              width: `${CARD_MAX_WIDTH}px`,
            }}
          >
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Scissors className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {service.name}
                  </h3>
                  {service.category?.name && (
                    <p className="text-xs text-muted-foreground">
                      {service.category.name}
                    </p>
                  )}
                </div>
              </div>
              {service.description && (
                <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                  {service.description}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {service.durationMinutes} min
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground">
                  ${new Intl.NumberFormat("es-UY").format(service.price)}
                </span>
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => {
                    addService(service);
                    navigate("/book");
                  }}
                >
                  {t("home.bookNow")}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10" />
    </div>
  );
}
