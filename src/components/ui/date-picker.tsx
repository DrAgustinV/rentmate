import { useState, useCallback, forwardRef } from "react";
import { parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate, getUserDateFormat } from "@/lib/dateUtils";

interface DatePickerProps {
  value?: Date | null;
  onChange?: (date: Date | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  disabledDays?: (date: Date) => boolean;
  className?: string;
  hasError?: boolean;
}

export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(
  function DatePicker({
    value,
    onChange,
    disabled = false,
    placeholder,
    disabledDays,
    className,
    hasError,
    ...props
  }, ref) {
    const [isTyping, setIsTyping] = useState(false);
    const [inputText, setInputText] = useState("");
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const internalValue = value ?? undefined;
    const dateFormat = getUserDateFormat();

    const handleCalendarSelect = useCallback((date: Date | undefined) => {
      onChange?.(date || undefined);
      setIsPopoverOpen(false);
      setIsTyping(false);
    }, [onChange]);

    const handleFocus = useCallback(() => {
      if (internalValue) {
        setInputText(formatDate(internalValue));
      } else {
        setInputText("");
      }
      setIsTyping(true);
    }, [internalValue]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setInputText(text);

      if (!text.trim()) {
        onChange?.(undefined);
        return;
      }

      const parsed = parse(text, dateFormat, new Date());
      if (isValid(parsed)) {
        onChange?.(parsed);
      }
    }, [onChange, dateFormat]);

    const handleBlur = useCallback(() => {
      setIsTyping(false);
      if (inputText.trim()) {
        const parsed = parse(inputText, dateFormat, new Date());
        if (!isValid(parsed) && !internalValue) {
          setInputText("");
        }
      } else {
        setInputText("");
      }
    }, [inputText, dateFormat, internalValue]);

    const displayValue = isTyping
      ? inputText
      : internalValue
        ? formatDate(internalValue)
        : "";

    return (
      <div ref={ref} className={cn("relative", className)} {...props}>
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <Input
            value={displayValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder || "Select a date"}
            disabled={disabled}
            className={cn("pr-10", hasError && "border-destructive")}
          />
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
              disabled={disabled}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="min-h-[304px]">
              <Calendar
                mode="single"
                selected={internalValue}
                onSelect={handleCalendarSelect}
                disabled={disabledDays}
                initialFocus
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);
