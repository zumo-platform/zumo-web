"use client";

import { useMemo } from "react";

import type { CountryCode } from "libphonenumber-js";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { flagEmoji, getSortedCallingCountries } from "@/lib/phone-countries";
import { sanitizeNationalPhoneDigits } from "@/lib/phone-e164";
import { cn } from "@/lib/utils";

type PhoneNumberFieldProps = Readonly<{
  id: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  locale: string;
  country: CountryCode;
  national: string;
  placeholder: string;
  onCountryChange: (iso: CountryCode) => void;
  onNationalChange: (value: string) => void;
  invalid?: boolean;
}>;

export function PhoneNumberField({
  id,
  label,
  hint,
  disabled,
  locale,
  country,
  national,
  placeholder,
  onCountryChange,
  onNationalChange,
  invalid,
}: PhoneNumberFieldProps) {
  const countries = useMemo(() => getSortedCallingCountries(locale), [locale]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <InputGroup
        aria-invalid={invalid}
        className={cn(invalid && "border-destructive ring-destructive/20")}
      >
        <InputGroupAddon className="gap-0 pr-0">
          <Select
            disabled={disabled}
            value={country}
            onValueChange={(v) => onCountryChange(v as CountryCode)}
          >
            <SelectTrigger
              aria-label={label}
              className="h-9 max-w-[10rem] min-w-[7rem] shrink-0 gap-1 rounded-none border-0 bg-transparent px-2 shadow-none ring-0 focus-visible:ring-0 data-[size=default]:h-9 [&_[data-slot=select-value]]:truncate"
              size="sm"
            >
              <SelectValue placeholder="+00" />
            </SelectTrigger>
            <SelectContent
              align="start"
              avoidCollisions={false}
              className={cn(
                "phone-country-select-content max-h-[min(280px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] [&_[data-slot=select-scroll-down-button]]:hidden [&_[data-slot=select-scroll-up-button]]:hidden",
              )}
              position="popper"
              side="bottom"
              sideOffset={4}
            >
              {countries.map((c) => (
                <SelectItem key={c.iso} textValue={`${c.name} ${c.dial}`} value={c.iso}>
                  <span className="flex w-full min-w-0 items-center gap-2">
                    <span aria-hidden className="shrink-0 text-base leading-none">
                      {flagEmoji(c.iso)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left">{c.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{c.dial}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Separator className="mx-1 h-5 shrink-0" orientation="vertical" />
        </InputGroupAddon>
        <InputGroupInput
          aria-invalid={invalid}
          autoComplete="tel-national"
          disabled={disabled}
          id={id}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder={placeholder}
          type="text"
          value={national}
          onChange={(e) => onNationalChange(sanitizeNationalPhoneDigits(e.target.value))}
        />
      </InputGroup>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}
