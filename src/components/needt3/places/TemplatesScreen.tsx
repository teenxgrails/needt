"use client";

import { useRouter } from "next/navigation";

import { newDate } from "@/lib/date-utils";
import { useCreateFromTemplate, useTemplates } from "@/lib/needt3/hooks/places";
import { useTimeZone } from "@/lib/needt3/hooks/settings";
import { notify } from "@/lib/notifications";

import strings from "../../../../docs/port/prototype/port/strings/en.json";
import { Art } from "../menu/Art";
import { PlEmpty, StScreen } from "../states/StScreen";
import { PlDocCard } from "./PlDocCard";
import { PlaceHeader } from "./PlaceHeader";
import { templatePageTitle, templatesMeta } from "./derive";

const tp = strings["places.jsx"].TemplatesScreen;

/**
 * Templates (places.jsx `TemplatesScreen`): a template is picked, not made,
 * on this screen (owner, 07.10.26), so there is no "+". A card makes a page
 * titled "<template> — <day>" and opens it; Undo sends the page to Trash.
 */
export function TemplatesScreen() {
  const router = useRouter();
  const timeZone = useTimeZone();
  const templates = useTemplates();
  const make = useCreateFromTemplate();
  const list = templates.data ?? [];

  const use = async (id: string, name: string) => {
    const page = await make.mutateAsync({
      templateId: id,
      title: templatePageTitle(name, newDate(), timeZone),
    });
    if (!page.result) return;
    notify.success(`Created from “${name || "Untitled"}”`, {
      action: { label: "Undo", onClick: () => void page.undo() },
    });
    router.push(`/pages/${page.result.id}`);
  };

  return (
    <div className="scroll-inner pl-page" data-v3-screen="templates">
      <PlaceHeader
        art="template"
        title={tp.templates}
        meta={templatesMeta(list.length)}
      />
      <StScreen query={templates} kind="grid" screen="templates">
        {!list.length ? (
          <PlEmpty
            art={<Art name="template" size={56} />}
            title={tp.no_templates_yet}
            line={tp.templates_you_save_from_a_page_show_up_h}
          />
        ) : (
          <div className="pl-templates-grid">
            {list.map((t, i) => (
              <div
                key={t.id}
                className="nx-swap"
                style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
              >
                <PlDocCard
                  title={t.name}
                  meta={t.description}
                  busy={make.isPending}
                  onOpen={() => void use(t.id, t.name)}
                />
              </div>
            ))}
          </div>
        )}
      </StScreen>
    </div>
  );
}
