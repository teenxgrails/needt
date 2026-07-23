"use client";

import { useMemo, useState } from "react";

import {
  CalendarDays,
  Columns3,
  GalleryHorizontalEnd,
  LayoutList,
  List,
  Plus,
  Table2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { PageDetail } from "@/components/pages/page-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";

type ViewType =
  "TABLE" | "BOARD" | "LIST" | "TIMELINE" | "CALENDAR" | "GALLERY";
type PropertyType = "TEXT" | "NUMBER" | "SELECT" | "CHECKBOX" | "DATE" | "URL";
type DatabaseProperty = {
  id: string;
  name: string;
  type: string;
  position: number;
};
type DatabaseValue = { propertyId: string; value: unknown };
type DatabaseRecord = {
  id: string;
  page: { id: string; title: string; updatedAt: string };
  values: DatabaseValue[];
  position: number;
};
type DatabaseView = { id: string; name: string; type: ViewType };
type DatabaseDetail = {
  id: string;
  properties: DatabaseProperty[];
  records: DatabaseRecord[];
  views: DatabaseView[];
};

const VIEW_OPTIONS: Array<{
  type: ViewType;
  label: string;
  icon: typeof Table2;
}> = [
  { type: "TABLE", label: "Table", icon: Table2 },
  { type: "BOARD", label: "Board", icon: Columns3 },
  { type: "LIST", label: "List", icon: List },
  { type: "CALENDAR", label: "Calendar", icon: CalendarDays },
  { type: "TIMELINE", label: "Timeline", icon: LayoutList },
  { type: "GALLERY", label: "Gallery", icon: GalleryHorizontalEnd },
];

function valueMap(record: DatabaseRecord) {
  return Object.fromEntries(
    record.values.map((item) => [item.propertyId, item.value])
  );
}

function valueLabel(value: unknown) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (value === null || value === undefined || value === "") return "No value";
  return String(value);
}

export function DatabaseWorkspace({
  page,
  onPatch,
}: {
  page: PageDetail;
  onPatch: (values: Record<string, unknown>) => Promise<void>;
}) {
  const database = page.database as unknown as DatabaseDetail;
  const [title, setTitle] = useState(page.title);
  const [records, setRecords] = useState(database.records || []);
  const [properties, setProperties] = useState(database.properties || []);
  const [views, setViews] = useState(database.views || []);
  const [view, setView] = useState<ViewType>(
    database.views?.[0]?.type || "TABLE"
  );
  const [query, setQuery] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [groupPropertyId, setGroupPropertyId] = useState<string>(
    properties.find((property) => property.type === "SELECT")?.id || "none"
  );
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [propertyName, setPropertyName] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("TEXT");

  const visibleRecords = useMemo(
    () =>
      records
        .filter((record) =>
          record.page.title.toLowerCase().includes(query.trim().toLowerCase())
        )
        .sort((left, right) => {
          const result = left.page.title.localeCompare(
            right.page.title,
            undefined,
            {
              numeric: true,
            }
          );
          return sortDirection === "desc" ? -result : result;
        }),
    [query, records, sortDirection]
  );

  const selectView = async (next: ViewType) => {
    setView(next);
    if (views.some((item) => item.type === next)) return;
    const response = await fetch(`/api/databases/${database.id}/views`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: VIEW_OPTIONS.find((item) => item.type === next)?.label || next,
        type: next,
      }),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { view: DatabaseView };
    setViews((current) => [...current, data.view]);
  };

  const addRecord = async () => {
    const response = await fetch(`/api/databases/${database.id}/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled" }),
    });
    if (!response.ok) {
      toast.error("Could not add record");
      return;
    }
    const data = (await response.json()) as { record: DatabaseRecord };
    setRecords((current) => [...current, data.record]);
  };

  const patchRecord = async (
    record: DatabaseRecord,
    input: { title?: string; values?: Record<string, unknown> }
  ) => {
    const response = await fetch(`/api/database-records/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      toast.error("Could not update record");
      return;
    }
    const data = (await response.json()) as { record: DatabaseRecord };
    setRecords((current) =>
      current.map((item) => (item.id === record.id ? data.record : item))
    );
  };

  const removeRecord = async (record: DatabaseRecord) => {
    const response = await fetch(`/api/database-records/${record.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      toast.error("Could not delete record");
      return;
    }
    setRecords((current) => current.filter((item) => item.id !== record.id));
  };

  const addProperty = async () => {
    if (!propertyName.trim()) return;
    const response = await fetch(`/api/databases/${database.id}/properties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: propertyName, type: propertyType }),
    });
    if (!response.ok) {
      toast.error("Could not add property");
      return;
    }
    const data = (await response.json()) as {
      property: DatabaseProperty;
    };
    setProperties((current) => [...current, data.property]);
    setPropertyName("");
    setPropertyOpen(false);
  };

  const updateValue = (
    record: DatabaseRecord,
    property: DatabaseProperty,
    value: unknown
  ) =>
    patchRecord(record, {
      values: { [property.id]: value },
    });

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--app-bg)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-subtle)] px-6 pb-0 pt-7 lg:px-10">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => {
            if (title !== page.title) void onPatch({ title });
          }}
          className="mb-5 w-full border-0 bg-transparent p-0 text-3xl font-semibold outline-none"
        />
        <div className="flex items-center gap-1 overflow-x-auto">
          {VIEW_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.type}
                type="button"
                onClick={() => void selectView(option.type)}
                className={cn(
                  "flex h-9 items-center gap-2 border-b-2 px-3 text-[12px] text-[var(--text-secondary)]",
                  view === option.type
                    ? "border-[var(--color-accent)] text-[var(--text-primary)]"
                    : "border-transparent hover:text-[var(--text-primary)]"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {option.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] px-6 py-2.5 lg:px-10">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter records…"
          aria-label="Filter database records"
          className="h-8 w-52"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
          }
        >
          Name {sortDirection === "asc" ? "↑" : "↓"}
        </Button>
        {(view === "BOARD" || view === "GALLERY") && (
          <Select value={groupPropertyId} onValueChange={setGroupPropertyId}>
            <SelectTrigger className="h-8 w-44">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No grouping</SelectItem>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  Group by {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPropertyOpen(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Property
          </Button>
          <Button size="sm" onClick={() => void addRecord()}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New
          </Button>
        </div>
      </div>

      <div
        data-testid="database-view"
        className="min-h-0 flex-1 overflow-auto p-6 lg:p-10"
      >
        {view === "TABLE" && (
          <TableView
            records={visibleRecords}
            properties={properties}
            onPatch={patchRecord}
            onValue={updateValue}
            onRemove={removeRecord}
          />
        )}
        {view === "LIST" && (
          <ListView
            records={visibleRecords}
            onPatch={patchRecord}
            onRemove={removeRecord}
          />
        )}
        {view === "BOARD" && (
          <BoardView
            records={visibleRecords}
            groupPropertyId={groupPropertyId}
            onPatch={patchRecord}
          />
        )}
        {view === "CALENDAR" && (
          <CalendarView records={visibleRecords} properties={properties} />
        )}
        {view === "TIMELINE" && (
          <TimelineView records={visibleRecords} properties={properties} />
        )}
        {view === "GALLERY" && (
          <GalleryView
            records={visibleRecords}
            groupPropertyId={groupPropertyId}
          />
        )}
      </div>

      <Dialog open={propertyOpen} onOpenChange={setPropertyOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add property</DialogTitle>
            <DialogDescription>
              The property is shared by every database view.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="database-property-name">Name</Label>
              <Input
                id="database-property-name"
                value={propertyName}
                onChange={(event) => setPropertyName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={propertyType}
                onValueChange={(value) =>
                  setPropertyType(value as PropertyType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["TEXT", "NUMBER", "SELECT", "CHECKBOX", "DATE", "URL"].map(
                    (type) => (
                      <SelectItem key={type} value={type}>
                        {type[0]}
                        {type.slice(1).toLowerCase()}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPropertyOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void addProperty()}
              disabled={!propertyName.trim()}
            >
              Add property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecordTitle({
  record,
  onPatch,
}: {
  record: DatabaseRecord;
  onPatch: (record: DatabaseRecord, input: { title?: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState(record.page.title);
  return (
    <Input
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      onBlur={() => {
        if (title !== record.page.title) void onPatch(record, { title });
      }}
      aria-label="Record name"
      className="h-8 border-transparent bg-transparent px-1.5 hover:border-[var(--border-control)]"
    />
  );
}

function PropertyInput({
  record,
  property,
  onValue,
}: {
  record: DatabaseRecord;
  property: DatabaseProperty;
  onValue: (
    record: DatabaseRecord,
    property: DatabaseProperty,
    value: unknown
  ) => Promise<void>;
}) {
  const initial = valueMap(record)[property.id];
  const [value, setValue] = useState(
    initial === null || initial === undefined ? "" : String(initial)
  );
  if (property.type === "CHECKBOX") {
    return (
      <input
        type="checkbox"
        checked={initial === true}
        onChange={(event) =>
          void onValue(record, property, event.target.checked)
        }
        aria-label={property.name}
      />
    );
  }
  return (
    <Input
      type={
        property.type === "NUMBER"
          ? "number"
          : property.type === "DATE"
            ? "date"
            : property.type === "URL"
              ? "url"
              : "text"
      }
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => {
        const next =
          property.type === "NUMBER" && value !== "" ? Number(value) : value;
        if (JSON.stringify(next) !== JSON.stringify(initial))
          void onValue(record, property, next);
      }}
      aria-label={property.name}
      className="h-8 border-transparent bg-transparent px-1.5 hover:border-[var(--border-control)]"
    />
  );
}

function TableView({
  records,
  properties,
  onPatch,
  onValue,
  onRemove,
}: {
  records: DatabaseRecord[];
  properties: DatabaseProperty[];
  onPatch: (record: DatabaseRecord, input: { title?: string }) => Promise<void>;
  onValue: (
    record: DatabaseRecord,
    property: DatabaseProperty,
    value: unknown
  ) => Promise<void>;
  onRemove: (record: DatabaseRecord) => Promise<void>;
}) {
  return (
    <div className="min-w-[720px] overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)]">
      <div
        className="grid bg-[var(--surface-raised)] text-[11px] text-[var(--text-muted)]"
        style={{
          gridTemplateColumns: `minmax(220px,2fr) repeat(${properties.length}, minmax(140px,1fr)) 40px`,
        }}
      >
        <div className="p-2.5">Name</div>
        {properties.map((property) => (
          <div
            key={property.id}
            className="border-l border-[var(--border-subtle)] p-2.5"
          >
            {property.name}
          </div>
        ))}
        <div />
      </div>
      {records.map((record) => (
        <div
          key={record.id}
          className="grid border-t border-[var(--border-subtle)]"
          style={{
            gridTemplateColumns: `minmax(220px,2fr) repeat(${properties.length}, minmax(140px,1fr)) 40px`,
          }}
        >
          <div className="p-1">
            <RecordTitle record={record} onPatch={onPatch} />
          </div>
          {properties.map((property) => (
            <div
              key={property.id}
              className="border-l border-[var(--border-subtle)] p-1"
            >
              <PropertyInput
                record={record}
                property={property}
                onValue={onValue}
              />
            </div>
          ))}
          <button
            type="button"
            aria-label={`Delete ${record.page.title}`}
            onClick={() => void onRemove(record)}
            className="grid place-items-center text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--color-danger)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      {records.length === 0 && <EmptyDatabase />}
    </div>
  );
}

function ListView({
  records,
  onPatch,
  onRemove,
}: {
  records: DatabaseRecord[];
  onPatch: (record: DatabaseRecord, input: { title?: string }) => Promise<void>;
  onRemove: (record: DatabaseRecord) => Promise<void>;
}) {
  return (
    <div className="mx-auto max-w-3xl divide-y divide-[var(--border-subtle)]">
      {records.map((record) => (
        <div key={record.id} className="flex min-h-11 items-center gap-3">
          <FileTextIcon />
          <div className="flex-1">
            <RecordTitle record={record} onPatch={onPatch} />
          </div>
          <button
            type="button"
            aria-label={`Delete ${record.page.title}`}
            onClick={() => void onRemove(record)}
            className="rounded p-2 text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      {records.length === 0 && <EmptyDatabase />}
    </div>
  );
}

function BoardView({
  records,
  groupPropertyId,
  onPatch,
}: {
  records: DatabaseRecord[];
  groupPropertyId: string;
  onPatch: (record: DatabaseRecord, input: { title?: string }) => Promise<void>;
}) {
  const groups = new Map<string, DatabaseRecord[]>();
  records.forEach((record) => {
    const key =
      groupPropertyId === "none"
        ? "Records"
        : valueLabel(valueMap(record)[groupPropertyId]);
    groups.set(key, [...(groups.get(key) || []), record]);
  });
  if (groups.size === 0) groups.set("Records", []);
  return (
    <div className="flex min-w-max gap-3">
      {[...groups.entries()].map(([group, items]) => (
        <section
          key={group}
          className="w-72 rounded-[var(--panel-radius)] bg-[var(--surface-raised)] p-2"
        >
          <div className="mb-2 flex items-center justify-between px-1 text-[12px] font-medium">
            <span>{group}</span>
            <span className="text-[var(--text-muted)]">{items.length}</span>
          </div>
          <div className="space-y-2">
            {items.map((record) => (
              <div
                key={record.id}
                className="rounded-[var(--control-radius)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-1.5"
              >
                <RecordTitle record={record} onPatch={onPatch} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CalendarView({
  records,
  properties,
}: {
  records: DatabaseRecord[];
  properties: DatabaseProperty[];
}) {
  const dateProperty = properties.find((property) => property.type === "DATE");
  const groups = new Map<string, DatabaseRecord[]>();
  records.forEach((record) => {
    const date = dateProperty
      ? valueLabel(valueMap(record)[dateProperty.id])
      : "No date";
    groups.set(date, [...(groups.get(date) || []), record]);
  });
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[...groups.entries()].map(([date, items]) => (
        <section
          key={date}
          className="min-h-36 rounded-[var(--panel-radius)] border border-[var(--border-subtle)] p-3"
        >
          <div className="mb-3 text-[11px] font-medium text-[var(--text-secondary)]">
            {date}
          </div>
          <div className="space-y-1.5">
            {items.map((record) => (
              <div
                key={record.id}
                className="rounded bg-[var(--surface-raised)] px-2.5 py-2 text-[12px]"
              >
                {record.page.title}
              </div>
            ))}
          </div>
        </section>
      ))}
      {records.length === 0 && <EmptyDatabase />}
    </div>
  );
}

function TimelineView({
  records,
  properties,
}: {
  records: DatabaseRecord[];
  properties: DatabaseProperty[];
}) {
  const dateProperty = properties.find((property) => property.type === "DATE");
  return (
    <div className="space-y-2">
      {records.map((record, index) => (
        <div
          key={record.id}
          className="grid grid-cols-[180px_1fr] items-center gap-3"
        >
          <div className="truncate text-[12px]">{record.page.title}</div>
          <div className="relative h-8 rounded bg-[var(--surface-raised)]">
            <div
              className="absolute top-1 h-6 min-w-24 rounded bg-[color-mix(in_srgb,var(--color-accent)_20%,var(--surface-control))] px-2 text-[10px] leading-6"
              style={{ left: `${(index * 11) % 55}%`, width: "34%" }}
            >
              {dateProperty
                ? valueLabel(valueMap(record)[dateProperty.id])
                : "No date"}
            </div>
          </div>
        </div>
      ))}
      {records.length === 0 && <EmptyDatabase />}
    </div>
  );
}

function GalleryView({
  records,
  groupPropertyId,
}: {
  records: DatabaseRecord[];
  groupPropertyId: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {records.map((record) => (
        <article
          key={record.id}
          className="overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)]"
        >
          <div className="h-24 bg-[linear-gradient(135deg,var(--surface-raised),var(--surface-control))]" />
          <div className="p-3">
            <div className="text-[13px] font-medium">{record.page.title}</div>
            {groupPropertyId !== "none" && (
              <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                {valueLabel(valueMap(record)[groupPropertyId])}
              </div>
            )}
          </div>
        </article>
      ))}
      {records.length === 0 && <EmptyDatabase />}
    </div>
  );
}

function EmptyDatabase() {
  return (
    <div className="col-span-full py-12 text-center text-[12px] text-[var(--text-muted)]">
      No matching records.
    </div>
  );
}

function FileTextIcon() {
  return (
    <div className="grid h-7 w-7 place-items-center rounded bg-[var(--surface-raised)] text-[11px] text-[var(--text-muted)]">
      Aa
    </div>
  );
}
