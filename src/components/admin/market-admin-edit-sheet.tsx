"use client";

import { useEffect, useState, type ReactNode } from "react";

import dynamic from "next/dynamic";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  archiveAdminBusiness,
  createAdminBusiness,
  getAdminBusiness,
  publishAdminBusiness,
  updateAdminBusiness,
  type MarketBusinessStatus,
  type UpsertBusinessBody,
} from "@/lib/admin-market";

const MarketAdminMapPreview = dynamic(
  () => import("./market-admin-map-preview").then((m) => m.MarketAdminMapPreview),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full" /> },
);

const CATEGORIES = ["restaurant", "cafe", "hotel", "bakery", "bar", "other"] as const;

const STATUS_OPTIONS: ReadonlyArray<{ value: MarketBusinessStatus; label: string }> = [
  { value: "draft", label: "Borrador" },
  { value: "published", label: "Publicado" },
  { value: "archived", label: "Archivado" },
];

type Form = {
  name: string;
  category: string;
  status: MarketBusinessStatus;
  lat: string;
  lng: string;
  address: string;
  provincia: string;
  canton: string;
  distrito: string;
  phone: string;
  website: string;
};

const EMPTY: Form = {
  name: "",
  category: "restaurant",
  status: "draft",
  lat: "",
  lng: "",
  address: "",
  provincia: "",
  canton: "",
  distrito: "",
  phone: "",
  website: "",
};

export function MarketAdminEditSheet({
  businessId,
  onClose,
  onSaved,
}: Readonly<{ businessId: string | "new"; onClose: () => void; onSaved: () => void }>) {
  const isNew = businessId === "new";
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isNew) return;
    let active = true;
    void getAdminBusiness(businessId)
      .then(({ data }) => {
        if (!active) return;
        setForm({
          name: data.name ?? "",
          category: data.category ?? "other",
          status: data.status ?? "draft",
          lat: data.lat ?? "",
          lng: data.lng ?? "",
          address: data.address ?? "",
          provincia: data.provincia ?? "",
          canton: data.canton ?? "",
          distrito: data.distrito ?? "",
          phone: data.phone ?? "",
          website: data.website ?? "",
        });
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!active) return;
        toast.error((e as Error).message);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [businessId, isNew]);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function toBody(): UpsertBusinessBody {
    return {
      name: form.name.trim(),
      category: form.category,
      status: form.status,
      lat: form.lat.trim() ? Number(form.lat) : null,
      lng: form.lng.trim() ? Number(form.lng) : null,
      address: form.address.trim() || null,
      provincia: form.provincia.trim() || null,
      canton: form.canton.trim() || null,
      distrito: form.distrito.trim() || null,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
    };
  }

  async function save(thenPublish: boolean) {
    if (!form.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const lat = form.lat.trim();
    const lng = form.lng.trim();
    if ((lat && !Number.isFinite(Number(lat))) || (lng && !Number.isFinite(Number(lng)))) {
      toast.error("Las coordenadas deben ser numéricas");
      return;
    }

    setBusy(true);
    try {
      let id = businessId;
      if (isNew) {
        const { data } = await createAdminBusiness(toBody());
        id = data.id;
      } else {
        await updateAdminBusiness(businessId, toBody());
      }
      if (thenPublish && id !== "new") await publishAdminBusiness(id);
      toast.success(thenPublish ? "Guardado y publicado" : "Guardado");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (isNew) return;
    setBusy(true);
    try {
      await archiveAdminBusiness(businessId);
      toast.success("Negocio archivado");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const previewLat = Number(form.lat);
  const previewLng = Number(form.lng);
  const showPreview =
    form.lat.trim() !== "" &&
    form.lng.trim() !== "" &&
    Number.isFinite(previewLat) &&
    Number.isFinite(previewLng);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md" side="right">
        <SheetHeader>
          <SheetTitle>{isNew ? "Nuevo negocio" : "Editar negocio"}</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton className="h-9 w-full" key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-3 px-4 py-4">
            <Field label="Nombre">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Categoría">
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Estado">
                <Select
                  value={form.status}
                  onValueChange={(v) => set("status", v as MarketBusinessStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Latitud">
                <Input
                  inputMode="decimal"
                  value={form.lat}
                  onChange={(e) => set("lat", e.target.value)}
                />
              </Field>
              <Field label="Longitud">
                <Input
                  inputMode="decimal"
                  value={form.lng}
                  onChange={(e) => set("lng", e.target.value)}
                />
              </Field>
            </div>

            {showPreview ? (
              <MarketAdminMapPreview lat={previewLat} lng={previewLng} />
            ) : (
              <p className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
                Ingresá latitud y longitud para ver la ubicación en el mapa.
              </p>
            )}

            <Field label="Dirección">
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Provincia">
                <Input
                  value={form.provincia}
                  onChange={(e) => set("provincia", e.target.value)}
                />
              </Field>
              <Field label="Cantón">
                <Input value={form.canton} onChange={(e) => set("canton", e.target.value)} />
              </Field>
              <Field label="Distrito">
                <Input
                  value={form.distrito}
                  onChange={(e) => set("distrito", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Teléfono">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Sitio web">
              <Input value={form.website} onChange={(e) => set("website", e.target.value)} />
            </Field>

            <div className="space-y-2 border-t pt-4">
              <div className="flex gap-2">
                <Button className="flex-1" disabled={busy} onClick={() => void save(false)}>
                  Guardar
                </Button>
                <Button
                  className="flex-1"
                  disabled={busy}
                  variant="secondary"
                  onClick={() => void save(true)}
                >
                  Guardar y publicar
                </Button>
              </div>
              {!isNew && (
                <Button
                  className="w-full"
                  disabled={busy}
                  variant="ghost"
                  onClick={() => void archive()}
                >
                  Archivar
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
